# SCALD — Canlıya Alma Runbook'u (KTÜ Sunucusu)

Bu doküman, SCALD'ı Supabase Cloud'dan KTÜ'nün kendi sunucusuna taşıma
işleminin baştan sona adımlarıdır. Sunucu başında sırayla takip edilecek
şekilde yazıldı: her bölümün sonunda **"doğrula"** adımı var — o adım
geçmeden sonrakine geçmeyin.

Tahmini süre: **4–6 saat** (ilk kurulum). Domain ve firewall hazırsa.

**Mimari özeti** — canlıda üç şey çalışır:

| Katman | Ne | Nasıl |
|---|---|---|
| Veri | Supabase self-hosted (Postgres, GoTrue, PostgREST, Kong, Studio) | `supabase/docker` compose stack |
| Uygulama | Next.js web (`apps/web`) | `scald-web` Docker image |
| Giriş | Caddy — TLS sonlandırma + reverse proxy | `docker-compose.prod.yml` |

`apps/api` ve `apps/ai-service` **canlıya alınmaz.** Web uygulaması onları
hiç çağırmıyor (kodda tek bir referans yok); eski mimariden kalma. Aynı
şekilde `infrastructure/docker/docker-compose.yml` de eskidir, kullanmayın —
dosyanın başında uyarı var.

---

## 0. Ön koşullar

BİDB'den gelmesi gerekenler (bkz. `docs/SUNUCU_KURULUM_NOTU.md`):

- Ubuntu 22.04 VM, public IP, 4 vCPU / 8 GB RAM / 100 GB SSD önerilir
- DNS kayıtları: **`scald.ktu.edu.tr`** ve **`api.scald.ktu.edu.tr`** → VM'in IP'si
- Firewall'da **80 ve 443** açık
- SSH anahtar erişimi
- SMTP relay bilgileri (`mail.ktu.edu.tr`, `scald@ktu.edu.tr`)

> **İki DNS kaydı da şart.** Caddy sertifikayı Caddyfile'daki hostname'ler
> için ister; `api.scald.ktu.edu.tr` çözülmezse sertifika alımı başarısız
> olur ve stack ayağa kalkmaz. Port 80 de açık olmalı — Let's Encrypt
> doğrulaması oradan geçiyor.

Sunucuda kurulu olması gerekenler:

```bash
docker --version          # 24+
docker compose version    # v2
psql --version            # yoksa: sudo apt install -y postgresql-client-16
node --version            # yoksa: sudo apt install -y nodejs
```

`psql` ve `node` yalnızca kurulum sırasında (migration + anahtar üretimi)
gerekiyor, uygulamanın kendisi için değil.

**Doğrula:** `dig +short scald.ktu.edu.tr` ve `dig +short api.scald.ktu.edu.tr`
ikisi de VM'in IP'sini dönmeli.

---

## 1. Depoyu al

```bash
sudo mkdir -p /opt/scald && sudo chown $USER:$USER /opt/scald
git clone https://github.com/kilincmurat/scald.git /opt/scald
cd /opt/scald
git log --oneline -1     # 2cd2998 veya sonrası olmalı
```

---

## 2. Anahtarları üret

Supabase self-hosted'da `JWT_SECRET`, `ANON_KEY` ve `SERVICE_ROLE_KEY`
**birbirine bağlıdır**: anahtarlar secret ile HS256 imzalanır. Cloud'daki
anahtarları kopyalamak işe yaramaz — Kong reddeder.

```bash
node scripts/gen-supabase-keys.mjs | tee ~/scald-keys.txt
```

Üç satır çıkar. Bunları bir parola yöneticisine kaydedin; `~/scald-keys.txt`
dosyasını kurulum bitince silin.

```bash
# Ek olarak üretilecekler
openssl rand -hex 24    # POSTGRES_PASSWORD
openssl rand -hex 24    # DASHBOARD_PASSWORD (Studio girişi)
```

