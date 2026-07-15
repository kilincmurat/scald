-- ============================================================
-- SCALD — Kullanılmayan enum rollerini kaldır: 'municipality' + 'citizen'
--
-- user_role şu an 6 değer taşıyor:
--   admin, municipality, citizen, data_entry, decision_maker, researcher
-- Bunlardan 'municipality' ve 'citizen' ESKİ/ÖLÜ değerler:
--   - Hiçbir profil bu rollerde değil (004 municipality→data_entry yaptı,
--     014 citizen hesaplarını sildi), frontend bunları atayamıyor.
--   - Yeni kullanıcı da asla bu rollere düşemez (default data_entry).
-- Sonuç: tamamen kozmetik artık. Bu migration onları fiziksel olarak siler.
--
-- NEDEN BU KADAR İŞ GEREKİYOR?
--   Postgres'te bir enum'dan DEĞER SİLİNEMEZ (ALTER TYPE ... DROP VALUE yok).
--   Tipin yeniden kurulması gerekir. Ama user_role'e bağımlılıklar var:
--     • profiles.role kolonu (tip)
--     • auth_user_role() fonksiyonu (dönüş tipi)
--     • auth_user_role()'u çağıran TÜM RLS policy'leri
--   Bu yüzden: policy'leri yedekle → düşür → fonksiyonu düşür → enum'u
--   yeniden kur → fonksiyonu geri kur → policy'leri geri yükle.
--
-- GÜVENLİK:
--   • Tek transaction — ya tamamı uygulanır ya hiçbiri (yarıda kalmaz).
--   • Policy'ler pg_policies'ten OLDUĞU GİBİ yedeklenip geri yüklenir
--     (elle yeniden yazma yok → yanlış transkripsiyon riski yok).
--   • Sonda policy sayısı doğrulanır; eksikse RAISE EXCEPTION → rollback.
--   • enum etiketleri sonda doğrulanır; beklenenden farklıysa → rollback.
--   • Tek engel: 001'den kalan indicator_data/strategies/reports tablolarının
--     INSERT/UPDATE policy'leri hâlâ 'municipality' literal'i içeriyor. Bunlar
--     ölü dal (o rolde kullanıcı yok); enum'u kurmadan ÖNCE bu dalları
--     temizliyoruz (davranış değişmez — etkin olarak yalnızca admin kalır).
--
-- Bu migration enum DEĞERİ EKLEMEZ; 003/011'deki iki-aşamalı çalıştırma
-- GEREKMEZ. Supabase SQL Editor'da TEK Run yeterli.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0) Savunma amaçlı: ölü rollerde profil kalmasın
-- ------------------------------------------------------------
UPDATE public.profiles
SET role = 'data_entry'
WHERE role::text IN ('municipality', 'citizen');

-- ------------------------------------------------------------
-- 1) Ölü 'municipality' dallarını içeren 001 legacy policy'lerini
--    literalsiz hale getir (indicator_data / strategies / reports).
--    'municipality' rolünde kullanıcı olmadığından bu, etkin yetkiyi
--    değiştirmez — yalnızca ölü dalı kaldırır (geriye admin kalır).
-- ------------------------------------------------------------
-- indicator_data
DROP POLICY IF EXISTS "Belediye kullanıcısı veri girebilir" ON indicator_data;
CREATE POLICY "Belediye kullanıcısı veri girebilir" ON indicator_data
  FOR INSERT WITH CHECK (auth_user_role() = 'admin');

DROP POLICY IF EXISTS "Belediye kullanıcısı kendi verisini güncelleyebilir" ON indicator_data;
CREATE POLICY "Belediye kullanıcısı kendi verisini güncelleyebilir" ON indicator_data
  FOR UPDATE USING (auth_user_role() = 'admin');

-- strategies
DROP POLICY IF EXISTS "Belediye kullanıcısı strateji önerebilir" ON strategies;
CREATE POLICY "Belediye kullanıcısı strateji önerebilir" ON strategies
  FOR INSERT WITH CHECK (auth_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin veya yetkili strateji güncelleyebilir" ON strategies;
CREATE POLICY "Admin veya yetkili strateji güncelleyebilir" ON strategies
  FOR UPDATE USING (auth_user_role() = 'admin');

-- reports
DROP POLICY IF EXISTS "Belediye kullanıcısı rapor oluşturabilir" ON reports;
CREATE POLICY "Belediye kullanıcısı rapor oluşturabilir" ON reports
  FOR INSERT WITH CHECK (auth_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin veya yetkili rapor güncelleyebilir" ON reports;
CREATE POLICY "Admin veya yetkili rapor güncelleyebilir" ON reports
  FOR UPDATE USING (auth_user_role() = 'admin');

-- ------------------------------------------------------------
-- 2) public şemasındaki TÜM policy'leri (tam CREATE cümlesi olarak) yedekle
-- ------------------------------------------------------------
DROP TABLE IF EXISTS _scald017_pol;
CREATE TEMP TABLE _scald017_pol AS
SELECT
  schemaname,
  tablename,
  policyname,
  format(
    'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
    policyname, schemaname, tablename,
    permissive,                    -- PERMISSIVE | RESTRICTIVE
    cmd,                           -- SELECT | INSERT | UPDATE | DELETE | ALL
    array_to_string(roles, ', '),  -- authenticated | anon | public | ...
    CASE WHEN qual       IS NOT NULL THEN format(' USING (%s)', qual)       ELSE '' END,
    CASE WHEN with_check IS NOT NULL THEN format(' WITH CHECK (%s)', with_check) ELSE '' END
  ) AS create_stmt
FROM pg_policies
WHERE schemaname = 'public';

-- ------------------------------------------------------------
-- 3) Yedeklenen policy'leri düşür (auth_user_role bağımlılığını kaldır)
-- ------------------------------------------------------------
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM _scald017_pol LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4) user_role dönüş tipli yardımcı fonksiyonu düşür
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.auth_user_role();

-- ------------------------------------------------------------
-- 5) Enum'u yeniden kur (yalnızca 4 gerçek rol)
-- ------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('admin', 'data_entry', 'decision_maker', 'researcher');
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE user_role USING role::text::user_role;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'data_entry';
DROP TYPE user_role_old;

-- ------------------------------------------------------------
-- 6) Yardımcı fonksiyonu geri kur (012 ile birebir aynı, yeni tip)
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

-- ------------------------------------------------------------
-- 7) Policy'leri geri yükle
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT create_stmt FROM _scald017_pol LOOP
    EXECUTE r.create_stmt;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 8) Doğrulama (başarısızsa transaction geri alınır)
-- ------------------------------------------------------------
DO $$
DECLARE cap int; res int; vals text;
BEGIN
  SELECT count(*) INTO cap FROM _scald017_pol;
  SELECT count(*) INTO res FROM pg_policies WHERE schemaname = 'public';
  IF cap <> res THEN
    RAISE EXCEPTION 'SCALD 017: policy geri yükleme uyuşmazlığı (yedek %, geri %)', cap, res;
  END IF;

  SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) INTO vals
  FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'user_role';
  IF vals <> 'admin,data_entry,decision_maker,researcher' THEN
    RAISE EXCEPTION 'SCALD 017: beklenmeyen user_role etiketleri: %', vals;
  END IF;
END $$;

DROP TABLE IF EXISTS _scald017_pol;

COMMIT;
