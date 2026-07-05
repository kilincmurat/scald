-- ============================================================
-- SCALD — 4 rollü RBAC için user_role enum genişletmesi
--
-- Bu dosya tek başına çalışmalı çünkü ALTER TYPE ADD VALUE
-- aynı transaction içinde yeni değeri KULLANAN başka bir statement
-- ile beraber çalıştırılamıyor.
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'data_entry';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'decision_maker';
