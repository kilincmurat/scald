-- ============================================================
-- SCALD — Belediye yeniden yapılandırması + demo veri taşıma
--
-- Amaç:
--   1. Trabzon'a girilmiş TÜM demo verisi (hesaplanan skorlar dahil) yeni
--      "Demo Municipality" belediyesine taşınır → Trabzon BOŞ kalır, gerçek
--      veri oraya girilecek; demo veri artık gerçek veri gibi görünmez.
--   2. Trabzon → "Trabzon Büyükşehir Belediyesi" olarak yeniden adlandırılır
--      ve güncel bilgilerle (nüfus/konum) güncellenir.
--   3. Ortahisar, Yomra, Novaci eklenir; Kavala, Tulcea güncel bilgilerle
--      güncellenir; Bitola pilotluktan çıkarılır (Novaci ile değişti).
--
-- Güncel bilgi kaynakları (2026-07 itibarıyla):
--   Trabzon Büyükşehir: 824.352 (2023), 4.628 km²  (il geneli)
--   Ortahisar:          330.836 (2024), 236 km²
--   Yomra:               49.721 (2023), 200 km²
--   Novaci (MK):          2.648 (2021 sayım), 753,53 km²
--   Kavala (GR):         66.376 (2021 sayım), 351,35 km²
--   Tulcea (RO):         65.624 (2021 sayım)
--
-- Tek transaction; enum eklemez, güvenle çalışır.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Demo belediyesi (pilot DEĞİL — register listesinde çıkmaz)
-- ------------------------------------------------------------
INSERT INTO municipalities
  (id, name, name_en, country, region, population, area_km2, latitude, longitude, is_active, is_pilot)
VALUES
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Demo Municipality', 'Demo Municipality',
   'XX', 'Demo', NULL, NULL, NULL, NULL, TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 2) Trabzon'un (a1a1…) tüm veri satırlarını Demo'ya taşı
--    Kullanılan tablolar (data-entry akışı):
-- ------------------------------------------------------------
UPDATE scald_indicator_entries    SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
UPDATE scald_category_completions SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
UPDATE scald_set_badges           SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
UPDATE scald_data_submissions     SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

-- Eski şema tabloları da varsa temizlensin (kullanımda olmayabilir):
UPDATE indicator_data    SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
UPDATE ecological_scores SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
UPDATE strategies        SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
UPDATE reports           SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
UPDATE climate_data      SET municipality_id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0' WHERE municipality_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

-- ------------------------------------------------------------
-- 3) Trabzon → Trabzon Büyükşehir Belediyesi (güncel bilgiler)
-- ------------------------------------------------------------
UPDATE municipalities SET
  name       = 'Trabzon Büyükşehir Belediyesi',
  name_en    = 'Trabzon Metropolitan Municipality',
  country    = 'TR',
  region     = 'Black Sea',
  population = 824352,
  area_km2   = 4628.00,
  latitude   = 41.0027,
  longitude  = 39.7168,
  is_active  = TRUE,
  is_pilot   = TRUE
WHERE id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

-- ------------------------------------------------------------
-- 4) Kavala + Tulcea güncelle
-- ------------------------------------------------------------
UPDATE municipalities SET
  population = 66376, area_km2 = 351.35, latitude = 41.0131, longitude = 24.4046,
  region = 'East Macedonia and Thrace', is_active = TRUE, is_pilot = TRUE
WHERE id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';

UPDATE municipalities SET
  population = 65624, latitude = 45.1667, longitude = 28.8000,
  region = 'Northern Dobruja', is_active = TRUE, is_pilot = TRUE
WHERE id = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

-- ------------------------------------------------------------
-- 5) Bitola: pilotluktan çıkar (Novaci ile değişti)
-- ------------------------------------------------------------
UPDATE municipalities SET is_pilot = FALSE, is_active = FALSE
WHERE id = 'a4a4a4a4-a4a4-a4a4-a4a4-a4a4a4a4a4a4';

-- ------------------------------------------------------------
-- 6) Yeni belediyeler: Ortahisar, Yomra, Novaci
-- ------------------------------------------------------------
INSERT INTO municipalities
  (id, name, name_en, country, region, population, area_km2, latitude, longitude, is_active, is_pilot)
VALUES
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'Ortahisar Belediyesi', 'Ortahisar Municipality', 'TR', 'Black Sea',            330836, 236.00,  41.0050, 39.7226, TRUE, TRUE),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Yomra Belediyesi',     'Yomra Municipality',     'TR', 'Black Sea',             49721, 200.00,  40.9539, 39.8600, TRUE, TRUE),
  ('b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', 'Novaci',               'Novaci Municipality',    'MK', 'Pelagonia',              2648, 753.53,  41.0428, 21.4583, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  name_en    = EXCLUDED.name_en,
  country    = EXCLUDED.country,
  region     = EXCLUDED.region,
  population = EXCLUDED.population,
  area_km2   = EXCLUDED.area_km2,
  latitude   = EXCLUDED.latitude,
  longitude  = EXCLUDED.longitude,
  is_active  = TRUE,
  is_pilot   = TRUE;

COMMIT;
