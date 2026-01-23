-- Increase default max_hardware to 3
ALTER TABLE licenses
ALTER COLUMN max_hardware
SET DEFAULT 3;
-- Update existing licenses to 3 if they are currently 1
UPDATE licenses
SET max_hardware = 3
WHERE max_hardware = 1;
-- Add comment explaining the change
COMMENT ON COLUMN licenses.max_hardware IS 'Maximum number of hardware devices allowed per license. Default increased to 3 in 2026-01-22.';