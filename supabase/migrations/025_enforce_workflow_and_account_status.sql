-- ============================================================
-- SCALD — Onay akışı ve hesap durumu veritabanında zorunlu
--
-- 1. [YÜKSEK] Gönderim durumu geçişleri denetlenmiyordu. RLS yalnızca
--    belediyeyi kontrol ediyordu: data_entry kendi yılını doğrudan
--    status='approved' yazarak (ya da ilk kaydı 'approved' açarak) karar
--    vericiyi atlayabiliyor, karar verici gönderenin beyanını
--    değiştirebiliyordu. Artık bir trigger her rol için izinli geçişleri
--    uygular ve "kim / ne zaman" alanlarını sunucuda damgalar:
--      data_entry     : (satır yok) → submitted,  revision_requested → submitted
--      decision_maker : submitted → approved | revision_requested
--      admin, service_role (oturumsuz bakım/migration): serbest
--
-- 2. [YÜKSEK] Pasifleştirilmiş hesaplar (profiles.is_active = false)
--    her şeye erişmeye devam ediyordu. auth_user_role() ve
--    auth_user_municipality() artık pasif hesap için NULL döner; rol ya da
--    belediye tabanlı bütün policy'ler bu hesaba kapanır.
--
-- 3. [ORTA] Admin olmayan kullanıcı kendi profilinde is_active,
--    university_id ve email'i değiştirebiliyordu — pasif bir hesabın
--    kendini yeniden açması dahil (012 yalnızca role ve municipality_id'yi
--    koruyordu). Bunları da bir trigger korur.
--
-- Uygulamanın kendi akışları (gönder, yeniden gönder, onayla, düzeltme
-- iste, profil adını / onboarding alanlarını güncelle) bu kurallarla
-- aynen çalışır.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Rol yardımcıları: pasif hesap → NULL
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active;
$$;

CREATE OR REPLACE FUNCTION auth_user_municipality()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT municipality_id FROM public.profiles WHERE id = auth.uid() AND is_active;
$$;

-- ------------------------------------------------------------
-- 2) Profil: korunan alanları yalnızca admin değiştirebilir
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION profiles_guard_protected_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Oturumsuz çağrı (service_role: admin API'si, migration) ya da aktif admin.
  IF auth.uid() IS NULL OR public.auth_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.municipality_id IS DISTINCT FROM OLD.municipality_id
     OR NEW.university_id IS DISTINCT FROM OLD.university_id
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Only an administrator can change role, affiliation, account status or e-mail'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON profiles;
CREATE TRIGGER profiles_guard
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_guard_protected_columns();

-- ------------------------------------------------------------
-- 3) Gönderim durum makinesi
--    BEFORE trigger'lar RLS'ten önce çalışır; RLS (belediye eşleşmesi)
--    trigger'ın düzelttiği satır üzerinde ayrıca uygulanmaya devam eder.
--    upsert (INSERT … ON CONFLICT DO UPDATE) önce INSERT, çakışmada UPDATE
--    dalından geçer — iki dal da aşağıda denetlenir.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION scald_submissions_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r public.user_role := public.auth_user_role();
BEGIN
  IF auth.uid() IS NULL OR r = 'admin' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (NEW.municipality_id IS DISTINCT FROM OLD.municipality_id
          OR NEW.year IS DISTINCT FROM OLD.year) THEN
    RAISE EXCEPTION 'A submission cannot be moved to another municipality or year'
      USING ERRCODE = '42501';
  END IF;

  IF r = 'data_entry' THEN
    IF NEW.status <> 'submitted' THEN
      RAISE EXCEPTION 'Data-entry users can only submit a year for review'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status <> 'revision_requested' THEN
      RAISE EXCEPTION 'This year is already %; it can be resubmitted only after the decision maker asks for changes', OLD.status
        USING ERRCODE = '42501';
    END IF;
    IF NOT NEW.submitter_declaration THEN
      RAISE EXCEPTION 'The submitter''s declaration is required'
        USING ERRCODE = '42501';
    END IF;
    NEW.submitted_by := auth.uid();
    NEW.submitted_at := now();
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.approval_declaration := false;
    NEW.reviewer_note := NULL;
    RETURN NEW;
  END IF;

  IF r = 'decision_maker' THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Decision makers review submissions; they cannot create them'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.status <> 'submitted' OR NEW.status NOT IN ('approved', 'revision_requested') THEN
      RAISE EXCEPTION 'Only a submitted year can be approved or sent back for changes'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'approved' AND NOT NEW.approval_declaration THEN
      RAISE EXCEPTION 'The approver''s declaration is required'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'revision_requested' AND coalesce(btrim(NEW.reviewer_note), '') = '' THEN
      RAISE EXCEPTION 'A note saying what needs to change is required'
        USING ERRCODE = '42501';
    END IF;
    -- Gönderenin beyan ettiği, beyan ettiği gibi kalır.
    NEW.submitted_by := OLD.submitted_by;
    NEW.submitted_at := OLD.submitted_at;
    NEW.submitter_declaration := OLD.submitter_declaration;
    NEW.submitter_note := OLD.submitter_note;
    NEW.entered_count := OLD.entered_count;
    NEW.required_count := OLD.required_count;
    NEW.approval_declaration := (NEW.status = 'approved');
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Your role cannot create or change submissions'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS scald_data_submissions_guard ON scald_data_submissions;
CREATE TRIGGER scald_data_submissions_guard
  BEFORE INSERT OR UPDATE ON scald_data_submissions
  FOR EACH ROW EXECUTE FUNCTION scald_submissions_guard();

COMMIT;
