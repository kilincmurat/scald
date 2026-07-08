-- ============================================================
-- SCALD — Veri onay silsilesi (submission → approval → calculate)
--
-- Akış:
-- 1. Data entry personeli o yılın verilerini girer, "Verilerin
--    doğruluğunu beyan ediyorum" kutucuğunu işaretleyip gönderir
--    → row: status='submitted', submitter_declaration=true
-- 2. Karar verici (decision_maker) veriyi ve beyanı görür,
--    kendi onay kutucuğunu işaretleyip onaylar
--    → row: status='approved', approval_declaration=true
-- 3. Hesapla butonu yalnızca status='approved' olduğunda aktif
--
-- Bir yıl için tek satır: (municipality_id, year) UNIQUE.
-- ============================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE scald_submission_status AS ENUM ('submitted', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS scald_data_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2040),
  status scald_submission_status NOT NULL DEFAULT 'submitted',

  -- Submitter (data entry) fields
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitter_declaration BOOLEAN NOT NULL DEFAULT false,
  submitter_note TEXT,
  entered_count INTEGER,
  required_count INTEGER,

  -- Reviewer (decision maker) fields
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approval_declaration BOOLEAN NOT NULL DEFAULT false,
  reviewer_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT scald_data_submissions_muni_year_key UNIQUE (municipality_id, year)
);

CREATE INDEX IF NOT EXISTS idx_scald_submissions_muni_year
  ON scald_data_submissions (municipality_id, year);

CREATE INDEX IF NOT EXISTS idx_scald_submissions_status
  ON scald_data_submissions (status);

ALTER TABLE scald_data_submissions ENABLE ROW LEVEL SECURITY;

-- Read: admin veya aynı belediye
DROP POLICY IF EXISTS "read submissions by muni or admin" ON scald_data_submissions;
CREATE POLICY "read submissions by muni or admin"
  ON scald_data_submissions FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR municipality_id = auth_user_municipality()
  );

-- Insert: yalnızca data_entry (kendi belediyesi) veya admin
DROP POLICY IF EXISTS "data_entry inserts own submissions" ON scald_data_submissions;
CREATE POLICY "data_entry inserts own submissions"
  ON scald_data_submissions FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'data_entry'
      AND municipality_id = auth_user_municipality()
    )
  );

-- Update: aynı belediyeden data_entry (yeniden gönderme) veya
-- decision_maker (onay) veya admin
DROP POLICY IF EXISTS "muni users update own submissions" ON scald_data_submissions;
CREATE POLICY "muni users update own submissions"
  ON scald_data_submissions FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() IN ('data_entry', 'decision_maker')
      AND municipality_id = auth_user_municipality()
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() IN ('data_entry', 'decision_maker')
      AND municipality_id = auth_user_municipality()
    )
  );

-- Delete: yalnızca admin (temizlik için)
DROP POLICY IF EXISTS "admin deletes submissions" ON scald_data_submissions;
CREATE POLICY "admin deletes submissions"
  ON scald_data_submissions FOR DELETE
  USING (auth_user_role() = 'admin');

-- updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION scald_submissions_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scald_data_submissions_touch ON scald_data_submissions;
CREATE TRIGGER scald_data_submissions_touch
  BEFORE UPDATE ON scald_data_submissions
  FOR EACH ROW EXECUTE FUNCTION scald_submissions_touch_updated_at();

COMMIT;
