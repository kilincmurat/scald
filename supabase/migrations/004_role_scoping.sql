-- ============================================================
-- SCALD — Rol tabanlı yetkilendirme + belediye scoping
--
-- 003_roles_enum.sql'i çalıştırdıktan SONRA uygulayın.
--
-- Değişiklikler:
--   1. Mevcut 'municipality' rolündeki profiller 'data_entry' olur
--   2. municipalities.is_pilot kolonu + 4 pilot seed
--   3. scald_indicator_entries/completions/badges tabloları user_id
--      yerine municipality_id ile scope'lanır; user_id → entered_by
--      (audit için, hesap silinirse veri kalır)
--   4. feedback tablosu (citizen → decision_maker akışı)
--   5. indicator_threshold_overrides tablosu (admin editable eşikler)
--   6. RLS policy'leri yeni rollere göre yeniden yazılır
--   7. handle_new_user trigger'ı municipality_id de kaydeder
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Mevcut roller
-- ------------------------------------------------------------
UPDATE profiles SET role = 'data_entry' WHERE role = 'municipality';

-- ------------------------------------------------------------
-- 2) Municipalities: is_pilot + 4 partner seed
-- ------------------------------------------------------------
ALTER TABLE municipalities
  ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO municipalities (id, name, name_en, country, region, population, area_km2, latitude, longitude, is_active, is_pilot)
VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Trabzon', 'Trabzon', 'TR', 'Karadeniz',      807903, 4664.00, 41.0027, 39.7168, TRUE, TRUE),
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'Kavala',  'Kavala',  'GR', 'Doğu Makedonya',  54027,  350.60, 40.9396, 24.4120, TRUE, TRUE),
  ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'Tulcea',  'Tulcea',  'RO', 'Kuzeydoğu',       65624,  199.70, 45.1892, 28.8006, TRUE, TRUE),
  ('a4a4a4a4-a4a4-a4a4-a4a4-a4a4a4a4a4a4', 'Bitola',  'Bitola',  'MK', 'Pelagonia',       74550,   34.90, 41.0297, 21.3325, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  name_en    = EXCLUDED.name_en,
  country    = EXCLUDED.country,
  region     = EXCLUDED.region,
  population = EXCLUDED.population,
  area_km2   = EXCLUDED.area_km2,
  latitude   = EXCLUDED.latitude,
  longitude  = EXCLUDED.longitude,
  is_pilot   = TRUE,
  is_active  = TRUE;

-- Vatandaşları backfill: municipality_id boşsa Trabzon'a ata
UPDATE profiles
   SET municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
 WHERE role = 'citizen' AND municipality_id IS NULL;

-- Municipalities: public listelenmesi için (register dropdown'ında pilot listesi)
DROP POLICY IF EXISTS "public reads pilot municipalities" ON municipalities;
CREATE POLICY "public reads pilot municipalities"
  ON municipalities FOR SELECT
  USING (is_pilot = TRUE);

-- ------------------------------------------------------------
-- 3) scald_indicator_entries: municipality scoping + entered_by audit
-- ------------------------------------------------------------
ALTER TABLE scald_indicator_entries
  ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Kullanıcının belediyesinden backfill
UPDATE scald_indicator_entries e
   SET municipality_id = p.municipality_id,
       entered_by      = COALESCE(e.entered_by, e.user_id)
  FROM profiles p
 WHERE e.user_id = p.id
   AND p.municipality_id IS NOT NULL
   AND e.municipality_id IS NULL;

-- Belediyesiz kalan entry'leri sil (orphan — genelde admin veya profilsiz)
DELETE FROM scald_indicator_entries WHERE municipality_id IS NULL;

ALTER TABLE scald_indicator_entries
  ALTER COLUMN municipality_id SET NOT NULL;

-- Eski constraint ve kolon
ALTER TABLE scald_indicator_entries
  DROP CONSTRAINT IF EXISTS scald_indicator_entries_user_id_indicator_code_key;
DROP INDEX IF EXISTS idx_scald_entries_user;
DROP INDEX IF EXISTS idx_scald_entries_user_category;
DROP INDEX IF EXISTS idx_scald_entries_user_set;

ALTER TABLE scald_indicator_entries
  DROP COLUMN IF EXISTS user_id;

-- Yeni unique + index'ler
ALTER TABLE scald_indicator_entries
  ADD CONSTRAINT scald_indicator_entries_muni_indicator_key
  UNIQUE (municipality_id, indicator_code);

CREATE INDEX IF NOT EXISTS idx_scald_entries_muni ON scald_indicator_entries (municipality_id);
CREATE INDEX IF NOT EXISTS idx_scald_entries_muni_cat ON scald_indicator_entries (municipality_id, category_code);
CREATE INDEX IF NOT EXISTS idx_scald_entries_muni_set ON scald_indicator_entries (municipality_id, set_code);
CREATE INDEX IF NOT EXISTS idx_scald_entries_entered_by ON scald_indicator_entries (entered_by);

-- ------------------------------------------------------------
-- 4) scald_category_completions: aynı dönüşüm
-- ------------------------------------------------------------
ALTER TABLE scald_category_completions
  ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE scald_category_completions c
   SET municipality_id = p.municipality_id,
       completed_by    = COALESCE(c.completed_by, c.user_id)
  FROM profiles p
 WHERE c.user_id = p.id
   AND p.municipality_id IS NOT NULL
   AND c.municipality_id IS NULL;

