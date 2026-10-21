-- ============================================================
-- SCALD — Gösterge seti V6 (Final): Smart Infrastructure kodları
--
-- V6'da "SMART INFRASTRUCTURE" kategorisinin göstergeleri ES_SI1..ES_SI8
-- yerine ES_IN1..ES_IN8 olarak kodlandı (kategori kodu zaten ES_IN idi;
-- V5'te kategori ES_IN, göstergeleri ES_SI* diye tutarsızdı).
--
-- Uygulama tanımı (apps/web/src/lib/scald-indicators.json) artık ES_IN*
-- kullanıyor. Veritabanında ES_SI* olarak kalan satırlar hiçbir göstergeyle
-- eşleşmez: veri ekranında boş görünür, skorlara katılmaz, kategori
-- tamamlanmış sayılmaz. Bu migration onları yeniden adlandırır.
--
-- Etkilenen tablolar (indicator_code tutan, hâlâ var olan tablolar):
--   scald_indicator_entries        — UNIQUE (municipality_id, indicator_code, year)
--   indicator_threshold_overrides  — indicator_code UNIQUE
-- (indicator_weight_overrides 006'da silindi.)
--
-- Çakışma: aynı belediye+yıl için hem ES_SIn hem ES_INn varsa yeniden
-- adlandırma UNIQUE kısıtına takılır. Hangisinin doğru olduğunu migration
-- bilemez; sessizce birini silmek yerine DURUR ve satırları listeler.
--
-- Tekrar çalıştırılabilir: ikinci kez ES_SI* bulamaz, hiçbir şey yapmaz.
--
-- updated_at KORUNUR. Kod değişikliği değeri değiştirmez; 024 eski (V5) ile
-- yeni (V6) değeri updated_at'e bakarak ayırır. Tetikleyici burada now()
-- yazsaydı ES_IN1/5/7/8'in V5 değerleri yeni girilmiş sanılıp silinmezdi.
-- ============================================================

BEGIN;

DO $$
DECLARE
  clash_count INTEGER;
  ov_count    INTEGER;
BEGIN
  SELECT count(*) INTO clash_count
    FROM scald_indicator_entries si
    JOIN scald_indicator_entries ni
      ON ni.municipality_id = si.municipality_id
     AND ni.year            = si.year
     AND ni.indicator_code  = regexp_replace(si.indicator_code, '^ES_SI', 'ES_IN')
   WHERE si.indicator_code LIKE 'ES\_SI%';

  IF clash_count > 0 THEN
    RAISE EXCEPTION
      'V6 kod geçişi durduruldu: % satırda aynı belediye/yıl için hem ES_SI* hem ES_IN* var. '
      'Hangisinin tutulacağına karar verip fazlasını silin, sonra tekrar çalıştırın. '
      'Sorgu: SELECT municipality_id, year, indicator_code FROM scald_indicator_entries '
      'WHERE indicator_code ~ ''^ES_(SI|IN)'' ORDER BY 1,2,3;', clash_count;
  END IF;

  SELECT count(*) INTO ov_count
    FROM indicator_threshold_overrides
   WHERE indicator_code LIKE 'ES\_SI%';
  IF ov_count > 0 THEN
    RAISE NOTICE
      '% eşik override''ı ES_SI* koduyla duruyor, ES_IN* olarak taşınıyor. '
      'Bu override''lar V5 eşiklerine göre girilmiş olabilir ve V6 eşiklerini gölgeler — '
      'Admin → Indicators ekranından gözden geçirin.', ov_count;
  END IF;
END $$;

ALTER TABLE scald_indicator_entries DISABLE TRIGGER trg_scald_entries_updated_at;

UPDATE scald_indicator_entries
   SET indicator_code = regexp_replace(indicator_code, '^ES_SI', 'ES_IN')
 WHERE indicator_code LIKE 'ES\_SI%';

ALTER TABLE scald_indicator_entries ENABLE TRIGGER trg_scald_entries_updated_at;

UPDATE indicator_threshold_overrides
   SET indicator_code = regexp_replace(indicator_code, '^ES_SI', 'ES_IN')
 WHERE indicator_code LIKE 'ES\_SI%';

COMMIT;
