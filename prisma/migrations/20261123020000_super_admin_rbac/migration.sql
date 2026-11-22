ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SUPER_ADMIN'
      AND enumtypid = '"Role"'::regtype
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
  END IF;
END $$;