> **Cloud anahtarlarını rotate ediyoruz.** Eski anon/service_role
> anahtarları cloud projesinde kalacak; self-hosted tamamen yeni bir güven
> zinciri. Cloud projesini kapatana kadar eski anahtarlar hâlâ geçerli
> olduğu için, geçiş bitince cloud projesini duraklatın.

---

## 3. Supabase stack'i kur

```bash
docker network create scald_net

cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

`.env` içinde **en az** şunları değiştirin:

| Değişken | Değer |
|---|---|
| `POSTGRES_PASSWORD` | 2. adımda üretilen |
| `JWT_SECRET` | 2. adımda üretilen |
| `ANON_KEY` | 2. adımda üretilen |
| `SERVICE_ROLE_KEY` | 2. adımda üretilen |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | Studio girişi |
| `SITE_URL` | `https://scald.ktu.edu.tr` |
| `API_EXTERNAL_URL` | `https://api.scald.ktu.edu.tr` |
| `SUPABASE_PUBLIC_URL` | `https://api.scald.ktu.edu.tr` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | KTÜ relay |
| `SMTP_ADMIN_EMAIL` / `SMTP_SENDER_NAME` | `scald@ktu.edu.tr` / `SCALD` |
| `ENABLE_EMAIL_SIGNUP` | `false` — **kritik, aşağıya bakın** |
| `ENABLE_EMAIL_AUTOCONFIRM` | `false` |

> **`ENABLE_EMAIL_SIGNUP=false` atlanmaması gereken adımdır.** SCALD'da
> kayıt sayfası yok; tüm hesapları admin açıyor. Signup açık kalırsa
> `api.scald.ktu.edu.tr` üzerinden herkes kendine hesap açabilir. Kurulum
> sonrası Studio → Authentication → Providers altından da teyit edin.

Stack'i `scald_net` ağına bağlayın — web konteyneri Kong'a bu ağ üzerinden
ulaşacak:

```bash
cat >> docker-compose.override.yml <<'YAML'
services:
  kong:
    networks: [default, scald_net]
networks:
  scald_net:
    external: true
YAML

docker compose up -d
docker compose ps        # hepsi healthy olana kadar bekleyin (~2 dk)
```

**Doğrula:**

```bash
docker exec supabase-db pg_isready -U postgres        # accepting connections
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "apikey: <ANON_KEY>" http://localhost:8000/rest/v1/    # 200
```

---

## 4. Şemayı kur

Migration'lar **idempotent değil** — biri yarıda kalırsa baştan çalıştırmak
hata verir. `scripts/migrate.sh` bunun için var: uygulananları
`public.schema_migrations` tablosunda tutar, atlayarak devam eder, her
dosyayı kendi transaction'ında çalıştırır.

```bash
cd /opt/scald
export DATABASE_URL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"

./scripts/migrate.sh --dry-run     # ne uygulanacak, önce bunu okuyun
./scripts/migrate.sh
```

Beklenen çıktı: `Applied 22 migration(s).`

**Doğrula** — RLS kapsamı eksiksiz olmalı:

```bash
psql "$DATABASE_URL" -c "
SELECT count(*) AS rls_kapali_tablo
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;"
```

`0` dönmeli. Dönmezse durun — RLS'siz bir tablo, PostgREST üzerinden
herkese açık demektir.

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM schema_migrations;"   # 22
```

---

## 5. Veriyi taşı

Cloud'da bugüne kadar girilmiş veri ve kullanıcı hesapları taşınacak.
İki tablo grubu önemli: `public` şeması (uygulama verisi) ve `auth.users`
(hesaplar).

### 5.1 Cloud'dan dump al

Supabase Dashboard → Settings → Database → Connection string (URI, "Session
pooler" değil **direct connection**) alın.

```bash
export CLOUD_URL="postgresql://postgres:<sifre>@db.<proje>.supabase.co:5432/postgres"

