-- Scholars24 external portal integration data
CREATE TABLE "PortalConnection" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SCHOLARS24',
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "externalStudentId" TEXT,
    "externalProfileName" TEXT,
    "externalCourse" TEXT,
    "externalSemester" TEXT,
    "externalAcademicYear" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortalSyncHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'SCHOLARS24',
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "details" JSONB,
    CONSTRAINT "PortalSyncHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortalImportedSubject" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SCHOLARS24',
    "subjectName" TEXT NOT NULL,
    "subjectCode" TEXT,
    "teacherName" TEXT,
    "semester" TEXT,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalImportedSubject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortalImportedAttendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SCHOLARS24',
    "subjectName" TEXT NOT NULL,
    "subjectCode" TEXT,
    "attendanceDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalLectures" INTEGER,
    "presentLectures" INTEGER,
    "absentLectures" INTEGER,
    "percentage" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalImportedAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortalImportedLecture" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SCHOLARS24',
    "lectureDate" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectCode" TEXT,
    "teacherName" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "room" TEXT,
    "status" TEXT,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalImportedLecture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortalImportedTimetable" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SCHOLARS24',
    "weekday" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectCode" TEXT,
    "teacherName" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "room" TEXT,
    "semester" TEXT,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalImportedTimetable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PortalImport" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CSV',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PortalAttendanceRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalAttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalConnection_studentId_key" ON "PortalConnection"("studentId");
CREATE INDEX "PortalConnection_provider_status_idx" ON "PortalConnection"("provider", "status");
CREATE INDEX "PortalSyncHistory_studentId_startedAt_idx" ON "PortalSyncHistory"("studentId", "startedAt");
CREATE INDEX "PortalSyncHistory_studentId_status_idx" ON "PortalSyncHistory"("studentId", "status");
CREATE UNIQUE INDEX "PortalImportedSubject_studentId_externalKey_key" ON "PortalImportedSubject"("studentId", "externalKey");
CREATE INDEX "PortalImportedSubject_studentId_provider_idx" ON "PortalImportedSubject"("studentId", "provider");
CREATE UNIQUE INDEX "PortalImportedAttendance_studentId_externalKey_key" ON "PortalImportedAttendance"("studentId", "externalKey");
CREATE INDEX "PortalImportedAttendance_studentId_attendanceDate_idx" ON "PortalImportedAttendance"("studentId", "attendanceDate");
CREATE INDEX "PortalImportedAttendance_studentId_subjectName_idx" ON "PortalImportedAttendance"("studentId", "subjectName");
CREATE UNIQUE INDEX "PortalImportedLecture_studentId_externalKey_key" ON "PortalImportedLecture"("studentId", "externalKey");
CREATE INDEX "PortalImportedLecture_studentId_lectureDate_idx" ON "PortalImportedLecture"("studentId", "lectureDate");
CREATE UNIQUE INDEX "PortalImportedTimetable_studentId_externalKey_key" ON "PortalImportedTimetable"("studentId", "externalKey");
CREATE INDEX "PortalImportedTimetable_studentId_weekday_idx" ON "PortalImportedTimetable"("studentId", "weekday");
CREATE INDEX IF NOT EXISTS "PortalImport_studentId_updatedAt_idx" ON "PortalImport"("studentId", "updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PortalAttendanceRecord_importId_subject_date_status_key" ON "PortalAttendanceRecord"("importId", "subject", "date", "status");
CREATE INDEX IF NOT EXISTS "PortalAttendanceRecord_importId_date_idx" ON "PortalAttendanceRecord"("importId", "date");

ALTER TABLE "PortalConnection" ADD CONSTRAINT "PortalConnection_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalSyncHistory" ADD CONSTRAINT "PortalSyncHistory_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalSyncHistory" ADD CONSTRAINT "PortalSyncHistory_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "PortalConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PortalImportedSubject" ADD CONSTRAINT "PortalImportedSubject_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalImportedAttendance" ADD CONSTRAINT "PortalImportedAttendance_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalImportedLecture" ADD CONSTRAINT "PortalImportedLecture_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalImportedTimetable" ADD CONSTRAINT "PortalImportedTimetable_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalImport" ADD CONSTRAINT "PortalImport_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalAttendanceRecord" ADD CONSTRAINT "PortalAttendanceRecord_importId_fkey"
FOREIGN KEY ("importId") REFERENCES "PortalImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
