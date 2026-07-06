-- ============================================================
-- SCALD — 4 rollü RBAC için user_role enum genişletmesi
--
-- ÖNEMLİ: Bu dosya tek başına ve DİĞER migration'lardan AYRI bir
-- çalıştırmada uygulanmalı. Postgres, ALTER TYPE ADD VALUE'yu aynı
-- transaction içinde yeni değeri KULLANAN başka bir statement ile
-- birlikte çalıştıramıyor.
--
-- Uygulama sırası:
--   1) Supabase SQL Editor'da SADECE bu dosyayı çalıştır → Run.
--   2) Yeni bir sekme aç veya sayfayı yenile.
--   3) 004_role_scoping.sql'i ayrı bir Run'da çalıştır.
--
-- Doğrulama:
--   SELECT unnest(enum_range(NULL::user_role));
--   → 5 satır dönmeli: admin, municipality, data_entry, decision_maker, citizen
--   (municipality eski değer, Postgres'te enum'dan silinemiyor — sorun değil)
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'data_entry';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'decision_maker';

COMMIT;
