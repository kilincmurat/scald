-- ============================================================
-- SCALD — V6: ölçüm tanımı değişen göstergelerin eski değerlerini kaldır
--
-- V6 (Final) 23 göstergenin NE ölçtüğünü değiştirdi; eski değer yeni
-- tanıma göre anlamsız:
--   toplam sayı     → 10.000 kişi / 100 km² başına   (ES_GI5, ES_GI8, ES_CL1,
--                      ES_EF4, ES_WA5-7, ES_WA9, ES_DS2, ES_IN1, ES_IN5,
--                      ES_IN7, ES_IN8, SS_CA3, SS_GL3)
--   hektar          → yüzde                          (ES_LU7, ES_LU8, ES_WT8)
--   100.000 kişi    → 10.000 kişi başına (10 kat)     (SS_VE6, SS_SRM3)
--   yıllık          → 2023–2025 üç yıllık toplam      (SS_VE1)
--   kişi/10.000     → yüzde                          (SS_VE2, ECS_REE3)
-- Örn. SS_SRM3'te V5'e göre girilmiş 1.3 değeri V6 eşikleriyle skor 3
-- yerine skor 5 alıyor. Bu değerler yeni birimde yeniden girilmeli.
--
-- Proje kararı (2026-10-21): eski değerler silinir, veri girişçileri V6
-- tanımıyla yeniden girer; Yomra'nın onaylı 2025 verisi düzeltme için
-- yeniden açılır.
--
-- KİLİTLİ YILLARA DOKUNULMAZ. Onaylı (approved) ya da incelemedeki
-- (submitted) bir yıldan değer silmek, kimsenin düzeltemeyeceği "onaylı
-- ama eksik" bir gönderim bırakır. Bu yüzden önce Yomra 2025 açılır, sonra
-- silme yalnızca kilitli OLMAYAN belediye/yıllara uygulanır. Kilitli kalan
-- yıllar NOTICE ile raporlanır; açılmaları gerekirse karar verici/admin
-- "Request changes" ile açar ve bu dosya tekrar çalıştırılır.
--
-- Geri dönüş: silinen her satır önce scald_indicator_entries_v5_archive
-- tablosuna kopyalanır (yalnızca admin okuyabilir).
--
-- Eski değer = V6 arayüzü yayına girmeden ÖNCE yazılmış değer: updated_at
-- < 2026-10-21 16:45:39 UTC (V6 commit'i 3fa2300). Sonra yazılan her değer
-- V6 tanımıyla girilmiştir ve hiçbir koşulda silinmez — V5'te karşılığı
-- olmayıp V6'da ilk kez girilenler dahil. (updated_at her yazmada
-- tetikleyiciyle yenilenir; 023 kod değiştirirken korur.)
--
-- Tekrar çalıştırılabilir — dosyanın tamamı: yalnızca hâlâ duran eski
-- değerlere dokunur, yeniden girilip onaylanmış bir yılı açmaz; silme
-- zinciri tek ifadede ve yalnızca O ÇALIŞMADA silinen girdilerin
-- kategori/rozet kayıtlarını temizler. Bu yüzden Cloud'dan taşınan veriye
-- self-hosted kurulumda yeniden uygulanabilir (RUNBOOK §5.3): veri zaten
-- V6 ise hiçbir şey değiştirmez.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0) Arşiv tablosu
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scald_indicator_entries_v5_archive (
  LIKE scald_indicator_entries,
  archived_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archive_reason TEXT        NOT NULL
);

-- PostgREST public şemayı açar: her tablo gibi RLS şart. Yalnızca admin
-- okur; yazma yalnızca bu migration'dan (postgres, RLS'i atlar).
ALTER TABLE scald_indicator_entries_v5_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads v5 archive" ON scald_indicator_entries_v5_archive;
CREATE POLICY "admin reads v5 archive"
  ON scald_indicator_entries_v5_archive FOR SELECT
  USING (auth_user_role() = 'admin');

