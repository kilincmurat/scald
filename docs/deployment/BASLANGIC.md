# SCALD — Kurulumu Yapacak Kişi İçin Başlangıç

Bu bir sayfalık özet. **Asıl talimat
[RUNBOOK.md](RUNBOOK.md) dosyasıdır** — kurulumu oradan adım adım takip edin.
Bu dosya yalnızca işe nereden başlayacağınızı ve proje sorumlusundan neleri
isteyeceğinizi anlatır.

## Ne kuruyorsunuz

SCALD, belediyelerin iklim uyum performansını ölçen bir web uygulaması
(Erasmus+ KA220-ADU projesi). Şu an Supabase Cloud'da çalışıyor, KTÜ'nün
kendi sunucusuna taşınıyor — sebep veri sahipliği ve GDPR.

Canlıda üç şey çalışır:

| Katman | Ne |
|---|---|
| Veri | Supabase self-hosted (Postgres + Auth + API), kendi compose stack'i |
| Uygulama | Next.js web — repodaki `apps/web`, Docker image olarak |
| Giriş | Caddy — HTTPS sonlandırma ve yönlendirme |

`apps/api` ve `apps/ai-service` klasörleri **kurulmaz** — eski mimariden
kalma, web uygulaması onları hiç çağırmıyor.

Süre: ilk kurulum için **4–6 saat** (domain ve firewall hazırsa).

## Başlamadan önce proje sorumlusundan isteyin

Bunlar repoda yok ve olmamalı. Hepsi elinizde olmadan kurulum tamamlanamaz:

1. **Supabase Cloud erişimi** — mevcut kullanıcı hesapları ve girilmiş
   veriler orada. Ya veritabanı bağlantı adresi (connection string), ya da
   sorumlunun önceden aldığı dump dosyaları. *Bu olmadan sistem bomboş
   açılır, kimse giriş yapamaz.*
2. **Domain** — hangi adresler kullanılacak. Runbook `scald.ktu.edu.tr` ve
   `api.scald.ktu.edu.tr` varsayıyor. Farklıysa kuruluma başlamadan önce
   öğrenin: adres, uygulama paketinin içine gömülüyor, sonradan
   değiştirilemiyor.
3. **SMTP bilgileri** — KTÜ mail relay sunucusu, kullanıcı adı ve şifre.
   Bu olmadan şifre sıfırlama ve kullanıcı davet mailleri gitmez.
4. **Sunucu erişimi** — IP, SSH kullanıcısı, anahtar. Ayrıca **Docker
   kurulu mu** ve **sudo yetkiniz var mı** — Docker kurulu değilse kurmak
   için sudo gerekiyor.
5. **Pilot tarihi** — kurulumun ne zamana yetişmesi gerektiği, kesinti
   planlanabilir mi.

## Sıra

Detaylar RUNBOOK.md'de, bu sadece yol haritası:

1. **Ön kontrol** (RUNBOOK 0) — DNS, Docker, internet çıkışı. *Üç satırlık
   test var, kuruluma başlamadan önce mutlaka çalıştırın.*
2. **Repoyu al** (1)
3. **Anahtarları üret** (2) — `scripts/gen-supabase-keys.mjs`
4. **Supabase stack** (3)
5. **Veritabanı şeması** (4) — `scripts/migrate.sh`, 22 migration
6. **Veri taşıma** (5) — cloud'dan dump, buraya yükleme
7. **Uygulama paketi** (6) — `docker build`
8. **Ayağa kaldır** (7) — compose + HTTPS
9. **Kontrol listesi** (8) — *atlamayın, aşağıya bakın*
10. **Yedekleme** (9)

## Üç kritik nokta

**Yeni kullanıcı kaydını kapatın.** Supabase'in varsayılanı açıktır.
SCALD'da kayıt sayfası yok, hesapları yönetici açıyor. Açık kalırsa adresi
bilen herkes kendine hesap açabilir. `ENABLE_EMAIL_SIGNUP=false` ve kurulum
sonrası Studio'dan teyit.

**Uygulama paketindeki adres ve anahtar build anında gömülür.** `docker run
-e` ile değiştirilemez. Yanlış girilirse site açılır, giriş ekranı gelir,
ama hiçbir veri gelmez ve ekranda sebebi yazmaz. Komutu çalıştırmadan önce
iki değeri kontrol edin. Ayrıca oraya **ANON_KEY** yazılır, SERVICE_ROLE_KEY
değil — ikisi de `eyJ...` ile başladığı için karışıyor; service_role
tarayıcıya giderse tüm veritabanı açığa çıkar.

**Postgres portunu dışarı açmayın.** Supabase compose'u 5432'yi host'a
bağlar. Firewall'da yalnızca 80/443 açık olmalı.

## Bitince proje sorumlusuna teslim edin

Sistem onun sorumluluğunda kalacak, bu bilgiler sizde kalmamalı:

- [ ] Üretilen tüm değerler: `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`,
      `POSTGRES_PASSWORD`, Studio kullanıcı adı/şifresi
- [ ] Sunucu erişimi: IP, SSH kullanıcısı, kurulum dizini
- [ ] `.env` dosyalarının tam yolu
- [ ] Uygulamada kendisine **admin** hesabı (ya da mevcut hesabının admin
      olduğunun teyidi)
- [ ] Yedeklerin nereye alındığı ve cron saati
- [ ] Kurulum sırasında yaptığınız, runbook'ta yazmayan değişiklikler

## Takılırsanız

RUNBOOK.md'nin **11. bölümü** sık karşılaşılan hataları ve sebeplerini
listeliyor (503 hatası, "Invalid API key", sertifika alınamıyor, mail
gitmiyor vb.). Önce oraya bakın.

Geri dönüş planı 12. bölümde: cloud hâlâ ayakta, veri kaybı riski yok.
**Cloud projesini, self-hosted doğrulanana kadar kapatmayın.**