DELETE FROM scald_category_completions WHERE municipality_id IS NULL;

ALTER TABLE scald_category_completions
  ALTER COLUMN municipality_id SET NOT NULL;

ALTER TABLE scald_category_completions
  DROP CONSTRAINT IF EXISTS scald_category_completions_user_id_category_code_key;
DROP INDEX IF EXISTS idx_scald_completions_user;

ALTER TABLE scald_category_completions
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE scald_category_completions
  ADD CONSTRAINT scald_category_completions_muni_cat_key
  UNIQUE (municipality_id, category_code);

CREATE INDEX IF NOT EXISTS idx_scald_completions_muni ON scald_category_completions (municipality_id);

-- ------------------------------------------------------------
-- 5) scald_set_badges: aynı dönüşüm
-- ------------------------------------------------------------
ALTER TABLE scald_set_badges
  ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS earned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE scald_set_badges b
   SET municipality_id = p.municipality_id,
       earned_by       = COALESCE(b.earned_by, b.user_id)
  FROM profiles p
 WHERE b.user_id = p.id
   AND p.municipality_id IS NOT NULL
   AND b.municipality_id IS NULL;

DELETE FROM scald_set_badges WHERE municipality_id IS NULL;

ALTER TABLE scald_set_badges
  ALTER COLUMN municipality_id SET NOT NULL;

ALTER TABLE scald_set_badges
  DROP CONSTRAINT IF EXISTS scald_set_badges_user_id_set_code_key;
DROP INDEX IF EXISTS idx_scald_badges_user;

ALTER TABLE scald_set_badges
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE scald_set_badges
  ADD CONSTRAINT scald_set_badges_muni_set_key
  UNIQUE (municipality_id, set_code);

CREATE INDEX IF NOT EXISTS idx_scald_badges_muni ON scald_set_badges (municipality_id);

-- ------------------------------------------------------------
-- 6) RLS policy'leri yeniden yaz (scoping değişti)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own entries" ON scald_indicator_entries;
DROP POLICY IF EXISTS "Users insert own entries" ON scald_indicator_entries;
DROP POLICY IF EXISTS "Users update own entries" ON scald_indicator_entries;
DROP POLICY IF EXISTS "Users delete own entries" ON scald_indicator_entries;

CREATE POLICY "read entries by muni or admin"
  ON scald_indicator_entries FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR municipality_id = auth_user_municipality()
  );

CREATE POLICY "data_entry writes for own muni"
  ON scald_indicator_entries FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

