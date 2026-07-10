-- ============================================================
-- SCALD — Güvenlik sertleştirmesi (canlıya çıkış öncesi)
--
-- Bu migration üç KRİTİK/orta seviye açığı kapatır:
--
--   1. [KRİTİK] Kendi kendine admin olma — kayıt (signup) sırasında
--      handle_new_user trigger'ı raw_user_meta_data->>'role' değerine
--      GÜVENİYORDU. Public anon key herkese açık olduğundan saldırgan
--      supabase.auth.signUp({ options:{ data:{ role:'admin' }}}) ile
--      doğrudan admin hesabı açabiliyordu. Artık signup DAİMA 'citizen'
--      atar; ayrıcalıklı roller yalnızca /api/admin/users (service_role)
--      üzerinden verilir.
--
--   2. [KRİTİK] Profil üzerinden rol yükseltme — profiles UPDATE
--      policy'sinde WITH CHECK yoktu. Giriş yapmış herhangi bir kullanıcı
--      UPDATE profiles SET role='admin' WHERE id=auth.uid() ile kendini
--      yükseltebiliyordu. Artık admin olmayan kullanıcı kendi satırında
--      role ve municipality_id değerlerini DEĞİŞTİREMEZ.
--
--   3. [ORTA] Denetim logu sahteciliği — audit_logs INSERT policy'si
--      WITH CHECK (true) idi; herkes başkası adına sahte log yazabiliyordu.
--      Artık yalnızca kendi user_id'si veya admin log yazabilir.
--
--   4. [DÜŞÜK] SECURITY DEFINER yardımcı fonksiyonlarına search_path
--      sabitlendi (search_path hijack sertleştirmesi).
--
-- Not: Bu dosya enum DEĞERİ eklemez, tek transaction'da güvenle çalışır.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) handle_new_user: signup DAİMA 'citizen' atasın
--    (metadata'daki role artık YOK SAYILIR)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- GÜVENLİK: role kullanıcı girdisinden ALINMAZ. Kendi kendine kayıt olan
  -- herkes 'citizen' olur. admin/data_entry/decision_maker/researcher rolleri
  -- yalnızca service_role ile (admin API'si) profiles satırı upsert edilerek
  -- verilir — o akış RLS'i bypass ettiği için bu trigger'ı ezer.
  INSERT INTO public.profiles (id, email, full_name, role, municipality_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'citizen'::public.user_role,
    NULLIF(NEW.raw_user_meta_data->>'municipality_id', '')::uuid
  );
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 2) profiles UPDATE: admin olmayan role/municipality değiştiremesin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Kullanıcı kendi profilini güncelleyebilir" ON profiles;
CREATE POLICY "Kullanıcı kendi profilini güncelleyebilir" ON profiles
  FOR UPDATE
  USING (id = auth.uid() OR auth_user_role() = 'admin')
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      id = auth.uid()
      -- Admin olmayan yalnızca profilinin görünen alanlarını (ör. full_name)
      -- güncelleyebilir; role ve municipality_id MEVCUT değerlerinde kalmalı.
      AND role = auth_user_role()
      AND municipality_id IS NOT DISTINCT FROM auth_user_municipality()
    )
  );

-- ------------------------------------------------------------
-- 3) audit_logs INSERT: yalnızca kendi adına veya admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Sistem log yazabilir" ON audit_logs;
CREATE POLICY "Kullanıcı yalnızca kendi logunu yazabilir" ON audit_logs
  FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR user_id = auth.uid()
  );

-- ------------------------------------------------------------
-- 4) SECURITY DEFINER yardımcı fonksiyonlarını sertleştir
--    (search_path sabit + fully-qualified referanslar)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_municipality()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT municipality_id FROM public.profiles WHERE id = auth.uid();
$$;

COMMIT;
