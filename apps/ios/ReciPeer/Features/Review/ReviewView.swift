import SwiftUI
import PhotosUI

/// Ingredient row model for the review editor.
struct EditableIngredient: Identifiable, Equatable {
    let id: String
    var name: String
    var qty: String
}

/// Step row model for the review editor.
struct EditableStep: Identifiable, Equatable {
    let id: String
    var text: String
    var videoStartMs: Int?
    var videoEndMs: Int?
}

/// Review & publish: edit the extracted recipe, pick a cover, choose visibility.
/// Mirrors review/[recipeId].tsx (steps editor simplified: add / edit / delete /
/// move; drag-reorder lands with Phase 7 polish).
struct ReviewView: View {
    let recipeId: String
    @Environment(\.dismiss) private var dismiss

    @State private var detail: RecipeDetailDTO?
    @State private var status: LoadStatus = .idle
    @State private var errorMessage: String?

    @State private var title = ""
    @State private var description = ""
    @State private var totalTime = ""
    @State private var servings = 4
    @State private var visibility: RecipeVisibilityDTO = .public
    @State private var ingredients: [EditableIngredient] = []
    @State private var steps: [EditableStep] = []

    @State private var coverKey: String?
    @State private var coverPreviewImage: UIImage?
    @State private var coverUploading = false
    @State private var photoItem: PhotosPickerItem?

    @State private var busy = false