-- ------------------------------------------------------------
-- 1) Yomra 2025'i düzeltmeye aç
--    Yalnızca silinecek göstergelerde hâlâ ESKİ değeri varsa: tekrar
--    çalıştırıldığında, düzeltilip yeniden onaylanmış bir yılı açmaz.
-- ------------------------------------------------------------
UPDATE scald_data_submissions
   SET status       = 'revision_requested',
       reviewed_at  = now(),
       updated_at   = now(),
       reviewer_note =
         'SCALD indicators were updated to V6 (Final Version). 23 indicators now '
         'measure something different — a different unit, a per-10,000-people or '
         'per-100-km² basis instead of a total, or a different time period — so '
         'their old values were removed. Please re-enter them in the NEW unit shown '
         'on each indicator card, then submit again. Indicators to re-enter: '
         'ES_GI5, ES_GI8, ES_CL1, ES_EF4, ES_WA5, ES_WA6, ES_WA7, ES_WA9, ES_DS2, '
         'ES_IN1, ES_IN5, ES_IN7, SS_CA3, SS_VE1, SS_VE2, SS_VE6, SS_GL3, ECS_REE3; '
         'optional: ES_LU7, ES_LU8, ES_WT8, ES_IN8, SS_SRM3. All other values are '
         'kept as entered.'
 WHERE municipality_id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'   -- Yomra Municipality
   AND year   = 2025
   AND status = 'approved'
   AND EXISTS (
     SELECT 1 FROM scald_indicator_entries e
      WHERE e.municipality_id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'
        AND e.year = 2025
        AND e.indicator_code IN (
          'ES_GI5','ES_GI8','ES_CL1','ES_EF4','ES_LU7','ES_LU8','ES_WT8',
          'ES_WA5','ES_WA6','ES_WA7','ES_WA9','ES_DS2','ES_IN1','ES_IN5',
          'ES_IN7','ES_IN8','SS_CA3','SS_VE1','SS_VE2','SS_VE6','SS_SRM3',
          'SS_GL3','ECS_REE3')
        AND e.updated_at < '2026-10-21 16:45:39+00');

-- ------------------------------------------------------------
-- 2) Kilitli olmayan yıllarda: arşivle → sil → tamamlama/rozet temizle
--    Tek ifade: ya hepsi olur ya hiçbiri.
-- ------------------------------------------------------------
WITH redefined(code, required) AS (
  VALUES
    ('ES_GI5',true),  ('ES_GI8',true),  ('ES_CL1',true),  ('ES_EF4',true),
    ('ES_WA5',true),  ('ES_WA6',true),  ('ES_WA7',true),  ('ES_WA9',true),
    ('ES_DS2',true),  ('ES_IN1',true),  ('ES_IN5',true),  ('ES_IN7',true),
    ('SS_CA3',true),  ('SS_VE1',true),  ('SS_VE2',true),  ('SS_VE6',true),
    ('SS_GL3',true),  ('ECS_REE3',true),
    ('ES_LU7',false), ('ES_LU8',false), ('ES_WT8',false), ('ES_IN8',false),
    ('SS_SRM3',false)
),
deleted AS (
  DELETE FROM scald_indicator_entries e
   USING redefined r
   WHERE e.indicator_code = r.code
     AND e.updated_at < '2026-10-21 16:45:39+00'   -- yalnızca eski (V5) değer
     AND NOT EXISTS (
       SELECT 1 FROM scald_data_submissions s
        WHERE s.municipality_id = e.municipality_id
          AND s.year            = e.year
          AND s.status IN ('submitted', 'approved'))
     -- Arşivde zaten olan bir değer, elle geri konmuştur: bilinçli bir
     -- karar, tekrar silme.
     AND NOT EXISTS (
       SELECT 1 FROM scald_indicator_entries_v5_archive a
        WHERE a.municipality_id = e.municipality_id
          AND a.year            = e.year
          AND a.indicator_code  = e.indicator_code)
  RETURNING e.*, r.required
),
-- Postgres, WITH içindeki veri değiştiren ifadeleri ana sorgu okumasa da
-- tam olarak bir kez ve sonuna kadar çalıştırır; arşiv adımı atlanamaz.
archived AS (
  INSERT INTO scald_indicator_entries_v5_archive
    (id, indicator_code, category_code, set_code, score, raw_value,
     created_at, updated_at, municipality_id, entered_by, year,
     archived_at, archive_reason)
  SELECT d.id, d.indicator_code, d.category_code, d.set_code, d.score, d.raw_value,
         d.created_at, d.updated_at, d.municipality_id, d.entered_by, d.year,
         now(), 'V6: indicator redefined (migration 024)'
    FROM deleted d
),
-- Zorunlu bir göstergesi silinen kategori artık tamamlanmamış.
-- (İsteğe bağlı göstergeler tamamlanmayı engellemez.)
uncompleted AS (
  DELETE FROM scald_category_completions c
   USING (SELECT DISTINCT municipality_id, year, category_code
            FROM deleted WHERE required) d
   WHERE c.municipality_id = d.municipality_id
     AND c.year            = d.year
     AND c.category_code   = d.category_code
  RETURNING c.municipality_id, c.year, c.category_code
)
-- Set rozeti "setin tüm kategorileri tamamlandı" demek; biri düştüyse rozet de düşer.
DELETE FROM scald_set_badges b
 USING (SELECT DISTINCT municipality_id, year, split_part(category_code, '_', 1) AS set_code
          FROM uncompleted) u
 WHERE b.municipality_id = u.municipality_id
   AND b.year            = u.year
   AND b.set_code        = u.set_code;

