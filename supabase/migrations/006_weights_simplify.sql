-- ============================================================
-- SCALD — Ağırlıklandırma sadeleştirmesi
--
-- Yeni model: sadece kategori ağırlığı düzenlenir. Set'ler her zaman
-- %25 eşit ağırlıklı, indikatörler kategori içinde eşit.
--
-- Bu migration set_weight_overrides ve indicator_weight_overrides
-- tablolarını temizler; category_weight_overrides olduğu gibi kalır.
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS set_weight_overrides;
DROP TABLE IF EXISTS indicator_weight_overrides;

COMMIT;
