-- ============================================================
-- SCALD — Kullanım koşulları / kabul onayı (bir defaya mahsus)
--
-- Her kullanıcı sisteme ilk girişinde platform kullanım koşullarını
-- onaylar. Onay ZAMANI kaydedilir (uyum/denetim için — EU projesi).
--   - terms_accepted_at NULL  → henüz onaylamadı → onay pop-up'ı çıkar.
--   - onaylayınca now() olur   → bir daha çıkmaz.
--
-- Kullanıcı kendi profilini güncelleyebiliyor (migration 012 WITH CHECK'i
-- role/municipality değişmediği için buna izin verir).
--
-- Tek transaction; enum yok, güvenle çalışır.
-- ============================================================

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

COMMIT;
