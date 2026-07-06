-- ============================================================
-- SCALD — 3 seviyeli ağırlıklandırma (set / category / indicator)
--
-- Skor hesaplama:
--   category_score = Σ(indicator_score × ind_weight) / Σ(ind_weight)
--   set_score      = Σ(cat_score × cat_weight)      / Σ(cat_weight)
--   overall        = Σ(set_score × set_weight)      / Σ(set_weight)
--
-- Override yoksa default = 1 (yani hepsi eşit).
-- SELECT herkes okur (dashboard hesap yapıyor), yazma sadece admin.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) set_weight_overrides
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS set_weight_overrides (
  set_code   TEXT PRIMARY KEY CHECK (set_code IN ('ES','SS','MS','ECS')),
  weight     NUMERIC NOT NULL DEFAULT 1 CHECK (weight >= 0),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE set_weight_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated reads set weights" ON set_weight_overrides;
CREATE POLICY "authenticated reads set weights"
  ON set_weight_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin writes set weights" ON set_weight_overrides;
CREATE POLICY "admin writes set weights"
  ON set_weight_overrides FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- ------------------------------------------------------------
-- 2) category_weight_overrides
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_weight_overrides (
  category_code TEXT PRIMARY KEY,
  weight        NUMERIC NOT NULL DEFAULT 1 CHECK (weight >= 0),
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE category_weight_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated reads category weights" ON category_weight_overrides;
CREATE POLICY "authenticated reads category weights"
  ON category_weight_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin writes category weights" ON category_weight_overrides;
CREATE POLICY "admin writes category weights"
  ON category_weight_overrides FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- ------------------------------------------------------------
-- 3) indicator_weight_overrides
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS indicator_weight_overrides (
  indicator_code TEXT PRIMARY KEY,
  weight         NUMERIC NOT NULL DEFAULT 1 CHECK (weight >= 0),
  updated_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE indicator_weight_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated reads indicator weights" ON indicator_weight_overrides;
CREATE POLICY "authenticated reads indicator weights"
  ON indicator_weight_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin writes indicator weights" ON indicator_weight_overrides;
CREATE POLICY "admin writes indicator weights"
  ON indicator_weight_overrides FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

COMMIT;
