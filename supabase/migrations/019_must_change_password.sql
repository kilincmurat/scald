-- ============================================================
-- SCALD — İlk girişte şifre değiştirme önerisi
--
-- Admin yeni kullanıcıyı geçici bir şifreyle oluşturur. Kullanıcı ilk kez
-- giriş yaptığında kendi şifresini belirlemesi önerilir (pop-up). Bunu takip
-- etmek için profiles'a must_change_password bayrağı eklenir:
--   - Admin API'si (/api/admin/users) yeni kullanıcı oluştururken TRUE yapar.
--   - Kullanıcı şifresini değiştirince FALSE olur (kendi profilini
--     güncelleyebiliyor; migration 012 WITH CHECK'i role/municipality
--     değişmediği için buna izin verir).
--
-- Mevcut kullanıcılar (ör. admin) default FALSE alır → rahatsız edilmez.
-- Tek transaction; enum yok, güvenle çalışır.
-- ============================================================

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMIT;