CREATE POLICY "data_entry updates own muni"
  ON scald_indicator_entries FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

CREATE POLICY "data_entry deletes own muni"
  ON scald_indicator_entries FOR DELETE
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

DROP POLICY IF EXISTS "Users read own completions" ON scald_category_completions;
DROP POLICY IF EXISTS "Users insert own completions" ON scald_category_completions;
DROP POLICY IF EXISTS "Users delete own completions" ON scald_category_completions;

CREATE POLICY "read completions by muni or admin"
  ON scald_category_completions FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR municipality_id = auth_user_municipality()
  );

CREATE POLICY "data_entry writes completions"
  ON scald_category_completions FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

CREATE POLICY "data_entry deletes completions"
  ON scald_category_completions FOR DELETE
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

DROP POLICY IF EXISTS "Users read own badges" ON scald_set_badges;
DROP POLICY IF EXISTS "Users insert own badges" ON scald_set_badges;
DROP POLICY IF EXISTS "Users delete own badges" ON scald_set_badges;

CREATE POLICY "read badges by muni or admin"
  ON scald_set_badges FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR municipality_id = auth_user_municipality()
  );

CREATE POLICY "data_entry writes badges"
  ON scald_set_badges FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

CREATE POLICY "data_entry deletes badges"
  ON scald_set_badges FOR DELETE
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

-- ------------------------------------------------------------
-- 7) Feedback tablosu (citizen → decision_maker akışı)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  subject         TEXT NOT NULL,
  message         TEXT NOT NULL,
  category        TEXT,  -- opsiyonel: environment, transport vb.
  status          TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'seen', 'in_progress', 'resolved', 'dismissed')),
  response        TEXT,
  responded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_muni_status ON feedback (municipality_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at DESC);

DROP TRIGGER IF EXISTS trg_feedback_updated_at ON feedback;
CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "citizen creates feedback for own muni" ON feedback;
CREATE POLICY "citizen creates feedback for own muni"
  ON feedback FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND (
      auth_user_role() = 'admin'
      OR municipality_id = auth_user_municipality()
    )
  );

DROP POLICY IF EXISTS "read feedback" ON feedback;
CREATE POLICY "read feedback"
  ON feedback FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'decision_maker' AND municipality_id = auth_user_municipality())
    OR user_id = auth.uid()  -- vatandaş kendi geri bildirimini görebilir
  );

DROP POLICY IF EXISTS "decision_maker updates feedback" ON feedback;
CREATE POLICY "decision_maker updates feedback"
  ON feedback FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'decision_maker' AND municipality_id = auth_user_municipality())
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'decision_maker' AND municipality_id = auth_user_municipality())
  );

DROP POLICY IF EXISTS "admin deletes feedback" ON feedback;
CREATE POLICY "admin deletes feedback"
  ON feedback FOR DELETE
  USING (auth_user_role() = 'admin');

-- ------------------------------------------------------------
-- 8) Threshold overrides (admin editable, JSON default'un üstüne biner)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS indicator_threshold_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code TEXT UNIQUE NOT NULL,
  threshold_0    TEXT NOT NULL DEFAULT 'None',
  threshold_1    TEXT NOT NULL,
  threshold_2    TEXT NOT NULL,
  threshold_3    TEXT NOT NULL,
  threshold_4    TEXT NOT NULL,
  threshold_5    TEXT NOT NULL,
  updated_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threshold_overrides_code ON indicator_threshold_overrides (indicator_code);

ALTER TABLE indicator_threshold_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated reads threshold overrides" ON indicator_threshold_overrides;
CREATE POLICY "authenticated reads threshold overrides"
  ON indicator_threshold_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin writes threshold overrides" ON indicator_threshold_overrides;
CREATE POLICY "admin writes threshold overrides"
  ON indicator_threshold_overrides FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- ------------------------------------------------------------
-- 9) handle_new_user: municipality_id de kaydet
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, municipality_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen'),
    NULLIF(NEW.raw_user_meta_data->>'municipality_id', '')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
