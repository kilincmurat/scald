-- ============================================================
-- SCALD - Yerel Yönetimler Karar Destek Ekosistemi
-- Veritabanı Şeması v1.0
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- fuzzy text search

-- ============================================================
-- ENUM TİPLERİ
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'municipality', 'citizen');
CREATE TYPE quality_label AS ENUM ('validated', 'estimated', 'pilot');
CREATE TYPE strategy_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE strategy_status AS ENUM ('proposed', 'approved', 'in_progress', 'completed', 'rejected');
CREATE TYPE cost_level AS ENUM ('low', 'medium', 'high', 'very_high');
CREATE TYPE timeframe_type AS ENUM ('short', 'medium', 'long');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE report_type AS ENUM ('annual', 'quarterly', 'strategic', 'climate');
CREATE TYPE report_status AS ENUM ('draft', 'generating', 'ready');

-- ============================================================
-- BELEDİYELER
-- ============================================================

CREATE TABLE municipalities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  name_en      TEXT,
  country      TEXT NOT NULL DEFAULT 'TR',
  region       TEXT,
  population   INTEGER,
  area_km2     DECIMAL(10, 2),
  latitude     DECIMAL(10, 6),
  longitude    DECIMAL(10, 6),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KULLANICI PROFİLLERİ (auth.users uzantısı)
-- ============================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  role            user_role NOT NULL DEFAULT 'citizen',
  municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GÖSTERGELER (15 Ana Gösterge)
-- ============================================================

