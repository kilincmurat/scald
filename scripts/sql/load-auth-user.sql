-- SCALD — auth.users yükleyicisi (cloud-dump.sh çıktısının başına eklenir).
--
-- Her hesap satırı JSON olarak gelir ve HEDEF veritabanının kabul ettiği
-- kolonlara yazılır:
--   * kaynakta olup hedefte olmayan alanlar atlanır (jsonb_populate_record),
--   * GENERATED / IDENTITY ALWAYS kolonlar (ör. GoTrue'nun confirmed_at'i)
--     veritabanına bırakılır — onlara değer yazmak "cannot insert a
--     non-DEFAULT value into column" hatasıyla tüm yüklemeyi durdurur.
-- Kolon listesi yükleme anında hedeften okunduğu için dosya, hedefteki
-- GoTrue sürümü kaynaktan eski ya da yeni olsa da çalışır.
CREATE FUNCTION pg_temp.scald_load_user(j jsonb) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO cols
    FROM pg_attribute
   WHERE attrelid = 'auth.users'::regclass AND attnum > 0 AND NOT attisdropped
     AND attgenerated = '' AND attidentity <> 'a';
  EXECUTE format('INSERT INTO auth.users (%1$s) SELECT %1$s FROM jsonb_populate_record(NULL::auth.users, $1) ON CONFLICT (id) DO NOTHING', cols)
    USING j;
END $f$;
