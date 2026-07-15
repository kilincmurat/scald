-- ============================================================
-- SCALD — Demo belediyesini gezilebilir yap + İngilizce isimler
--
--   1. "pilot" ayrımı işlevsel olarak kalkıyor: tüm aktif belediyeler
--      halka açık (is_pilot = TRUE). Demo Municipality de açılır ki UI'dan
--      gezilebilsin ve /explore'da örnek veriyle görünsün.
--   2. Belediye isimleri İngilizceye çevrilir (arayüz tek dilli).
--
-- Not: is_pilot kolonu şimdilik "halka açık / aktif partner" anlamında
-- kalıyor; anon RLS (migration 014) bu kolonu kullandığı için kaldırılmadı.
--
-- Tek transaction; güvenle çalışır.
-- ============================================================

BEGIN;

-- 1) Demo belediyesini halka aç (gezilebilir + anon okunur)
UPDATE municipalities SET is_pilot = TRUE, is_active = TRUE
WHERE id = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0';

-- 2) İngilizce isimler (frontend MUNICIPALITIES ile eşleşir)
UPDATE municipalities SET name = 'Trabzon Metropolitan Municipality' WHERE id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
UPDATE municipalities SET name = 'Ortahisar Municipality'            WHERE id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
UPDATE municipalities SET name = 'Yomra Municipality'                WHERE id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
UPDATE municipalities SET name = 'Novaci Municipality'               WHERE id = 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3';
UPDATE municipalities SET name = 'Kavala Municipality'               WHERE id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
UPDATE municipalities SET name = 'Tulcea Municipality'               WHERE id = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

COMMIT;
