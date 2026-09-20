-- ============================================================
-- SCALD — Anonim /explore erişimini yalnızca ONAYLANMIŞ veriye daralt
--
-- Sorun:
--   014'teki "anon reads pilot entries" policy'si, pilot belediyelerin
--   TÜM gösterge girdilerini onay durumundan bağımsız olarak anon rolüne
--   açıyordu. Bir belediye veri girişi yaparken (status: taslak / submitted /
--   revision_requested) o yılın yarım skorları anında girişsiz /explore
--   sayfasında görünüyordu.
--
--   Bu, uygulamanın kendi kuralıyla çelişiyor: sonuçlar karar verici
--   onayına kadar gizli kalmalı (bkz. 018 lock policy'leri).
--
-- Çözüm:
--   anon yalnızca, o (belediye, yıl) için scald_data_submissions'ta
--   status='approved' bir satır varsa girdileri okuyabilir.
--
-- Not — neden SECURITY DEFINER fonksiyon:
--   Policy USING ifadesindeki alt sorgular, sorguyu çalıştıran rolün
--   yetkisiyle ve hedef tablonun RLS'i uygulanarak değerlendirilir.
--   anon'un scald_data_submissions üzerinde policy'si yok (ve olmamalı —
--   gönderen/onaylayan kişi ve notlar iç veridir), bu yüzden düz bir
--   alt sorgu her zaman boş dönerdi. Fonksiyon RLS'i atlar ama dışarıya
--   yalnızca tek bir boolean sızdırır.
--
-- Tek transaction; geri alınabilir (aşağıdaki DROP/CREATE ile 014 hâline).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_year_approved(p_municipality_id UUID, p_year INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.scald_data_submissions s
     WHERE s.municipality_id = p_municipality_id
       AND s.year            = p_year
       AND s.status          = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_year_approved(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_year_approved(UUID, INTEGER) TO anon, authenticated;

-- ------------------------------------------------------------
-- Anon okuma: pilot belediye VE onaylanmış yıl
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "anon reads pilot entries" ON scald_indicator_entries;
DROP POLICY IF EXISTS "anon reads approved pilot entries" ON scald_indicator_entries;
CREATE POLICY "anon reads approved pilot entries"
  ON scald_indicator_entries FOR SELECT TO anon
  USING (
    municipality_id IN (SELECT id FROM municipalities WHERE is_pilot)
    AND public.is_year_approved(municipality_id, year)
  );

COMMIT;
