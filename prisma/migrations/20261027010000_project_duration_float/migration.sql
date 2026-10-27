-- Project duration in seconds with sub-second precision. Integer storage
-- truncated 30.58s to 30s and cut the tail of the narration.
ALTER TABLE "Project"
  ALTER COLUMN "duration" TYPE DOUBLE PRECISION
  USING "duration"::double precision;
