-- ============================================================
-- SCALD — Onay silsilesi: revizyon isteği + onaylanan veriyi kilitleme
--
-- Yeni akış:
--   1. data_entry veriyi girer → "Submit for review" (status='submitted').
--   2. decision_maker ya ONAYLAR (status='approved') ya da REVİZYON İSTER
--      (status='revision_requested', reviewer_note = istenen değişiklik).
--   3. Revizyon istenirse veri tekrar data_entry'ye açılır; düzeltip yeniden
--      gönderir (status='submitted').
--   4. Onaylanınca (approved) o (belediye, yıl) verisi data_entry ve
--      decision_maker tarafından ARTIK DEĞİŞTİRİLEMEZ. Yalnızca admin
--      müdahale edebilir.
--
-- KİLİT MANTIĞI (DB düzeyinde, RLS ile — asıl güvenlik burada):
--   Bir (belediye, yıl) "kilitli" = o yıl için status IN ('submitted','approved')
--   bir submission satırı varsa. Kilitliyken data_entry, ilgili yılın
--   scald_indicator_entries / completions / badges satırlarını yazamaz.
--   'revision_requested' veya satır yoksa → kilitli değil (düzenlenebilir).
--   admin her zaman yazabilir.
--
--   Kilit, mevcut permissive policy'leri BOZMADAN, RESTRICTIVE policy olarak
--   eklenir (permissive'lerle AND'lenir; SELECT'e dokunmaz → okuma serbest).
--
-- Enum: 'revision_requested' EKLENİR ama bu migration içinde KULLANILMAZ
--   (policy'ler yalnızca mevcut 'submitted'/'approved'e bakar), bu yüzden
--   tek transaction'da güvenle çalışır — 003/011'deki iki-aşama GEREKMEZ.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Yeni submission durumu: revision_requested
-- ------------------------------------------------------------
ALTER TYPE scald_submission_status ADD VALUE IF NOT EXISTS 'revision_requested';

-- ------------------------------------------------------------
-- 2) Kilit yardımcı fonksiyonu (SECURITY DEFINER — RLS'i bypass ederek
--    submissions'a bakar, döngü/recursion olmaz)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION scald_year_locked(p_muni uuid, p_year int)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM scald_data_submissions
    WHERE municipality_id = p_muni
      AND year = p_year
      AND status IN ('submitted', 'approved')
  );
$$;

-- ------------------------------------------------------------
-- 3) RESTRICTIVE kilit policy'leri (INSERT/UPDATE/DELETE — SELECT hariç)
--    admin bypass; diğerleri için kilitliyken yazma reddedilir.
-- ------------------------------------------------------------

-- scald_indicator_entries
DROP POLICY IF EXISTS "lock entries when submitted or approved (ins)" ON scald_indicator_entries;
CREATE POLICY "lock entries when submitted or approved (ins)"
  ON scald_indicator_entries AS RESTRICTIVE FOR INSERT
  WITH CHECK (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

DROP POLICY IF EXISTS "lock entries when submitted or approved (upd)" ON scald_indicator_entries;
CREATE POLICY "lock entries when submitted or approved (upd)"
  ON scald_indicator_entries AS RESTRICTIVE FOR UPDATE
  USING (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year))
  WITH CHECK (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

DROP POLICY IF EXISTS "lock entries when submitted or approved (del)" ON scald_indicator_entries;
CREATE POLICY "lock entries when submitted or approved (del)"
  ON scald_indicator_entries AS RESTRICTIVE FOR DELETE
  USING (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

-- scald_category_completions
DROP POLICY IF EXISTS "lock completions when submitted or approved (ins)" ON scald_category_completions;
CREATE POLICY "lock completions when submitted or approved (ins)"
  ON scald_category_completions AS RESTRICTIVE FOR INSERT
  WITH CHECK (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

DROP POLICY IF EXISTS "lock completions when submitted or approved (upd)" ON scald_category_completions;
CREATE POLICY "lock completions when submitted or approved (upd)"
  ON scald_category_completions AS RESTRICTIVE FOR UPDATE
  USING (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year))
  WITH CHECK (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

DROP POLICY IF EXISTS "lock completions when submitted or approved (del)" ON scald_category_completions;
CREATE POLICY "lock completions when submitted or approved (del)"
  ON scald_category_completions AS RESTRICTIVE FOR DELETE
  USING (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

-- scald_set_badges
DROP POLICY IF EXISTS "lock badges when submitted or approved (ins)" ON scald_set_badges;
CREATE POLICY "lock badges when submitted or approved (ins)"
  ON scald_set_badges AS RESTRICTIVE FOR INSERT
  WITH CHECK (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

DROP POLICY IF EXISTS "lock badges when submitted or approved (upd)" ON scald_set_badges;
CREATE POLICY "lock badges when submitted or approved (upd)"
  ON scald_set_badges AS RESTRICTIVE FOR UPDATE
  USING (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year))
  WITH CHECK (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

DROP POLICY IF EXISTS "lock badges when submitted or approved (del)" ON scald_set_badges;
CREATE POLICY "lock badges when submitted or approved (del)"
  ON scald_set_badges AS RESTRICTIVE FOR DELETE
  USING (auth_user_role() = 'admin' OR NOT scald_year_locked(municipality_id, year));

-- ------------------------------------------------------------
-- 4) submissions UPDATE policy'sini durum makinesine göre sıkılaştır
--    - data_entry: onaylı OLMAYAN satırı güncelleyebilir (revizyondan
--      yeniden gönderme). Onaylı satıra dokunamaz.
--    - decision_maker: yalnızca 'submitted' satırı güncelleyebilir
--      (onaylar veya revizyon ister). Onaylı satırı geri açamaz.
--    - admin: her şey.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "muni users update own submissions" ON scald_data_submissions;
CREATE POLICY "muni users update own submissions"
  ON scald_data_submissions FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() = 'data_entry'
      AND municipality_id = auth_user_municipality()
      AND status <> 'approved'
    )
    OR (
      auth_user_role() = 'decision_maker'
      AND municipality_id = auth_user_municipality()
      AND status = 'submitted'
    )
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      auth_user_role() IN ('data_entry', 'decision_maker')
      AND municipality_id = auth_user_municipality()
    )
  );

COMMIT;
