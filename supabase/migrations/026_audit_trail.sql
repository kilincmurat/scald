-- ============================================================
-- SCALD — Denetim kaydı (audit trail)
--
-- Kullanım koşulları "veri girişi, gönderim ve onay gibi işlemler bir
-- denetim kaydına yazılır ve hesabınıza atfedilir" diyor; ama audit_logs'a
-- yalnızca girişler (LOGIN) yazılıyordu. Değerlerin geçmişi kayboluyordu:
-- bir değerin üzerine yazılınca eskisi, düzeltme istekleri ve yeniden
-- gönderimler, yönetici değişiklikleri hiçbir yerde kalmıyordu.
--
-- Bu migration veritabanı düzeyinde (uygulamadan bağımsız) kayıt tutar:
--   scald_indicator_entries        değer girildi / değişti / silindi
--   scald_data_submissions         gönderildi, onaylandı, düzeltme istendi
--   indicator_threshold_overrides  eşik değişiklikleri
--   category_weight_overrides      ağırlık değişiklikleri
--   municipalities, universities   kurum kayıtları
--   profiles                       rol, kurum ve hesap durumu değişiklikleri
--                                  (ad / onboarding alanları değil)
--
-- Kim: auth.uid(). Oturumsuz çağrılar (service_role, migration) user_id
-- NULL ile yazılır; profiles için bunlar atlanır — admin API'si hesap
-- oluşturma ve silmeyi yöneticinin kimliğiyle kendisi kaydeder.
-- Okuma: yalnızca admin (001'deki policy). Yazma: bu trigger (SECURITY
-- DEFINER), admin API'si (service_role) ve kullanıcının kendi LOGIN kaydı.
-- 012'deki policy kullanıcının kendi adına HER satırı yazmasına izin
-- veriyordu; kayıt artık onay geçmişini gösterdiği için bu, sahte
-- "onaylandı / değer değişti" satırı eklemek demekti — daraltıldı.
-- Güncelleme ve silme policy'si yok: istemciler için kayıt yalnızca eklenir.
-- ============================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_created ON audit_logs (table_name, created_at DESC);

CREATE OR REPLACE FUNCTION audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  noise   CONSTANT text[] := ARRAY['updated_at'];
  old_j   jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) - noise END;
  new_j   jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) - noise END;
  actor   uuid := auth.uid();
  rec_id  text := COALESCE(new_j, old_j) ->> 'id';
BEGIN
  IF TG_OP = 'UPDATE' AND old_j = new_j THEN
    RETURN NULL;  -- değişmeyen satır
  END IF;

  IF TG_TABLE_NAME = 'profiles' THEN
    IF actor IS NULL THEN
      RETURN NULL;  -- admin API'si kendi kaydını yazar
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.role IS NOT DISTINCT FROM OLD.role
         AND NEW.municipality_id IS NOT DISTINCT FROM OLD.municipality_id
         AND NEW.university_id IS NOT DISTINCT FROM OLD.university_id
         AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN
        RETURN NULL;  -- ad, onboarding, parola bayrağı: erişimi etkilemez
      END IF;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    CASE WHEN actor IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = actor) THEN actor END,
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN rec_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN rec_id::uuid END,
    old_j,
    new_j
  );
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "Kullanıcı yalnızca kendi logunu yazabilir" ON audit_logs;
DROP POLICY IF EXISTS "Kullanıcı yalnızca kendi giriş kaydını yazabilir" ON audit_logs;
CREATE POLICY "Kullanıcı yalnızca kendi giriş kaydını yazabilir" ON audit_logs
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND action = 'LOGIN'
    AND table_name IS NULL
    AND record_id IS NULL
    AND old_values IS NULL
  );

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'scald_indicator_entries', 'scald_data_submissions', 'indicator_threshold_overrides',
    'category_weight_overrides', 'municipalities', 'universities', 'profiles'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_audit', t);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_row_change()',
      t || '_audit', t);
  END LOOP;
END $$;

COMMIT;
