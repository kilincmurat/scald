-- ============================================================
-- SCALD — İlk giriş tanıtım turu (onboarding) durumu
--
-- Admin HARİÇ tüm kullanıcı tipleri (data_entry / decision_maker /
-- researcher) ilk girişte sekmelerin ne işe yaradığını anlatan bir turu
-- bir defaya mahsus görür. Bittiğinde/atlandığında tekrar çıkmaz.
--   - tour_completed_at NULL  → tur henüz gösterilmedi.
--   - now() olunca            → bir daha çıkmaz.
--
-- Tek transaction; enum yok, güvenle çalışır.
-- ============================================================

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tour_completed_at TIMESTAMPTZ;

COMMIT;
