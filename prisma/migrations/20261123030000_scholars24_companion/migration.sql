CREATE TABLE IF NOT EXISTS "PortalCompanionPairing" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortalCompanionPairing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PortalCompanionDevice" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "lastSeenAt" TIMESTAMP(3),
  "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortalCompanionDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PortalCompanionJob" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB,
  "result" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortalCompanionJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PortalCompanionPairing_codeHash_key" ON "PortalCompanionPairing"("codeHash");
CREATE INDEX IF NOT EXISTS "PortalCompanionPairing_studentId_createdAt_idx" ON "PortalCompanionPairing"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "PortalCompanionPairing_expiresAt_idx" ON "PortalCompanionPairing"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PortalCompanionDevice_studentId_secretHash_key" ON "PortalCompanionDevice"("studentId", "secretHash");
CREATE INDEX IF NOT EXISTS "PortalCompanionDevice_studentId_status_idx" ON "PortalCompanionDevice"("studentId", "status");
CREATE INDEX IF NOT EXISTS "PortalCompanionDevice_lastSeenAt_idx" ON "PortalCompanionDevice"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "PortalCompanionJob_deviceId_status_queuedAt_idx" ON "PortalCompanionJob"("deviceId", "status", "queuedAt");
CREATE INDEX IF NOT EXISTS "PortalCompanionJob_studentId_queuedAt_idx" ON "PortalCompanionJob"("studentId", "queuedAt");
CREATE INDEX IF NOT EXISTS "PortalCompanionJob_expiresAt_idx" ON "PortalCompanionJob"("expiresAt");

DO $$
DECLARE
  constraints_to_add text[][] := ARRAY[
    ['PortalCompanionPairing','PortalCompanionPairing_studentId_fkey','FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE'],
    ['PortalCompanionDevice','PortalCompanionDevice_studentId_fkey','FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE'],
    ['PortalCompanionJob','PortalCompanionJob_studentId_fkey','FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE'],
    ['PortalCompanionJob','PortalCompanionJob_deviceId_fkey','FOREIGN KEY ("deviceId") REFERENCES "PortalCompanionDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE']
  ];
  item text[];
BEGIN
  FOREACH item SLICE 1 IN ARRAY constraints_to_add
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = item[2]
        AND conrelid = (quote_ident(item[1])::regclass)
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', item[1], item[2], item[3]);
    END IF;
  END LOOP;
END $$;
