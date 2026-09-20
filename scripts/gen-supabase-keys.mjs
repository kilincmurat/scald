#!/usr/bin/env node
// ============================================================
// SCALD — self-hosted Supabase için JWT_SECRET + ANON_KEY + SERVICE_ROLE_KEY
//
//   node scripts/gen-supabase-keys.mjs              # yeni secret üretir
//   node scripts/gen-supabase-keys.mjs <mevcut-secret>   # mevcut secret'la imzalar
//
// Supabase self-hosted'da bu üç değer birbirine bağlıdır: anahtarlar
// JWT_SECRET ile HS256 imzalanır. Elle uydurulan ya da cloud'dan kopyalanan
// bir anahtar Kong tarafından reddedilir — "Invalid API key" hatasının en
// yaygın sebebi budur.
//
// Çıktıyı supabase/docker/.env içine yapıştırın. ANON_KEY ayrıca web
// image'ına build arg olarak girer (apps/web/Dockerfile).
//
// SERVICE_ROLE_KEY RLS'i tamamen atlar — tarayıcıya ASLA gitmez, yalnızca
// sunucu tarafında (compose env) durur.
// ============================================================
import { createHmac, randomBytes } from 'node:crypto';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

const secret = process.argv[2] ?? randomBytes(32).toString('hex');
if (secret.length < 32) {
  console.error('JWT_SECRET en az 32 karakter olmalı (GoTrue reddeder).');
  process.exit(1);
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 yıl

const sign = (role) => {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({ role, iss: 'supabase', iat, exp });
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
};

console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${sign('anon')}`);
console.log(`SERVICE_ROLE_KEY=${sign('service_role')}`);