CREATE TABLE indicators (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT UNIQUE NOT NULL,         -- 'ENERGY', 'WATER' vb.
  name_tr        TEXT NOT NULL,
  name_en        TEXT NOT NULL,
  layer          INTEGER NOT NULL CHECK (layer IN (1, 2, 3)),
  unit           TEXT NOT NULL,
  weight         DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  description_tr TEXT,
  description_en TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ALT GÖSTERGELER (80 Alt Gösterge)
-- ============================================================

CREATE TABLE sub_indicators (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id   UUID NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  code           TEXT UNIQUE NOT NULL,
  name_tr        TEXT NOT NULL,
  name_en        TEXT NOT NULL,
  unit           TEXT NOT NULL,
  normalization  TEXT NOT NULL DEFAULT 'per_capita', -- per_capita | per_area | absolute
  description_tr TEXT,
  description_en TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VERİ GİRİŞLERİ
-- ============================================================

CREATE TABLE indicator_data (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id   UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  indicator_id      UUID NOT NULL REFERENCES indicators(id),
  sub_indicator_id  UUID REFERENCES sub_indicators(id),
  year              INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2100),
  value             DECIMAL(15, 4),
  quality_label     quality_label NOT NULL DEFAULT 'estimated',
  source            TEXT,
  notes             TEXT,
  entered_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (municipality_id, indicator_id, sub_indicator_id, year)
);

-- ============================================================
-- EKOLOJİK AYAK İZİ SKORLARI (hesaplanmış)
-- ============================================================

CREATE TABLE ecological_scores (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id         UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  year                    INTEGER NOT NULL,
  total_score             DECIMAL(5, 2),
  energy_score            DECIMAL(5, 2),
  water_score             DECIMAL(5, 2),
  waste_score             DECIMAL(5, 2),
  transport_score         DECIMAL(5, 2),
  green_space_score       DECIMAL(5, 2),
  climate_score           DECIMAL(5, 2),
  biodiversity_score      DECIMAL(5, 2),
  air_quality_score       DECIMAL(5, 2),
  footprint_gha           DECIMAL(8, 4),   -- gHa/kişi
  carbon_tons_per_capita  DECIMAL(8, 4),   -- tCO₂/kişi
  calculated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (municipality_id, year)
);

-- ============================================================
-- İKLİM VERİLERİ (API destekli, 30 yıllık)
-- ============================================================

CREATE TABLE climate_data (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id     UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  year                INTEGER NOT NULL,
  avg_temperature     DECIMAL(5, 2),     -- °C
  max_temperature     DECIMAL(5, 2),
  min_temperature     DECIMAL(5, 2),
  total_precipitation DECIMAL(8, 2),     -- mm/yıl
  extreme_heat_days   INTEGER DEFAULT 0,
  extreme_cold_days   INTEGER DEFAULT 0,
  flood_events        INTEGER DEFAULT 0,
  drought_index       DECIMAL(5, 2),
  air_quality_pm25    DECIMAL(6, 2),     -- µg/m³
  air_quality_pm10    DECIMAL(6, 2),
  co2_concentration   DECIMAL(8, 2),    -- ppm
  source              TEXT NOT NULL DEFAULT 'API',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (municipality_id, year)
);

-- ============================================================
-- STRATEJİLER (AI DSS — min. 30 strateji)
-- ============================================================

CREATE TABLE strategies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id       UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  title_tr              TEXT NOT NULL,
  title_en              TEXT NOT NULL,
  description_tr        TEXT,
  description_en        TEXT,
  expected_outcome_tr   TEXT,
  expected_outcome_en   TEXT,
  category              TEXT NOT NULL,   -- energy|water|waste|transport|green_space|air|biodiversity
  priority              strategy_priority NOT NULL DEFAULT 'medium',
  impact_score          INTEGER CHECK (impact_score BETWEEN 0 AND 100),
  feasibility_score     INTEGER CHECK (feasibility_score BETWEEN 0 AND 100),
  cost_level            cost_level NOT NULL DEFAULT 'medium',
  timeframe             timeframe_type NOT NULL DEFAULT 'medium',
  risk_level            risk_level NOT NULL DEFAULT 'medium',
  status                strategy_status NOT NULL DEFAULT 'proposed',
  related_indicators    TEXT[],          -- gösterge kodları dizisi
  ai_generated          BOOLEAN NOT NULL DEFAULT true,
  ai_model              TEXT,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RAPORLAR (AI RT)
-- ============================================================

CREATE TABLE reports (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id          UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  report_type              report_type NOT NULL,
  year                     INTEGER,
  quarter                  INTEGER CHECK (quarter BETWEEN 1 AND 4),
  language                 TEXT NOT NULL DEFAULT 'tr',
  content                  JSONB,
  file_url                 TEXT,
  file_size_bytes          INTEGER,
  status                   report_status NOT NULL DEFAULT 'draft',
  include_charts           BOOLEAN NOT NULL DEFAULT true,
  include_recommendations  BOOLEAN NOT NULL DEFAULT true,
  generated_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DENETİM LOGU
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,        -- INSERT | UPDATE | DELETE | LOGIN | LOGOUT
  table_name  TEXT,
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- İNDEKSLER
-- ============================================================

CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_municipality ON profiles (municipality_id);
CREATE INDEX idx_indicator_data_municipality_year ON indicator_data (municipality_id, year);
CREATE INDEX idx_indicator_data_indicator ON indicator_data (indicator_id);
CREATE INDEX idx_ecological_scores_municipality_year ON ecological_scores (municipality_id, year);
CREATE INDEX idx_climate_data_municipality_year ON climate_data (municipality_id, year);
CREATE INDEX idx_strategies_municipality ON strategies (municipality_id);
CREATE INDEX idx_strategies_status ON strategies (status);
CREATE INDEX idx_reports_municipality ON reports (municipality_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_municipalities_updated_at
  BEFORE UPDATE ON municipalities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_indicator_data_updated_at
  BEFORE UPDATE ON indicator_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_strategies_updated_at
  BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- OTOMATİK PROFİL OLUŞTURMA (yeni kayıt)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecological_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Yardımcı fonksiyonlar
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_municipality()
RETURNS UUID AS $$
  SELECT municipality_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --- profiles ---
CREATE POLICY "Kullanıcı kendi profilini görebilir" ON profiles
  FOR SELECT USING (id = auth.uid() OR auth_user_role() = 'admin');

CREATE POLICY "Kullanıcı kendi profilini güncelleyebilir" ON profiles
  FOR UPDATE USING (id = auth.uid() OR auth_user_role() = 'admin');

CREATE POLICY "Admin profil oluşturabilir" ON profiles
  FOR INSERT WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "Admin profil silebilir" ON profiles
  FOR DELETE USING (auth_user_role() = 'admin');

-- --- municipalities ---
CREATE POLICY "Kimliği doğrulanmış kullanıcı belediyeleri görebilir" ON municipalities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin belediyeleri yönetebilir" ON municipalities
  FOR ALL USING (auth_user_role() = 'admin');

-- --- indicators ---
CREATE POLICY "Herkes göstergeleri görebilir" ON indicators
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin göstergeleri yönetebilir" ON indicators
  FOR ALL USING (auth_user_role() = 'admin');

-- --- sub_indicators ---
CREATE POLICY "Herkes alt göstergeleri görebilir" ON sub_indicators
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin alt göstergeleri yönetebilir" ON sub_indicators
  FOR ALL USING (auth_user_role() = 'admin');

-- --- indicator_data ---
CREATE POLICY "Kullanıcı kendi belediye verisini görebilir" ON indicator_data
  FOR SELECT USING (
    auth_user_role() = 'admin'
    OR municipality_id = auth_user_municipality()
  );

CREATE POLICY "Belediye kullanıcısı veri girebilir" ON indicator_data
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('admin', 'municipality')
    AND (auth_user_role() = 'admin' OR municipality_id = auth_user_municipality())
  );

CREATE POLICY "Belediye kullanıcısı kendi verisini güncelleyebilir" ON indicator_data
  FOR UPDATE USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'municipality' AND municipality_id = auth_user_municipality())
  );

