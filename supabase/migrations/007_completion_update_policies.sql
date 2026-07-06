-- ============================================================
-- SCALD — Eksik UPDATE RLS policy'leri
--
-- 004 numaralı migration'da scald_category_completions ve scald_set_badges
-- için INSERT / SELECT / DELETE policy'leri vardı ama UPDATE unutulmuştu.
-- Supabase upsert() varsayılan davranışta ON CONFLICT DO UPDATE üretir;
-- UPDATE policy'si eksikse mevcut satırın raw_value/score güncellenmesi
-- sessizce reddedilir. Bu migration eksik policy'leri ekler.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "data_entry updates completions" ON scald_category_completions;
CREATE POLICY "data_entry updates completions"
  ON scald_category_completions FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

DROP POLICY IF EXISTS "data_entry updates badges" ON scald_set_badges;
CREATE POLICY "data_entry updates badges"
  ON scald_set_badges FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  )
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (auth_user_role() = 'data_entry' AND municipality_id = auth_user_municipality())
  );

COMMIT;
