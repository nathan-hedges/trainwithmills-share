-- Uploaded profile pictures (stored privately in R2, served via a signed URL).
ALTER TABLE "User" ADD COLUMN "avatarKey" TEXT;