# Uygulama verisi (sadece satırlar — şema zaten 4. adımda kuruldu)
pg_dump "$CLOUD_URL" --data-only --schema=public \
  --exclude-table=schema_migrations \
  --no-owner --no-privileges -f ~/scald-public-data.sql

# Kullanıcı hesapları
pg_dump "$CLOUD_URL" --data-only --table=auth.users \
  --no-owner --no-privileges -f ~/scald-auth-users.sql
```

### 5.2 Self-hosted'a yükle

Sıra önemli: hesaplar önce gelmeli, çünkü `public.profiles.id` →
`auth.users.id` foreign key'i var.

```bash
# profiles'ı auth.users'a bağlayan trigger yüklemede araya girer, geçici kapat
psql "$DATABASE_URL" -c "ALTER TABLE auth.users DISABLE TRIGGER USER;"
psql "$DATABASE_URL" -f ~/scald-auth-users.sql
psql "$DATABASE_URL" -c "ALTER TABLE auth.users ENABLE TRIGGER USER;"

psql "$DATABASE_URL" -f ~/scald-public-data.sql
```

**Doğrula:**

```bash
psql "$DATABASE_URL" -c "
SELECT (SELECT count(*) FROM auth.users)                  AS hesap,
       (SELECT count(*) FROM profiles)                    AS profil,
       (SELECT count(*) FROM scald_indicator_entries)     AS girdi,
       (SELECT count(*) FROM municipalities)              AS belediye;"
```

Sayılar cloud'daki ile aynı olmalı — cloud'da da aynı sorguyu çalıştırıp
karşılaştırın.

> **Şifreler taşınır.** GoTrue şifreleri `auth.users.encrypted_password`
> içinde bcrypt ile tutar; `JWT_SECRET` yalnızca token imzalar, şifre
> hash'lerini etkilemez. Yani kullanıcılar mevcut şifreleriyle girebilmeli.
> **Yine de 8. adımda gerçek bir hesapla test edin** — çalışmazsa
> Studio'dan şifre sıfırlama maili gönderirsiniz (~10 kişi).

---

## 6. Web image'ını build et

```bash
cd /opt/scald
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://api.scald.ktu.edu.tr \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY> \
  -t scald-web:latest .
```

> **`NEXT_PUBLIC_*` değerleri build anında bundle'a gömülür**, runtime'da
> okunmaz. `docker run -e` ile değiştiremezsiniz — değişiklik için image'ı
> yeniden build etmek gerekir. URL'yi yanlış girerseniz uygulama tarayıcıda
> eski/yanlış adrese istek atar.
>
> `NEXT_PUBLIC_SUPABASE_URL` **tarayıcının göreceği** public adres olmalı
> (`https://api.scald.ktu.edu.tr`), konteyner içi isim (`kong:8000`) değil.

Build ~3–5 dakika sürer, sonuç ~312 MB'lık bir image.

**Doğrula:** `docker images scald-web:latest`

---

## 7. Stack'i ayağa kaldır

```bash
cd /opt/scald/infrastructure/docker
```

Caddyfile'daki hostname'leri kontrol edin (varsayılan zaten
`scald.ktu.edu.tr` / `api.scald.ktu.edu.tr`). Sonra runtime secret'ı verin:

