-- ============================================================
-- SCALD — Researcher rolü (read-only, çok belediye)
--
-- Researcher:
-- - Herhangi bir belediyeye bağlı değil (municipality_id NULL olabilir).
-- - Tüm belediyelerin skor verisini okuyabilir.
-- - Ancak veri girişi yapamaz, submission/approval işlem edemez,
--   feedback göremez.
--
-- RLS: Sadece SELECT eklendi. INSERT/UPDATE/DELETE için researcher'a
-- yeni policy YOK — dolayısıyla yazma reddedilir.
-- ============================================================

-- ALTER TYPE ADD VALUE bir transaction bloğu içinde çağrılıp aynı
-- transaction'da referans edilemez; bu yüzden standalone çalıştırıyoruz.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'researcher';

-- ------------------------------------------------------------
-- Read-only policies for researcher
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "researcher reads all entries" ON scald_indicator_entries;
CREATE POLICY "researcher reads all entries"
  ON scald_indicator_entries FOR SELECT
  USING (auth_user_role() = 'researcher');

DROP POLICY IF EXISTS "researcher reads all completions" ON scald_category_completions;
CREATE POLICY "researcher reads all completions"
  ON scald_category_completions FOR SELECT
  USING (auth_user_role() = 'researcher');

DROP POLICY IF EXISTS "researcher reads all badges" ON scald_set_badges;
CREATE POLICY "researcher reads all badges"
  ON scald_set_badges FOR SELECT
  USING (auth_user_role() = 'researcher');

DROP POLICY IF EXISTS "researcher reads all submissions" ON scald_data_submissions;
CREATE POLICY "researcher reads all submissions"
  ON scald_data_submissions FOR SELECT
  USING (auth_user_role() = 'researcher');

DROP POLICY IF EXISTS "researcher reads all weights" ON category_weight_overrides;
CREATE POLICY "researcher reads all weights"
  ON category_weight_overrides FOR SELECT
  USING (auth_user_role() = 'researcher');

-- Municipalities zaten public read; profiles kendi + admin okur.
-- Feedback erişimi verilmedi — gizlilik gereği.
