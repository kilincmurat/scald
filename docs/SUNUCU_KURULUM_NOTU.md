# SCALD Uygulaması — Sunucu Kurulum Talebi

**Proje:** SCALD (Sustainable Climate Adaptation for Local Development) — KA220-ADU Erasmus+ ortaklığı kapsamında geliştirilen belediye iklim uyum değerlendirme platformu.

**Ortaklar:** KTU (Türkiye), Kavala Belediyesi (Yunanistan), Tulcea Belediyesi (Romanya), UKLO / Bitola Belediyesi (Kuzey Makedonya).

**Şu anki durum:** Uygulama hâlâ geliştirme aşamasında ve şu an Supabase Cloud üzerinde çalışıyor. Ağustos 2026'da 4 pilot belediye veri girişine başlayacak. Bu tarihe kadar uygulamanın üniversite sunucusuna taşınması hedefleniyor. AB projesi kapsamında **veri güvenliği ve veri sahipliği** (GDPR uyumu) açısından verilerin üniversite bünyesinde tutulması gerekiyor.

---

## İhtiyaç Duyulan Kaynaklar

### 1. Sanal Makine (VM)

| Kaynak | Minimum | Önerilen |
|--------|---------|----------|
| İşletim Sistemi | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk (SSD) | 50 GB | 100 GB |

Uygulama Docker Compose ile konteyner tabanlı çalışacak. Ek bir yazılım kurulumu gerekmiyor — Docker yeterli.

### 2. Ağ ve Domain

- **Public IP** (dünyanın her yerinden erişilebilir olmalı — belediye kullanıcıları Yunanistan, Romanya, Makedonya'dan da erişecek)
- **Subdomain**: örneğin `scald.ktu.edu.tr` — uygulama web arayüzü için
- **Subdomain**: örneğin `db.scald.ktu.edu.tr` veya `studio.scald.ktu.edu.tr` — veritabanı yönetim paneli için (opsiyonel, sadece admin'ler kullanacak)
- **Açık portlar**: 80 (HTTP → HTTPS yönlendirme için) ve 443 (HTTPS)
- **TLS/SSL sertifikası**: Let's Encrypt üzerinden otomatik yenilenebilir (Certbot). Alternatif olarak üniversite CA'sı da kabul edilir.

### 3. Erişim (proje ekibi için)

- **SSH erişimi**: 2-3 kişilik proje ekibi için, **anahtar (public key) tabanlı** — parola değil.
- Erişim kullanıcıları sadece kendi ev dizinlerine ve Docker komutlarına yetkili olsun. Root gerekmiyor.
- Bu erişim kurulum ve bakım için kritik. Uzaktan erişim yoksa her migration için üniversiteye gelinmesi gerekir.

### 4. SMTP Erişimi

- Kullanıcı hesap doğrulama ve şifre sıfırlama mailleri için üniversite SMTP relay hesabı.
- Örneğin `mail.ktu.edu.tr` üzerinden `scald@ktu.edu.tr` adresi ile mail gönderme yetkisi.
- Aylık ~200 mail beklentisi (çok düşük hacim).

### 5. Yedekleme

- Günlük otomatik veritabanı yedeği (`pg_dump`) alacağız.
- Yedekler için ayrı bir depolama alanı önerilir (~20 GB) veya BİDB'nin mevcut yedekleme altyapısına dahil edilebilir.

---

## Kurulum Süreci ve Kim Yapacak

- Docker Compose stack'ini proje ekibi (KTU tarafından) SSH ile kuracak. **BİDB'nin uygulama kurulumu yapmasına gerek yok.**
- BİDB'nin görev alanı:
  1. VM'i hazırlamak ve internete açmak
  2. Domain kaydını yapmak (`scald.ktu.edu.tr`)
  3. Firewall'da 80/443 portlarını açmak
  4. SSH kullanıcılarını oluşturmak (public key ile)
  5. SMTP relay yetkisi vermek
- Sonrasında BİDB'nin görevi standart OS bakımı olur: aylık güvenlik yaması, disk kullanımı takibi.

Tahmini kurulum süresi: Proje ekibi için 1 tam gün (Docker Compose stack'in ayağa kaldırılması + veri taşıma + doğrulama).

---

## Uygulamanın Kaynak Tüketimi (bilgi)

- **Veritabanı boyutu**: Şu an ~5 MB. 1 yıl sonra tahmini 200 MB, 5 yıl sonra <2 GB.
- **Ağ trafiği**: Günde ortalama 500-2000 istek. Belediye personeli çalışma saatlerinde daha yoğun.
- **Aktif kullanıcı**: Şu an 8-12 kişi. Vatandaş erişimi açılırsa şehir başına ~100 kişi bekleniyor.

Bu ölçekte sunucu üzerinde belirgin bir yük oluşturmuyor.

---

## Zaman Planı

| Tarih | Aşama |
|-------|-------|
| Şu an — Temmuz sonu | VM hazırlığı, domain, SSH erişimi kurulumu |
| Temmuz sonu | Docker Compose ile Supabase self-hosted kurulumu, veri taşıma |
| Ağustos başı | 4 pilot belediye veri girişine başlıyor |

Ağustos'a yetiştirmek için VM'in **en geç 2 hafta içinde** hazır olması ideal olur.

---

## İletişim

Proje sorumlusu: Murat Kılınç — murattkilinc@gmail.com

Kurulumun teknik detayları veya sorularınız için doğrudan iletişime geçebilirsiniz.
