-- ============================================================
-- SCALD — Veri girişlerine yıl boyutu eklendi
--
-- Her indikator entry'si, kategori tamamlama ve set rozeti artık belirli
-- bir yıla ait. Belediye 2025, 2026, ..., 2030 için ayrı ayrı veri
-- girebilir; ay yıl arasında karşılaştırma yapılabilir.
--
-- Kısıtlamalar:
-- - year >= 2020 AND year <= 2040 (uygulama tarafı 2025-2030 gösterecek
--   ama şema esnek bırakılıyor)
-- - UNIQUE artık (municipality_id, indicator_code, year) üzerinde
--   (aynı belediye bir indikatörü farklı yıllar için ayrı girebilir)
--
-- Backfill: Mevcut satırlar year=2025 alacak (default). Bu şu anki pilot
-- verisiyle uyumlu.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) scald_indicator_entries
-- ------------------------------------------------------------
ALTER TABLE scald_indicator_entries
  ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT 2025;

ALTER TABLE scald_indicator_entries
  DROP CONSTRAINT IF EXISTS scald_indicator_entries_year_check;
ALTER TABLE scald_indicator_entries
  ADD CONSTRAINT scald_indicator_entries_year_check
  CHECK (year >= 2020 AND year <= 2040);

ALTER TABLE scald_indicator_entries
  DROP CONSTRAINT IF EXISTS scald_indicator_entries_muni_indicator_key;
ALTER TABLE scald_indicator_entries
  DROP CONSTRAINT IF EXISTS scald_indicator_entries_muni_ind_year_key;
ALTER TABLE scald_indicator_entries
  ADD CONSTRAINT scald_indicator_entries_muni_ind_year_key
  UNIQUE (municipality_id, indicator_code, year);

CREATE INDEX IF NOT EXISTS idx_scald_entries_muni_year
  ON scald_indicator_entries (municipality_id, year);

-- ------------------------------------------------------------
-- 2) scald_category_completions
-- ------------------------------------------------------------
ALTER TABLE scald_category_completions
  ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT 2025;

ALTER TABLE scald_category_completions
  DROP CONSTRAINT IF EXISTS scald_category_completions_year_check;
ALTER TABLE scald_category_completions
  ADD CONSTRAINT scald_category_completions_year_check
  CHECK (year >= 2020 AND year <= 2040);

ALTER TABLE scald_category_completions
  DROP CONSTRAINT IF EXISTS scald_category_completions_muni_cat_key;
ALTER TABLE scald_category_completions
  DROP CONSTRAINT IF EXISTS scald_category_completions_muni_cat_year_key;
ALTER TABLE scald_category_completions
  ADD CONSTRAINT scald_category_completions_muni_cat_year_key
  UNIQUE (municipality_id, category_code, year);

CREATE INDEX IF NOT EXISTS idx_scald_completions_muni_year
  ON scald_category_completions (municipality_id, year);

-- ------------------------------------------------------------
-- 3) scald_set_badges
-- ------------------------------------------------------------
ALTER TABLE scald_set_badges
  ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT 2025;

ALTER TABLE scald_set_badges
  DROP CONSTRAINT IF EXISTS scald_set_badges_year_check;
ALTER TABLE scald_set_badges
  ADD CONSTRAINT scald_set_badges_year_check
  CHECK (year >= 2020 AND year <= 2040);

ALTER TABLE scald_set_badges
  DROP CONSTRAINT IF EXISTS scald_set_badges_muni_set_key;
ALTER TABLE scald_set_badges
  DROP CONSTRAINT IF EXISTS scald_set_badges_muni_set_year_key;
ALTER TABLE scald_set_badges
  ADD CONSTRAINT scald_set_badges_muni_set_year_key
  UNIQUE (municipality_id, set_code, year);

COMMIT;
