-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "DietGoal" AS ENUM ('LOSE', 'MAINTAIN', 'GAIN');

-- CreateEnum
CREATE TYPE "Allergen" AS ENUM ('PEANUTS', 'TREE_NUTS', 'MILK', 'EGG', 'WHEAT_GLUTEN', 'SOY', 'FISH', 'SHELLFISH', 'SESAME');

-- CreateEnum
CREATE TYPE "NutritionSource" AS ENUM ('AI_ESTIMATED', 'MANUAL', 'COMPUTED');

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "containsAllergens" "Allergen"[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activityLevel" "ActivityLevel",
ADD COLUMN     "allergens" "Allergen"[],
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "dietGoal" "DietGoal",
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "sex" "BiologicalSex",
ADD COLUMN     "weightKg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "recipe_nutrition" (
    "recipeId" UUID NOT NULL,
    "calories" INTEGER,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "fiberG" DOUBLE PRECISION,
    "sugarG" DOUBLE PRECISION,
    "satFatG" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "source" "NutritionSource" NOT NULL DEFAULT 'AI_ESTIMATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_nutrition_pkey" PRIMARY KEY ("recipeId")
);

-- CreateTable
CREATE TABLE "user_dietary_tags" (
    "userId" UUID NOT NULL,
    "dietaryTagId" UUID NOT NULL,

    CONSTRAINT "user_dietary_tags_pkey" PRIMARY KEY ("userId","dietaryTagId")
);

-- AddForeignKey
ALTER TABLE "recipe_nutrition" ADD CONSTRAINT "recipe_nutrition_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dietary_tags" ADD CONSTRAINT "user_dietary_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dietary_tags" ADD CONSTRAINT "user_dietary_tags_dietaryTagId_fkey" FOREIGN KEY ("dietaryTagId") REFERENCES "dietary_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
