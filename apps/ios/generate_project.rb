#!/usr/bin/env ruby
# Generates native-ios/ReciPeer.xcodeproj using the xcodeproj gem.
# Re-run after adding/moving source files. Sources are wired by globbing the
# ReciPeer/ tree, so new .swift files are picked up automatically.

require 'xcodeproj'
require 'fileutils'

ROOT = __dir__
PROJ_PATH = File.join(ROOT, 'ReciPeer.xcodeproj')
APP_DIR = File.join(ROOT, 'ReciPeer')

FileUtils.rm_rf(PROJ_PATH)
project = Xcodeproj::Project.new(PROJ_PATH)

# ---- Target ---------------------------------------------------------------
target = project.new_target(:application, 'ReciPeer', :ios, '17.0')
target.product_type = 'com.apple.product-type.application'

# ---- xcconfig file references ---------------------------------------------
config_group = project.main_group.new_group('Config', 'Config')
refs = {}
%w[Base Debug Release].each do |name|
  ref = config_group.new_file("#{name}.xcconfig")
  ref.last_known_file_type = 'text.xcconfig'
  refs[name] = ref
end

common_settings = {
  'PRODUCT_BUNDLE_IDENTIFIER' => 'com.austinejose.recipeer',
  'PRODUCT_NAME' => '$(TARGET_NAME)',
  'SWIFT_VERSION' => '5.0',
  'IPHONEOS_DEPLOYMENT_TARGET' => '17.0',
  'INFOPLIST_FILE' => 'ReciPeer/Resources/Info.plist',
  'GENERATE_INFOPLIST_FILE' => 'NO',
  'CODE_SIGN_STYLE' => 'Automatic',
  'TARGETED_DEVICE_FAMILY' => '1', # iPhone
  'SWIFT_EMIT_LOC_STRINGS' => 'YES',
  'ENABLE_PREVIEWS' => 'YES',
  'MARKETING_VERSION' => '0.0.1',
  'CURRENT_PROJECT_VERSION' => '1',
  'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
  'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks'],
}

target.build_configurations.each do |config|
  common_settings.each { |k, v| config.build_settings[k] = v }
  config.base_configuration_reference =
    (config.name == 'Debug' ? refs['Debug'] : refs['Release'])
end

# ---- Groups + source files (track refs as we create them) ------------------
swift_refs = []

add_dir = lambda do |group, dir|
  Dir.children(dir).sort.each do |entry|
    path = File.join(dir, entry)
    if File.directory?(path)
      subgroup = group.new_group(entry, entry)
      add_dir.call(subgroup, path)
    elsif entry.end_with?('.swift')
      swift_refs << group.new_file(entry)
    end
  end
end

app_group = project.main_group.new_group('ReciPeer', 'ReciPeer')
# Add Core, App, Features (sources); handle Resources separately for assets/fonts.
%w[App Core Features].each do |top|
  dir = File.join(APP_DIR, top)
  next unless Dir.exist?(dir)
  subgroup = app_group.new_group(top, top)
  add_dir.call(subgroup, dir)
end

# Resources: asset catalog + fonts (NOT Info.plist — that's a build setting).
res_dir = File.join(APP_DIR, 'Resources')
res_group = app_group.new_group('Resources', 'Resources')
if Dir.exist?(res_dir)
  assets = File.join(res_dir, 'Assets.xcassets')
  res_group.new_file('Assets.xcassets') if Dir.exist?(assets)

  fonts_dir = File.join(res_dir, 'Fonts')
  if Dir.exist?(fonts_dir)
    fonts_group = res_group.new_group('Fonts', 'Fonts')
    Dir.glob(File.join(fonts_dir, '*.ttf')).each do |font|
      fonts_group.new_file(File.basename(font))
    end
  end
end

# Compile all Swift sources.
target.add_file_references(swift_refs)

# Resources phase: asset catalog + fonts.
assets_ref = res_group.files.find { |f| f.path == 'Assets.xcassets' }
resource_refs = []
resource_refs << assets_ref if assets_ref
Dir.glob(File.join(APP_DIR, 'Resources', 'Fonts', '*.ttf')).each do |font|
  ref = res_group.groups.flat_map(&:files).find { |f| f.path == File.basename(font) }
  resource_refs << ref if ref
end
target.add_resources(resource_refs.compact)

# ---- Swift Package: supabase-swift ----------------------------------------
package = project.new(Xcodeproj::Project::Object::XCRemoteSwiftPackageReference)
package.repositoryURL = 'https://github.com/supabase/supabase-swift.git'
package.requirement = {
  'kind' => 'upToNextMajorVersion',
  'minimumVersion' => '2.0.0',
}
project.root_object.package_references << package

product = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
product.package = package
product.product_name = 'Supabase'
target.package_product_dependencies << product

# ---- Scheme ----------------------------------------------------------------
scheme = Xcodeproj::XCScheme.new
scheme.configure_with_targets(target, nil, launch_target: target)
scheme.save_as(PROJ_PATH, 'ReciPeer', true)

project.save
puts "Generated #{PROJ_PATH} with #{swift_refs.size} Swift files"
