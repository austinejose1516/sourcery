-- CreateEnum
CREATE TYPE "CautionLevel" AS ENUM ('CAUTION', 'WARN', 'CRITICAL');

-- AlterTable
ALTER TABLE "recipe_steps" ADD COLUMN     "cautionLevel" "CautionLevel",
ADD COLUMN     "cautionText" TEXT,
ADD COLUMN     "donenessCue" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "timerLabel" TEXT,
ADD COLUMN     "voiceAnswer" TEXT,
ADD COLUMN     "voiceQuestion" TEXT;

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "videoDurationMs" INTEGER;

-- CreateTable
CREATE TABLE "recipe_step_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stepId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "noteOverride" TEXT,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "recipe_step_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_step_ingredients_stepId_orderIndex_idx" ON "recipe_step_ingredients"("stepId", "orderIndex");

-- AddForeignKey
ALTER TABLE "recipe_step_ingredients" ADD CONSTRAINT "recipe_step_ingredients_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "recipe_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_step_ingredients" ADD CONSTRAINT "recipe_step_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "recipe_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