    var body: some View {
        VStack(spacing: 0) {
            header

            switch status {
            case .idle, .loading:
                VStack {
                    Spacer()
                    ProgressView().tint(AppColors.primary)
                    Spacer()
                }
            case .failed(let message):
                VStack(spacing: Spacing.md) {
                    Spacer()
                    Text("Couldn't load this recipe").textStyle(.heading)
                    Text(message).textStyle(.body).foregroundStyle(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                    AppButton(label: "Try again", variant: .secondary) {
                        Task { await load() }
                    }
                    .frame(maxWidth: 200)
                    Spacer()
                }
            case .loaded:
                editor
            }
        }
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
        .task { await load() }
        .onChange(of: photoItem) { item in
            guard let item else { return }
            Task { await pickCover(item) }
        }
    }

    private func load() async {
        status = detail == nil ? .loading : status
        do {
            let fresh = try await RecipesService.fetchRecipeDetail(recipeId)
            detail = fresh
            apply(fresh)
            status = .loaded
        } catch {
            if detail == nil {
                status = .failed((error as? ApiError)?.message ?? "Something went wrong.")
            }
        }
    }

    private func apply(_ data: RecipeDetailDTO) {
        title = data.title
        description = data.description ?? ""
        totalTime = data.totalTimeMinutes.map { String(Int($0)) } ?? ""
        servings = data.baseServings == 0 ? 4 : data.baseServings
        visibility = data.isLinkImport ? .private : data.visibility
        ingredients = data.ingredients.map { ingredient in
            EditableIngredient(id: ingredient.id, name: ingredient.name, qty: formatQty(ingredient))
        }
        steps = data.steps.map { step in
            EditableStep(id: step.id, text: step.instruction, videoStartMs: step.videoStartMs, videoEndMs: step.videoEndMs)
        }
    }

    private func formatQty(_ ingredient: RecipeDetailIngredientDTO) -> String {
        if let note = ingredient.quantityNote { return abbreviateUnits(note) }
        if let amount = ingredient.amount {
            return abbreviateUnits("\(amount)\(ingredient.unit.map { " \($0)" } ?? "")")
        }
        return ""
    }

    // MARK: - Editor

    private var header: some View {
        HStack(spacing: Spacing.md) {
            BackButton()
            VStack(alignment: .leading, spacing: 0) {
                Text("Review & publish").textStyle(.heading)
                Text("Step 2 of 2 · check it over")
                    .textStyle(.micro)
                    .foregroundStyle(AppColors.textSecondary)
            }
            Spacer()
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.top, Spacing.xs)
        .padding(.bottom, Spacing.md)
    }

    private var editor: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    coverSection
                    banner

                    sectionHead("Title")
                    card {
                        AppTextField(text: $title, placeholder: "Recipe title")
                            .font(.custom(AppFont.displaySemibold, size: 22))
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                    }

                    sectionHead("Description")
                    card {
                        AppTextField(text: $description, placeholder: "A short description of the dish…")
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                    }

                    sectionHead("At a glance")
                    metaRow

                    sectionHead("Ingredients", count: ingredients.count, action: "Add") {
                        withAnimation {
                            ingredients.append(EditableIngredient(id: UUID().uuidString, name: "", qty: ""))
                        }
                    }
                    Text("Tap the trash icon to delete an ingredient")
                        .textStyle(.micro)
                        .foregroundStyle(AppColors.textSecondary)
                        .padding(.horizontal, Spacing.xs)
                        .padding(.bottom, Spacing.sm)
                    card {
                        ForEach(Array(ingredients.enumerated()), id: \.element.id) { index, _ in
                            ingredientRow(index)
                                .overlay(alignment: .bottom) {
                                    if index < ingredients.count - 1 {
                                        Hairline()
                                    }
                                }
                        }
                    }

                    sectionHead("Steps", count: steps.count, action: "Add") {
                        withAnimation {
                            steps.append(EditableStep(id: UUID().uuidString, text: "", videoStartMs: nil, videoEndMs: nil))
                        }
                    }
                    Text("Use the arrows to reorder · trash to delete")
                        .textStyle(.micro)
                        .foregroundStyle(AppColors.textSecondary)
                        .padding(.horizontal, Spacing.xs)
                        .padding(.bottom, Spacing.sm)
                    card {
                        ForEach(Array(steps.enumerated()), id: \.element.id) { index, _ in
                            stepRow(index)
                                .overlay(alignment: .bottom) {
                                    if index < steps.count - 1 {
                                        Hairline()
                                    }
                                }
                        }
                    }

                    if detail?.isLinkImport != true {
                        sectionHead("Who can see it")
                        card {
                            visibilityRow(.public, icon: "globe", title: "Public", subtitle: "Anyone on Sourcery can find and cook it.")
                            Hairline()
                            visibilityRow(.private, icon: "lock", title: "Private", subtitle: "Only visible to you in My Recipes.")
                        }
                    }
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.bottom, Spacing.xxxl)
            }

            footer
        }
    }

    // MARK: Sections

    private var coverSection: some View {
        PhotosPicker(selection: $photoItem, matching: .images) {
            ZStack(alignment: .bottomTrailing) {
                Group {
                    if let image = coverPreviewImage {
                        Image(uiImage: image).resizable().scaledToFill()
                    } else if let url = detail?.coverImageUrl.flatMap(URL.init) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image): image.resizable().scaledToFill()
                            default: placeholder
                            }
                        }
                    } else {
                        placeholder
                    }
                }
                .aspectRatio(16 / 10, contentMode: .fill)
                .frame(maxWidth: .infinity)
                .clipped()

                if coverUploading {
                    ZStack {
                        AppColors.textPrimary.opacity(0.4)
                        ProgressView().tint(AppColors.onPrimary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                HStack(spacing: Spacing.xs) {
                    Image(systemName: "photo").font(.system(size: 12))
                    Text(coverPreviewImage != nil || detail?.coverImageUrl != nil ? "Change cover" : "Pick a cover")
                        .textStyle(.caption)
                }
                .foregroundStyle(AppColors.textPrimary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.xs)
                .background(AppColors.surface)
                .clipShape(Capsule())
                .overlay { Capsule().stroke(AppColors.border, lineWidth: 1) }
                .padding(Spacing.sm)
            }
            .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        }
        .padding(.bottom, Spacing.md)
    }

    private var placeholder: some View {
        ZStack {
            AppColors.surfaceMuted
            VStack(spacing: Spacing.xs) {
                Image(systemName: "photo").font(.system(size: 22)).foregroundStyle(AppColors.textSecondary)
                Text("Add a cover photo").textStyle(.caption).foregroundStyle(AppColors.textSecondary)
            }
        }
    }

    private var banner: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "sparkles")
                .font(.system(size: 15))
                .foregroundStyle(AppColors.accent)
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(detail?.isLinkImport == true ? "Imported — tidy it up" : "Almost there — give it a check")
                    .textStyle(.bodyStrong)
                    .foregroundStyle(Palette.apricotInk)
                Text(detail?.isLinkImport == true
                    ? "Saved privately to your account. Tap any text to fix it before you save."
                    : "We wrote this up from your video. Tap any text to fix it before you publish.")
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.md)
        .background(Palette.apricot)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .padding(.bottom, Spacing.lg)
    }

    private var metaRow: some View {
        HStack(spacing: Spacing.sm) {
            card {
                VStack(spacing: Spacing.xxs) {
                    Image(systemName: "clock").font(.system(size: 15)).foregroundStyle(AppColors.textSecondary)
                    HStack(spacing: Spacing.sm) {
                        AppTextField(text: $totalTime, placeholder: "—")
                            .font(.custom(AppFont.bodyMedium, size: 16))
                            .frame(width: 44)
                            .multilineTextAlignment(.center)
                        Text("min").textStyle(.bodyStrong).foregroundStyle(AppColors.textSecondary)
                    }
                    Text("Total time").textStyle(.micro).foregroundStyle(AppColors.textSecondary)
                }
                .padding(.vertical, Spacing.md)
            }
            card {
                VStack(spacing: Spacing.xxs) {
                    Image(systemName: "person.2").font(.system(size: 15)).foregroundStyle(AppColors.textSecondary)
                    HStack(spacing: Spacing.sm) {
                        stepperButton("minus") { servings = max(1, servings - 1) }
                        Text("\(servings)").textStyle(.bodyStrong).frame(minWidth: 18)
                        stepperButton("plus") { servings += 1 }
                    }
                    Text("Serves").textStyle(.micro).foregroundStyle(AppColors.textSecondary)
                }
                .padding(.vertical, Spacing.md)
            }
        }
    }

    private func stepperButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(AppColors.textPrimary)
                .frame(width: 26, height: 26)
                .background(AppColors.surface)
                .clipShape(Circle())
                .overlay { Circle().stroke(AppColors.borderStrong, lineWidth: 1) }
        }
        .buttonStyle(.pressScale)
    }

    private func ingredientRow(_ index: Int) -> some View {
        HStack(spacing: Spacing.sm) {
            AppTextField(text: Binding(
                get: { ingredients[index].name },
                set: { ingredients[index].name = $0 },
            ), placeholder: "Ingredient")
            .padding(.horizontal, Spacing.sm)

            AppTextField(text: Binding(
                get: { ingredients[index].qty },
                set: { ingredients[index].qty = $0 },
            ), placeholder: "add")
            .font(.custom(AppFont.bodyMedium, size: 14))
            .multilineTextAlignment(.center)
            .padding(.vertical, 4)
            .background(AppColors.surfaceMuted)
            .clipShape(RoundedRectangle(cornerRadius: Radius.sm))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.sm).stroke(AppColors.border, lineWidth: 1)
            }
            .frame(width: 104)

            Button {
                withAnimation { _ = ingredients.remove(at: index) }
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 14))
                    .foregroundStyle(AppColors.textSecondary)
            }
            .padding(.trailing, Spacing.sm)
        }
        .frame(minHeight: Sizing.iconButton)
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
    }

    private func stepRow(_ index: Int) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Text("\(index + 1)")
                .textStyle(.label)
                .foregroundStyle(AppColors.textSecondary)
                .frame(width: 20)
                .padding(.top, 14)

            AppTextField(text: Binding(
                get: { steps[index].text },
                set: { steps[index].text = $0 },
            ), placeholder: "Step instruction")
            .autocapitalization(.sentences)

            VStack(spacing: Spacing.xxs) {
                Button {
                    guard index > 0 else { return }
                    steps.swapAt(index, index - 1)
                } label: {
                    Image(systemName: "arrow.up").font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(index > 0 ? AppColors.textPrimary : AppColors.textPlaceholder)
                }
                Button {
                    guard index < steps.count - 1 else { return }
                    steps.swapAt(index, index + 1)
                } label: {
                    Image(systemName: "arrow.down").font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(index < steps.count - 1 ? AppColors.textPrimary : AppColors.textPlaceholder)
                }
                Button {
                    withAnimation { _ = steps.remove(at: index) }
                } label: {
                    Image(systemName: "trash").font(.system(size: 12))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
            .padding(.trailing, Spacing.sm)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.xs)
    }

    private func visibilityRow(_ key: RecipeVisibilityDTO, icon: String, title: String, subtitle: String) -> some View {
        let on = visibility == key
        return Button {
            visibility = key
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundStyle(on ? AppColors.primary : AppColors.textSecondary)
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(title).textStyle(.bodyStrong)
                    Text(subtitle)
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                ZStack {
                    Circle()
                        .stroke(on ? AppColors.primary : AppColors.borderStrong, lineWidth: 1.5)
                        .frame(width: 20, height: 20)
                    if on {
                        Circle().fill(AppColors.primary).frame(width: 20, height: 20)
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(AppColors.onPrimary)
                    }
                }
            }
            .padding(Spacing.md)
        }
        .buttonStyle(.plain)
    }

    // MARK: Footer + actions

    private var footer: some View {
        Group {
            if detail?.isLinkImport == true {
                AppButton(label: "Save to my recipes", loading: busy, systemImage: "lock") {
                    Task { await saveAndPublish(.private) }
                }
            } else {
                HStack(spacing: Spacing.sm) {
                    AppButton(label: "Save", variant: .secondary, loading: busy, systemImage: "bookmark") {
                        Task { await saveAndPublish(.private) }
                    }
                    AppButton(
                        label: visibility == .public ? "Publish recipe" : "Save recipe",
                        loading: busy,
                    ) {
                        Task { await saveAndPublish(visibility) }
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.lg)
        .background(AppColors.background)
        .overlay(alignment: .top) { Hairline() }
    }

    private func saveAndPublish(_ vis: RecipeVisibilityDTO) async {
        guard var data = detail else { return }
        busy = true
        defer { busy = false }

        let minutes = Int(totalTime)
        var input = UpdateRecipeInput(
            title: title.trimmingCharacters(in: .whitespaces).isEmpty
                ? "Untitled recipe" : title.trimmingCharacters(in: .whitespaces),
            description: description.trimmingCharacters(in: .whitespaces).isEmpty
                ? nil : description.trimmingCharacters(in: .whitespaces),
            baseServings: servings,
            totalTimeMinutes: minutes.map(Double.init),
            coverImageUrl: coverKey,
            ingredients: ingredients.map { ingredient in
                UpdateRecipeInput.Ingredient(
                    name: ingredient.name.trimmingCharacters(in: .whitespaces),
                    nameOriginal: nil,
                    amount: nil,
                    unit: nil,
                    quantityNote: ingredient.qty.trimmingCharacters(in: .whitespaces).isEmpty
                        ? nil : ingredient.qty.trimmingCharacters(in: .whitespaces),
                    substitutionNote: nil,
                )
            },
            steps: steps.map { step in
                UpdateRecipeInput.Step(
                    instruction: step.text.trimmingCharacters(in: .whitespaces),
                    videoStartMs: step.videoStartMs,
                    videoEndMs: step.videoEndMs,
                )
            },
        )

        do {
            try await RecipesService.updateRecipe(data.id, input)
            try await RecipesService.publishRecipe(data.id, visibility: vis)
            dismiss()
        } catch {
            errorMessage = (error as? ApiError)?.message
        }
        _ = data
    }

    // MARK: Cover upload

    private func pickCover(_ item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self) else { return }
        coverPreviewImage = UIImage(data: data)
        coverUploading = true
        defer { coverUploading = false }
        do {
            coverKey = try await UploadService.uploadImage(data: data, ext: "jpg")
        } catch {
            coverPreviewImage = nil
        }
    }
}

/// Shared card container.
private func card(@ViewBuilder content: () -> some View) -> some View {
    VStack(alignment: .leading, spacing: 0) {
        content()
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(AppColors.surface)
    .clipShape(RoundedRectangle(cornerRadius: Radius.card))
    .overlay {
        RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1)
    }
}

private func sectionHead(_ title: String, count: Int? = nil, action: String? = nil, onAction: (() -> Void)? = nil) -> some View {
    HStack(alignment: .firstTextBaseline) {
        Text(title.uppercased())
            .font(.custom(AppFont.bodySemibold, size: 11))
            .tracking(0.8)
            .foregroundStyle(AppColors.textSecondary)
        if let count {
            Text("· \(count)")
                .font(.custom(AppFont.body, size: 11))
                .foregroundStyle(AppColors.textSecondary)
        }
        Spacer()
        if let action, let onAction {
            Button(action: onAction) {
                HStack(spacing: Spacing.xxs) {
                    Image(systemName: "plus").font(.system(size: 12))
                    Text(action).textStyle(.caption)
                }
                .foregroundStyle(AppColors.primary)
            }
        }
    }
    .padding(.horizontal, Spacing.xs)
    .padding(.top, Spacing.lg)
    .padding(.bottom, Spacing.sm)
}
