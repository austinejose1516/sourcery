-- AlterTable
ALTER TABLE "imported_videos" ADD COLUMN     "channelId" TEXT;

-- AlterTable
ALTER TABLE "ingestion_jobs" ADD COLUMN     "sourceOwned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "youtube_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelTitle" TEXT NOT NULL,
    "channelHandle" TEXT,
    "channelThumbUrl" TEXT,
    "uploadsPlaylistId" TEXT NOT NULL,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtube_oauth_states" (
    "state" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_oauth_states_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE UNIQUE INDEX "youtube_connections_userId_key" ON "youtube_connections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_connections_channelId_key" ON "youtube_connections"("channelId");

-- CreateIndex
CREATE INDEX "youtube_oauth_states_expiresAt_idx" ON "youtube_oauth_states"("expiresAt");

-- AddForeignKey
ALTER TABLE "youtube_connections" ADD CONSTRAINT "youtube_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
