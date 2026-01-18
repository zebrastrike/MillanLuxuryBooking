-- AlterTable
ALTER TABLE "oauth_tokens" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'google',
ADD COLUMN "merchantId" TEXT,
ADD COLUMN "locationId" TEXT,
ADD COLUMN "payload" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_provider_merchantId_key" ON "oauth_tokens"("provider", "merchantId");
