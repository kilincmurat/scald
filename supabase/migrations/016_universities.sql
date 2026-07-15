-- ============================================================
-- SCALD — Universities (araştırmacıların bağlı olduğu kurum)
--
-- Model:
--   - Researcher (araştırmacı) bir BELEDİYEYE değil, bir ÜNİVERSİTEYE bağlıdır.
--   - data_entry / decision_maker → belediyeye bağlı (municipality_id).
--   - researcher                  → üniversiteye bağlı (university_id).
--   - admin                       → hiçbir kuruma bağlı DEĞİL (ikisi de NULL).
--
--   Üniversiteleri admin, Admin Panel → Universities ekranından tanımlar.
--
-- Tek transaction; enum eklemez/çıkarmaz, güvenle çalışır.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) universities tablosu
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  name_en     TEXT,
  country     TEXT NOT NULL DEFAULT 'TR',
  city        TEXT,
  website     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_universities_updated_at ON universities;
CREATE TRIGGER trg_universities_updated_at
  BEFORE UPDATE ON universities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 2) profiles.university_id
-- ------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_university ON profiles (university_id);

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

-- Giriş yapmış herkes üniversite listesini okuyabilir (researcher'ın kurum
-- adını göstermek + admin'in atama açılır listesini doldurmak için).
DROP POLICY IF EXISTS "authenticated reads universities" ON universities;
CREATE POLICY "authenticated reads universities"
  ON universities FOR SELECT TO authenticated
  USING (true);

-- Yalnızca admin üniversiteleri yönetebilir.
DROP POLICY IF EXISTS "admin manages universities" ON universities;
CREATE POLICY "admin manages universities"
  ON universities FOR ALL TO authenticated
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- ------------------------------------------------------------
-- 4) handle_new_user: metadata'dan university_id'yi de taşı
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, municipality_id, university_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'data_entry'::public.user_role,
    NULLIF(NEW.raw_user_meta_data->>'municipality_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'university_id', '')::uuid
  );
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 5) Admin kurumsuz olsun: mevcut admin profillerinden belediye/üniversite temizle
-- ------------------------------------------------------------
UPDATE profiles
SET municipality_id = NULL, university_id = NULL
WHERE role = 'admin'
  AND (municipality_id IS NOT NULL OR university_id IS NOT NULL);

-- ------------------------------------------------------------
-- 6) Host üniversiteyi seed'le (KTÜ). Diğerlerini admin panelden ekler.
--    Idempotent: aynı isim varsa tekrar eklemez.
-- ------------------------------------------------------------
INSERT INTO universities (name, name_en, country, city, website)
SELECT 'Karadeniz Technical University', 'Karadeniz Technical University', 'TR', 'Trabzon', 'https://www.ktu.edu.tr'
WHERE NOT EXISTS (
  SELECT 1 FROM universities WHERE name = 'Karadeniz Technical University'
);

COMMIT;
