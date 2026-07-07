-- ============================================================
-- SCALD — handle_new_user trigger fonksiyonuna search_path fix'i
--
-- SORUN: Supabase Cloud'da SECURITY DEFINER fonksiyonlar public
-- schema'ya doğal erişebiliyor çünkü search_path ayarları farklı.
-- Self-hosted Supabase'de trigger fonksiyonu 'profiles' tablosunu
-- bulamıyor ve auth.users insert'i "relation profiles does not exist"
-- hatasıyla başarısız oluyor. Sonuç: kullanıcı kaydı olmaz.
--
-- ÇÖZÜM: Fonksiyona SET search_path = public, auth ekleyerek her iki
-- ortamda da doğru çalışmasını garantile. Aynı zamanda profiles
-- referansını public.profiles ile fully-qualified yaparak
-- güvenlik altına al.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, municipality_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'citizen'::public.user_role),
    NULLIF(NEW.raw_user_meta_data->>'municipality_id', '')::uuid
  );
  RETURN NEW;
END;
$$;

COMMIT;
