-- ============================================================
-- SCALD Data Entry (25 kategori · 188 alt-gösterge)
-- Kullanıcı bazlı skor + raw value + kategori tamamlama + set rozetleri
-- ============================================================

-- ------------------------------------------------------------
-- 1) SCALD INDICATOR ENTRIES
-- ------------------------------------------------------------
CREATE TABLE scald_indicator_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_code  TEXT NOT NULL,
  category_code   TEXT NOT NULL,
  set_code        TEXT NOT NULL,
  score           SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 5),
  raw_value       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, indicator_code)
);

CREATE INDEX idx_scald_entries_user ON scald_indicator_entries (user_id);
CREATE INDEX idx_scald_entries_user_category ON scald_indicator_entries (user_id, category_code);
CREATE INDEX idx_scald_entries_user_set ON scald_indicator_entries (user_id, set_code);

CREATE TRIGGER trg_scald_entries_updated_at
  BEFORE UPDATE ON scald_indicator_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE scald_indicator_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own entries"
  ON scald_indicator_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own entries"
  ON scald_indicator_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own entries"
  ON scald_indicator_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own entries"
  ON scald_indicator_entries FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 2) CATEGORY COMPLETIONS
-- ------------------------------------------------------------
CREATE TABLE scald_category_completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_code  TEXT NOT NULL,
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_code)
);

CREATE INDEX idx_scald_completions_user ON scald_category_completions (user_id);

ALTER TABLE scald_category_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own completions"
  ON scald_category_completions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own completions"
  ON scald_category_completions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own completions"
  ON scald_category_completions FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3) SET BADGES
-- ------------------------------------------------------------
CREATE TABLE scald_set_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_code   TEXT NOT NULL,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, set_code)
);

CREATE INDEX idx_scald_badges_user ON scald_set_badges (user_id);

ALTER TABLE scald_set_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own badges"
  ON scald_set_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own badges"
  ON scald_set_badges FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own badges"
  ON scald_set_badges FOR DELETE
  USING (user_id = auth.uid());
