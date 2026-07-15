-- ============================================================
-- SCALD — Citizen rolünü kaldır + anonim (girişsiz) halk erişimi
--
-- Yeni model:
--   - Halk ARTIK üye olmaz. Genel istatistikleri girişsiz, anonim olarak
--     /explore sayfasından görür (şehir seçer, o şehrin genel skorlarını görür).
--   - Tüm kullanıcıları ADMIN oluşturur ve geçici şifre verir; ilgili kişiler
--     (researcher / data_entry / decision_maker) girip şifresini değiştirir.
--   - 'citizen' rolü işlevsel olarak kaldırılır: mevcut citizen hesapları
--     silinir, default rol değişir, rol atanamaz hale gelir (frontend).
--
-- NOT — enum LABEL'ı ('citizen') Postgres'te fiziksel olarak kalır: bir enum
-- değerini silmek, user_role tipini + ona bağlı ~30 RLS policy'sini yeniden
-- kurmayı gerektirir (canlı DB'de yüksek risk, işlevsel faydası yok). Hesaplar
-- silindiği, default değiştiği ve rol atanamadığı için hiçbir kullanıcı bir
-- daha 'citizen' olamaz.
--
-- !!! Operasyonel (Supabase panelinden): Authentication → Providers/Settings
--     altında "Allow new users to sign up" KAPATILMALI. Register sayfası
--     kaldırıldı; self-signup artık istenmiyor.
--
-- Tek transaction; enum eklemez/çıkarmaz, güvenle çalışır.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Mevcut citizen hesaplarını sil (profiles → auth.users cascade)
-- ------------------------------------------------------------
DELETE FROM auth.users
WHERE id IN (SELECT id FROM public.profiles WHERE role = 'citizen');

-- ------------------------------------------------------------
-- 2) Default rol: citizen → data_entry (admin ataması yine override eder)
-- ------------------------------------------------------------
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'data_entry';

-- ------------------------------------------------------------
-- 3) handle_new_user: fallback rol data_entry (signup kapalı olmalı)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, municipality_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'data_entry'::public.user_role,
    NULLIF(NEW.raw_user_meta_data->>'municipality_id', '')::uuid
  );
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 4) Anonim halk erişimi (yalnızca 'anon' rolü):
--    pilot belediyelerin gösterge verisi + ağırlıklar okunabilir.
--    'authenticated' izolasyonu DEĞİŞMEZ (bu policy'ler yalnızca anon'a).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "anon reads pilot entries" ON scald_indicator_entries;
CREATE POLICY "anon reads pilot entries"
  ON scald_indicator_entries FOR SELECT TO anon
  USING (municipality_id IN (SELECT id FROM municipalities WHERE is_pilot));

DROP POLICY IF EXISTS "anon reads category weights" ON category_weight_overrides;
CREATE POLICY "anon reads category weights"
  ON category_weight_overrides FOR SELECT TO anon
  USING (true);

-- municipalities: pilot satırların anon okunması migration 004'te zaten var
-- ("public reads pilot municipalities" — is_pilot = TRUE).

COMMIT;
