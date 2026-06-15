-- CreateEnum
CREATE TYPE "RecipeVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "visibility" "RecipeVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "imported_videos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "structuredData" JSONB,
    "title" TEXT,
    "channel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imported_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imported_videos_provider_videoId_key" ON "imported_videos"("provider", "videoId");