CREATE POLICY "Admin veri silebilir" ON indicator_data
  FOR DELETE USING (auth_user_role() = 'admin');

-- --- ecological_scores ---
CREATE POLICY "Kimliği doğrulanmış kullanıcı skorları görebilir" ON ecological_scores
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin veya sistem skor yazabilir" ON ecological_scores
  FOR ALL USING (auth_user_role() = 'admin');

-- --- climate_data ---
CREATE POLICY "Kimliği doğrulanmış kullanıcı iklim verisini görebilir" ON climate_data
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin iklim verisi yönetebilir" ON climate_data
  FOR ALL USING (auth_user_role() = 'admin');

-- --- strategies ---
CREATE POLICY "Kullanıcı kendi belediye stratejilerini görebilir" ON strategies
  FOR SELECT USING (
    auth_user_role() = 'admin'
    OR municipality_id = auth_user_municipality()
  );

CREATE POLICY "Belediye kullanıcısı strateji önerebilir" ON strategies
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('admin', 'municipality')
    AND (auth_user_role() = 'admin' OR municipality_id = auth_user_municipality())
  );

CREATE POLICY "Admin veya yetkili strateji güncelleyebilir" ON strategies
  FOR UPDATE USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'municipality' AND municipality_id = auth_user_municipality())
  );

CREATE POLICY "Admin strateji silebilir" ON strategies
  FOR DELETE USING (auth_user_role() = 'admin');

-- --- reports ---
CREATE POLICY "Kullanıcı kendi belediye raporlarını görebilir" ON reports
  FOR SELECT USING (
    auth_user_role() = 'admin'
    OR municipality_id = auth_user_municipality()
  );

CREATE POLICY "Belediye kullanıcısı rapor oluşturabilir" ON reports
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('admin', 'municipality')
    AND (auth_user_role() = 'admin' OR municipality_id = auth_user_municipality())
  );

CREATE POLICY "Admin veya yetkili rapor güncelleyebilir" ON reports
  FOR UPDATE USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'municipality' AND municipality_id = auth_user_municipality())
  );

CREATE POLICY "Admin rapor silebilir" ON reports
  FOR DELETE USING (auth_user_role() = 'admin');

-- --- audit_logs ---
CREATE POLICY "Admin tüm logları görebilir" ON audit_logs
  FOR SELECT USING (auth_user_role() = 'admin');

CREATE POLICY "Sistem log yazabilir" ON audit_logs
  FOR INSERT WITH CHECK (true);
