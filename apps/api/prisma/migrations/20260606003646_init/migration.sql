-- CreateEnum
CREATE TYPE "CookingExperience" AS ENUM ('BEGINNER', 'CONFIDENT', 'EXPERIENCED');

-- CreateEnum
CREATE TYPE "UnitPreference" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "SpiceTolerance" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "IngestionSource" AS ENUM ('VIDEO', 'AUDIO', 'LINK', 'HANDWRITTEN', 'MANUAL');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('UPLOADING', 'TRANSCRIBING', 'STRUCTURING', 'TRANSLATING', 'REVIEW', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "regionId" UUID,
    "country" TEXT,
    "languages" TEXT[],
    "cookingExperience" "CookingExperience" NOT NULL DEFAULT 'BEGINNER',
    "unitPreference" "UnitPreference" NOT NULL DEFAULT 'METRIC',
    "spiceTolerance" "SpiceTolerance" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "authorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "titleOriginal" TEXT,
    "description" TEXT,
    "descriptionOriginal" TEXT,
    "originalLanguage" TEXT,
    "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "difficulty" "Difficulty",
    "prepTimeMinutes" INTEGER,
    "cookTimeMinutes" INTEGER,
    "totalTimeMinutes" INTEGER,
    "baseServings" INTEGER NOT NULL DEFAULT 4,
    "cuisineId" UUID,
    "regionId" UUID,
    "parentRecipeId" UUID,
    "forkNote" TEXT,
    "coverImageUrl" TEXT,
    "originalVideoUrl" TEXT,
    "originalAudioUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "cookCount" INTEGER NOT NULL DEFAULT 0,
    "endorsementCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipeId" UUID NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "instructionOriginal" TEXT,
    "videoSegmentUrl" TEXT,
    "videoStartMs" INTEGER,
    "videoEndMs" INTEGER,
    "timerSeconds" INTEGER,
    "tipText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameOriginal" TEXT,
    "amount" DOUBLE PRECISION,
    "unit" TEXT,
    "quantityNote" TEXT,
    "groupLabel" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "substitutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuisines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuisines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "parentRegionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dietary_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_dietary_tags" (
    "recipeId" UUID NOT NULL,
    "dietaryTagId" UUID NOT NULL,

    CONSTRAINT "recipe_dietary_tags_pkey" PRIMARY KEY ("recipeId","dietaryTagId")
);

-- CreateTable
CREATE TABLE "user_cuisine_interests" (
    "userId" UUID NOT NULL,
    "cuisineId" UUID NOT NULL,

    CONSTRAINT "user_cuisine_interests_pkey" PRIMARY KEY ("userId","cuisineId")
);

-- CreateTable
CREATE TABLE "follows" (
    "followerId" UUID NOT NULL,
    "followingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "recipe_saves" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tried_this" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "photoUrl" TEXT,
    "note" TEXT,
    "variations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tried_this_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_endorsements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shoppingListId" UUID NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "unit" TEXT,
    "quantityNote" TEXT,
    "recipeId" UUID,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooking_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "cooking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "recipeId" UUID,
    "sourceType" "IngestionSource" NOT NULL,
    "sourceUrl" TEXT,
    "sourceLanguage" TEXT,
    "status" "IngestionStatus" NOT NULL DEFAULT 'UPLOADING',
    "transcriptionRaw" TEXT,
    "structuredData" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "recipes_authorId_publishedAt_idx" ON "recipes"("authorId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "recipes_cuisineId_idx" ON "recipes"("cuisineId");

-- CreateIndex
CREATE INDEX "recipes_regionId_idx" ON "recipes"("regionId");

-- CreateIndex
CREATE INDEX "recipes_difficulty_idx" ON "recipes"("difficulty");

-- CreateIndex
CREATE INDEX "recipes_totalTimeMinutes_idx" ON "recipes"("totalTimeMinutes");

-- CreateIndex
CREATE INDEX "recipes_status_publishedAt_idx" ON "recipes"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "recipe_steps_recipeId_stepNumber_idx" ON "recipe_steps"("recipeId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_recipeId_stepNumber_key" ON "recipe_steps"("recipeId", "stepNumber");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_orderIndex_idx" ON "recipe_ingredients"("recipeId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "cuisines_name_key" ON "cuisines"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cuisines_slug_key" ON "cuisines"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_country_key" ON "regions"("name", "country");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_tags_name_key" ON "dietary_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_tags_slug_key" ON "dietary_tags"("slug");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE INDEX "recipe_saves_userId_idx" ON "recipe_saves"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_saves_userId_recipeId_key" ON "recipe_saves"("userId", "recipeId");

-- CreateIndex
CREATE INDEX "tried_this_userId_createdAt_idx" ON "tried_this"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "tried_this_recipeId_idx" ON "tried_this"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_endorsements_recipeId_idx" ON "recipe_endorsements"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_endorsements_userId_recipeId_key" ON "recipe_endorsements"("userId", "recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_lists_userId_key" ON "shopping_lists"("userId");

-- CreateIndex
CREATE INDEX "shopping_list_items_shoppingListId_idx" ON "shopping_list_items"("shoppingListId");

-- CreateIndex
CREATE INDEX "cooking_sessions_userId_completedAt_idx" ON "cooking_sessions"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "cooking_sessions_recipeId_idx" ON "cooking_sessions"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_jobs_recipeId_key" ON "ingestion_jobs"("recipeId");

-- CreateIndex
CREATE INDEX "ingestion_jobs_userId_status_idx" ON "ingestion_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_userId_createdAt_idx" ON "ingestion_jobs"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "cuisines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_parentRecipeId_fkey" FOREIGN KEY ("parentRecipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_parentRegionId_fkey" FOREIGN KEY ("parentRegionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dietary_tags" ADD CONSTRAINT "recipe_dietary_tags_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dietary_tags" ADD CONSTRAINT "recipe_dietary_tags_dietaryTagId_fkey" FOREIGN KEY ("dietaryTagId") REFERENCES "dietary_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cuisine_interests" ADD CONSTRAINT "user_cuisine_interests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cuisine_interests" ADD CONSTRAINT "user_cuisine_interests_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "cuisines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_saves" ADD CONSTRAINT "recipe_saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_saves" ADD CONSTRAINT "recipe_saves_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tried_this" ADD CONSTRAINT "tried_this_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tried_this" ADD CONSTRAINT "tried_this_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_endorsements" ADD CONSTRAINT "recipe_endorsements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_endorsements" ADD CONSTRAINT "recipe_endorsements_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