```bash
cat > .env <<EOF
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
SCALD_VERSION=latest
EOF
chmod 600 .env

docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Caddy ilk açılışta Let's Encrypt'ten sertifika ister; 30–60 saniye sürebilir.

**Doğrula:**

```bash
docker compose -f docker-compose.prod.yml logs proxy | grep -i "certificate obtained"
curl -sI https://scald.ktu.edu.tr/login | head -1        # HTTP/2 200
curl -s -o /dev/null -w '%{http_code}\n' https://scald.ktu.edu.tr/admin   # 307
```

`/login` 200, `/admin` 307 (login'e yönlendirme) dönmeli. `/admin` 200
dönüyorsa auth çalışmıyor demektir — durun.

`503` görürseniz: image `NEXT_PUBLIC_*` olmadan build edilmiş. 6. adımı
build arg'larıyla tekrarlayın.

---

## 8. Canlı öncesi kontrol listesi

Bu maddeler koddan yapılamaz, elle doğrulanır.

- [ ] **Signup kapalı.** Studio → Authentication → Providers → Email →
      "Allow new users to sign up" **kapalı**. SCALD'da kayıt sayfası yok,
      hesapları admin açar.
- [ ] **Admin hesaplarını denetle.** Cloud'da bir dönem kayıt sırasında
      kendini admin yapma açığı canlıydı (migration 012 ile kapatıldı, ama
      o tarihten önce açılmış hesaplar taşındı):
      ```bash
      psql "$DATABASE_URL" -c "SELECT email, full_name, created_at FROM profiles WHERE role='admin' ORDER BY created_at;"
      ```
      Tanımadığınız bir satır varsa silin.
- [ ] **Giriş testi.** Taşınan gerçek bir hesapla `https://scald.ktu.edu.tr/login`
      üzerinden girin. Çalışmazsa Studio'dan şifre sıfırlama gönderin.
- [ ] **Rol testi.** Bir `data_entry` hesabıyla girip `/admin`'e gitmeyi
      deneyin — kendi ana sayfasına yönlenmeli.
- [ ] **Onay gating testi.** `https://scald.ktu.edu.tr/explore` adresini
      **gizli sekmede** (girişsiz) açın. Yalnızca onaylanmış (belediye, yıl)
      verileri görünmeli. Onaylanmamış bir yılın skorları görünüyorsa
      migration 022 uygulanmamış demektir.
- [ ] **Mail testi.** Studio → Authentication → Users → bir kullanıcıya
      şifre sıfırlama gönderin, mailin ulaştığını teyit edin. SMTP yanlışsa
      kullanıcı ekleme akışı sessizce kırılır.
- [ ] **Studio'yu kısıtla.** Self-hosted Studio'nun kendi oturum yönetimi
      yok; tek kapı Kong'un basic auth'u. `api.scald.ktu.edu.tr`'yi
      üniversite ağıyla sınırlamayı BİDB ile konuşun.
- [ ] **Postgres dışarı açık değil.** Supabase compose'u 5432'yi host'a
      bağlar. Firewall'da yalnızca 80/443 açıksa dışarıdan erişilemez, ama
      teyit edin:
      ```bash
      sudo ufw status                                  # 5432 listelenmemeli
      nmap -p 5432 <public-ip>                         # filtered/closed
      ```
      Açıksa kapatın — internete bakan bir Postgres, RLS'i tamamen atlayan
      `postgres` kullanıcısıyla parola denemesine açık demektir.
- [ ] **`apps/api` / `apps/ai-service` açık değil.** Bu runbook onları
      çalıştırmıyor; başka bir compose dosyasıyla da ayağa kaldırmayın
      (endpoint bazlı rol/belediye kontrolü henüz yok).
- [ ] **Cloud projesini duraklat.** Geçiş doğrulandıktan sonra Supabase
      Dashboard'dan cloud projesini pause edin — iki canlı veritabanı
      arasında veri ayrışması en kötü senaryo.

---

## 9. Yedekleme

Kurulumun bitmiş sayılması için yedek **alınıyor ve geri yüklenebiliyor**
olmalı.

```bash
sudo mkdir -p /var/backups/scald && sudo chown $USER /var/backups/scald

cat > /opt/scald/scripts/backup.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
OUT="/var/backups/scald/scald-$(date +%F-%H%M).sql.gz"
docker exec supabase-db pg_dumpall -U postgres | gzip > "$OUT"
find /var/backups/scald -name 'scald-*.sql.gz' -mtime +30 -delete
EOF
chmod +x /opt/scald/scripts/backup.sh

# Her gece 03:00
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/scald/scripts/backup.sh") | crontab -
```

