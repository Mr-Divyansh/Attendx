-- Forward-only corrections for CSV conflict prevention.
-- Existing portal data was verified to contain no conflicting status rows.

CREATE UNIQUE INDEX IF NOT EXISTS "PortalAttendanceRecord_importId_subject_date_key"
ON "PortalAttendanceRecord"("importId", "subject", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "PortalImportedAttendance_studentId_subjectName_attendanceDate_key"
ON "PortalImportedAttendance"("studentId", "subjectName", "attendanceDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PortalAttendanceRecord_status_check'
      AND conrelid = '"PortalAttendanceRecord"'::regclass
  ) THEN
    ALTER TABLE "PortalAttendanceRecord"
      ADD CONSTRAINT "PortalAttendanceRecord_status_check"
      CHECK ("status" IN ('PRESENT', 'ABSENT', 'LATE'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PortalImportedAttendance_status_check'
      AND conrelid = '"PortalImportedAttendance"'::regclass
  ) THEN
    ALTER TABLE "PortalImportedAttendance"
      ADD CONSTRAINT "PortalImportedAttendance_status_check"
      CHECK ("status" IN ('PRESENT', 'ABSENT', 'LATE'));
  END IF;
END $$;
