-- AlterTable
ALTER TABLE "CareerApplication" ALTER COLUMN "coverLetter" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "CareerApplication_email_idx" ON "CareerApplication"("email");
