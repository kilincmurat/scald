#!/usr/bin/env bash
# ============================================================
# SCALD — Supabase Cloud'dan veri yedeği al (self-hosted'a taşımak için)
#
#   CLOUD_URL="postgresql://postgres:<sifre>@db.<ref>.supabase.co:5432/postgres" \
#     ./scripts/cloud-dump.sh
#
# Bağlantı adresi: Supabase Dashboard → Settings → Database →
# Connection string → URI. "Session pooler" değil, mümkünse
# "Direct connection" seçin; IPv4 sorunu çıkarsa Session pooler da olur
# (transaction pooler / port 6543 pg_dump ile ÇALIŞMAZ).
#
# Üretilen iki dosya RUNBOOK 5.2'de bu sırayla yüklenir:
#   scald-auth-users.sql   → hesaplar (önce; profiles'ın FK'si buna bağlı)
#   scald-public-data.sql  → uygulama verisi
#
# Şema dump'a DAHİL DEĞİL: hedef veritabanının şeması migrate.sh ile
# kurulur, buradan yalnızca satırlar taşınır. Böylece cloud'da elle
# yapılmış, migration'a yazılmamış bir değişiklik varsa sessizce
# taşınmaz — fark ederiz.
#
# Neden COPY değil de INSERT ... ON CONFLICT DO NOTHING:
# migration'lar belediyeleri, üniversiteleri ve bazı profilleri kendileri
# seed ediyor. Düz bir COPY dump'ı hedefte birincil anahtar çakışmasına
# düşüyor ve o noktada TÜM yükleme duruyor — test edildi: municipalities
# ilk satırda patlıyor, ardındaki tablolar hiç yüklenmiyor. ON CONFLICT
# DO NOTHING ile migration'ın kurduğu satır kalır, cloud'dan gelen yeni
# satırlar eklenir.
# ============================================================
set -euo pipefail

: "${CLOUD_URL:?CLOUD_URL gerekli (Supabase Dashboard → Settings → Database → URI)}"

OUT="${OUT_DIR:-$HOME/scald-yedek-$(date +%Y%m%d)}"
mkdir -p "$OUT"

# pg_dump yerelde yoksa Docker'dan: sürüm sunucudan yeni olmalı, 17 güvenli.
if command -v pg_dump >/dev/null 2>&1; then
  PGD=(pg_dump)
else
  echo "pg_dump yerelde yok, Docker kullanılıyor."
  PGD=(docker run --rm -i -v "$OUT:/out" supabase/postgres:17.6.1.136 pg_dump)
  OUT_IN_CMD=/out
fi
TARGET="${OUT_IN_CMD:-$OUT}"

DUMP_OPTS=(--data-only --no-owner --no-privileges
           --inserts --on-conflict-do-nothing --rows-per-insert=500)

# auth.users: pg_dump DEĞİL, satır başına JSON + jsonb_populate_record.
# Sebep: GoTrue'nun auth.users şeması sürümden sürüme kolon ekliyor —
# cloud'da 35 kolon görüldü, eski bir self-hosted şemasında 21. Sabit
# kolon listeli bir INSERT hedefte "column ... does not exist" ile
# patlıyor, düz pg_dump ise "INSERT has more expressions than target
# columns" veriyor. jsonb_populate_record, hedef tabloda KARŞILIĞI
# OLMAYAN anahtarları sessizce atlar; böylece hedefin GoTrue sürümü
# kaynaktan eski de olsa yükleme çalışır, ortak alanlar taşınır.
echo "→ Hesaplar (auth.users)"
if [ -n "${OUT_IN_CMD:-}" ]; then
  PSQL=(docker run --rm -i -v "$OUT:/out" supabase/postgres:17.6.1.136 psql)
else
  PSQL=(psql)
fi
"${PSQL[@]}" "$CLOUD_URL" -tA -o "$TARGET/scald-auth-users.sql" -c "
SELECT format(
  'INSERT INTO auth.users SELECT (jsonb_populate_record(NULL::auth.users, %L::jsonb)).* ON CONFLICT (id) DO NOTHING;',
  to_jsonb(u))
FROM auth.users u ORDER BY created_at;"

echo "→ Uygulama verisi (public şeması)"
"${PGD[@]}" "$CLOUD_URL" "${DUMP_OPTS[@]}" --schema=public \
  --exclude-table=schema_migrations \
  -f "$TARGET/scald-public-data.sql"

echo
echo "Yedek hazır: $OUT"
ls -lh "$OUT"
echo
echo "İçerik özeti (hedefte aynı çıkmalı):"
grep -cE "^INSERT INTO " "$OUT/scald-public-data.sql" | xargs echo "  public INSERT komutu:"
grep -oE "^INSERT INTO [a-z_.]+" "$OUT/scald-public-data.sql" | sort -u | sed "s/INSERT INTO /    /"
echo
echo "⚠ Bu dosyalar kişisel veri içerir (ad, e-posta). Şifreli kanalla"
echo "  iletin ve kurulum bitince silin."