**Bir kez geri yükleme provası yapın** — test edilmemiş yedek, yedek
değildir:

```bash
/opt/scald/scripts/backup.sh
ls -lh /var/backups/scald/
# Boş bir test veritabanına geri yükleyip satır sayılarını karşılaştırın.
```

BİDB'nin mevcut yedekleme altyapısına `/var/backups/scald` dizinini dahil
ettirin — sunucu tamamen giderse yerel yedek de gider.

---

## 10. Sonraki güncellemeler

Kod değişikliği geldiğinde:

```bash
cd /opt/scald && git pull

# Yeni migration var mı?
DATABASE_URL="postgresql://postgres:<sifre>@localhost:5432/postgres" \
  ./scripts/migrate.sh --dry-run
DATABASE_URL="..." ./scripts/migrate.sh

# Image'ı yeniden build et (NEXT_PUBLIC_* build arg'ları HER SEFERİNDE gerekli)
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://api.scald.ktu.edu.tr \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY> \
  -t scald-web:latest .

cd infrastructure/docker
docker compose -f docker-compose.prod.yml up -d --force-recreate web
```

Şema değişikliği yapılacaksa **Studio'nun SQL Editor'ında elle DDL
çalıştırmayın** — `supabase/migrations/NNN_*.sql` dosyası olarak yazın ve
`migrate.sh` ile uygulayın. Aksi halde bir sonraki kurulumda o değişiklik
kaybolur.

---

## 11. Sık karşılaşılan hatalar

| Belirti | Sebep | Çözüm |
|---|---|---|
| Tüm sayfalarda `503 SCALD is not configured` | Image `NEXT_PUBLIC_*` build arg'ları olmadan build edilmiş | 6. adımı arg'larla tekrarlayın |
| Tarayıcı konsolunda `Invalid API key` | `ANON_KEY`, stack'in `JWT_SECRET`'ı ile imzalanmamış | `gen-supabase-keys.mjs`'yi **mevcut secret'la** çalıştırıp anahtarları yenileyin, image'ı yeniden build edin |
| `/admin` girişsiz 200 dönüyor | middleware Supabase'e ulaşamıyor | `NEXT_PUBLIC_SUPABASE_URL` public adres mi, Kong ayakta mı |
| Caddy sertifika alamıyor | DNS yanlış, port 80 kapalı, ya da rate limit | `dig` ile DNS'i, `ufw status` ile portu kontrol edin; `caddy_data` volume'u silmeyin |
| `migrate.sh: FAILED` | Bir migration patladı | Hata mesajını okuyun; veritabanı önceki migration'da kaldı, düzeltip tekrar çalıştırın (uygulananlar atlanır) |
| Kullanıcı ekleme "Server not configured" | `SUPABASE_SERVICE_ROLE_KEY` compose `.env`'inde yok | 7. adımdaki `.env`'i kontrol edin, `web` konteynerini recreate edin |
| `/explore`'da onaysız veri görünüyor | Migration 022 uygulanmamış | `./scripts/migrate.sh` çalıştırın |
| Şifre sıfırlama maili gelmiyor | SMTP ayarları yanlış | `docker compose logs auth \| grep -i smtp` |

---

## 12. Geri dönüş planı

Geçiş sırasında ciddi bir sorun çıkarsa: cloud projesi hâlâ ayakta ve
veri kaybı yok (dump aldık, cloud'a yazmadık). Vercel'daki deployment'ı
cloud anahtarlarıyla çalışır durumda bırakın ve `scald.ktu.edu.tr` DNS
kaydını yönlendirmeden geri dönün. Self-hosted tarafı düzeltildikten sonra
tekrar deneyin.

Bu yüzden **cloud projesini, self-hosted doğrulanana kadar kapatmayın.**
