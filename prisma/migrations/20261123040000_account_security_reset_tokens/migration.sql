ALTER TABLE "User"
  ADD COLUMN "securityVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

ALTER TABLE "PersonalUser"
  ADD COLUMN "securityVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT,
  "personalUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_owner_check" CHECK (
    ("userId" IS NOT NULL AND "personalUserId" IS NULL) OR
    ("userId" IS NULL AND "personalUserId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_createdAt_idx"
  ON "PasswordResetToken"("userId", "createdAt");
CREATE INDEX "PasswordResetToken_personalUserId_createdAt_idx"
  ON "PasswordResetToken"("personalUserId", "createdAt");
CREATE INDEX "PasswordResetToken_expiresAt_idx"
  ON "PasswordResetToken"("expiresAt");

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_personalUserId_fkey"
  FOREIGN KEY ("personalUserId") REFERENCES "PersonalUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
