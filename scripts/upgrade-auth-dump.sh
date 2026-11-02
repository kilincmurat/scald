#!/usr/bin/env bash
# ============================================================
# SCALD — eski biçimli hesap yedeğini (scald-auth-users.sql) yeni biçime çevir
#
#   ./scripts/upgrade-auth-dump.sh scald-auth-users.sql > scald-auth-users.yeni.sql
#
# 2026-11 öncesi cloud-dump.sh, her hesabı
#   INSERT INTO auth.users SELECT (jsonb_populate_record(...)).* ...
# olarak yazıyordu. Bu, hedefte GENERATED olan kolonlara (güncel GoTrue'da
# confirmed_at) de değer yazmaya çalışır ve yükleme şu hatayla durur:
#   cannot insert a non-DEFAULT value into column "confirmed_at"
# Bu betik aynı satırları scripts/sql/load-auth-user.sql yükleyicisiyle
# yazılacak hâle getirir. Veri değişmez; yalnızca yükleme biçimi değişir.
# ============================================================
set -euo pipefail

IN="${1:?kullanım: ./scripts/upgrade-auth-dump.sh scald-auth-users.sql > scald-auth-users.yeni.sql}"

if grep -q '^SELECT pg_temp.scald_load_user' "$IN"; then
  echo "Dosya zaten yeni biçimde; olduğu gibi yazılıyor." >&2
  cat "$IN"
  exit 0
fi

cat "$(dirname "${BASH_SOURCE[0]}")/sql/load-auth-user.sql"
sed -E 's/^INSERT INTO auth\.users SELECT \(jsonb_populate_record\(NULL::auth\.users, (.*)\)\)\.\* ON CONFLICT \(id\) DO NOTHING;$/SELECT pg_temp.scald_load_user(\1);/' "$IN"

total=$(grep -c '^INSERT INTO auth\.users' "$IN" || true)
echo "$total hesap satırı dönüştürüldü." >&2