-- ------------------------------------------------------------
-- 3) Rapor: kilitli olduğu için dokunulmayan belediye/yıllar
-- ------------------------------------------------------------
DO $$
DECLARE
  archived_n INTEGER;
  locked_n   INTEGER;
BEGIN
  SELECT count(*) INTO archived_n
    FROM scald_indicator_entries_v5_archive
   WHERE archive_reason = 'V6: indicator redefined (migration 024)';
  RAISE NOTICE 'V6: % eski değer arşivlenip silindi (toplam, bu ve önceki çalıştırmalar).', archived_n;

  -- Gerçekten atlanan: kilitli bir yılda hâlâ duran eski değer.
  SELECT count(*) INTO locked_n
    FROM (SELECT DISTINCT e.municipality_id, e.year
            FROM scald_indicator_entries e
           WHERE e.indicator_code IN (
                   'ES_GI5','ES_GI8','ES_CL1','ES_EF4','ES_LU7','ES_LU8','ES_WT8',
                   'ES_WA5','ES_WA6','ES_WA7','ES_WA9','ES_DS2','ES_IN1','ES_IN5',
                   'ES_IN7','ES_IN8','SS_CA3','SS_VE1','SS_VE2','SS_VE6','SS_SRM3',
                   'SS_GL3','ECS_REE3')
             AND e.updated_at < '2026-10-21 16:45:39+00'
             AND EXISTS (
                   SELECT 1 FROM scald_data_submissions s
                    WHERE s.municipality_id = e.municipality_id
                      AND s.year            = e.year
                      AND s.status IN ('submitted', 'approved'))
             AND NOT EXISTS (
                   SELECT 1 FROM scald_indicator_entries_v5_archive a
                    WHERE a.municipality_id = e.municipality_id
                      AND a.year            = e.year
                      AND a.indicator_code  = e.indicator_code)) x;
  IF locked_n > 0 THEN
    RAISE NOTICE
      'V6: % belediye/yıl kilitli (submitted/approved) olduğu için DOKUNULMADI; eski '
      'tanımlı değerleri duruyor. Düzeltilmesi gerekiyorsa önce "Request changes" ile '
      'açın, sonra bu dosyayı tekrar çalıştırın.', locked_n;
  END IF;
END $$;

COMMIT;
