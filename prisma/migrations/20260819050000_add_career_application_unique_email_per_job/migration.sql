/*
  Warnings:

  - A unique constraint covering the columns `[careerJobId,email]` on the table `CareerApplication` will be added. If there are existing duplicate (careerJobId, email) pairs, this migration will fail to apply — resolve those rows first (see note below).

*/

-- NOTE: this migration only creates the unique index. It intentionally does
-- NOT delete or modify any existing rows. If this fails with a uniqueness
-- violation when applied against a database that already has data, it means
-- duplicate (careerJobId, email) pairs already exist in "CareerApplication".
-- Resolve those manually (decide which row per pair to keep) before
-- re-running this migration — do not blindly delete rows without reviewing
-- them, since deleting an application is a real action a candidate should
-- not lose silently.

-- CreateIndex
CREATE UNIQUE INDEX "CareerApplication_careerJobId_email_key" ON "CareerApplication"("careerJobId", "email");
