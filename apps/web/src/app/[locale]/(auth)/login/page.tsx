'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Leaf, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

// Doğa temalı SVG — gündüz, açık renkler, yazısız
function NatureBackground() {
  return (
    <svg
      viewBox="0 0 900 700"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="55%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#eff6ff" />
        </linearGradient>
        <linearGradient id="mtn1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="mtn2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        <linearGradient id="mtn3" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d1fae5" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="ground" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
        <linearGradient id="lake" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="60%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id="blur1">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Gökyüzü */}
      <rect width="900" height="700" fill="url(#sky)" />

      {/* Güneş */}
      <circle cx="680" cy="100" r="70" fill="url(#sun)" opacity="0.7" />
      <circle cx="680" cy="100" r="38" fill="#fef08a" opacity="0.85" />
      <circle cx="680" cy="100" r="26" fill="#fef9c3" />

      {/* Bulutlar */}
      {[
        { x: 80, y: 80, s: 1 },
        { x: 220, y: 55, s: 0.8 },
        { x: 430, y: 70, s: 1.1 },
        { x: 780, y: 140, s: 0.7 },
      ].map((c, i) => (
        <g key={i} transform={`translate(${c.x}, ${c.y}) scale(${c.s})`} opacity="0.75">
          <ellipse cx="40" cy="20" rx="40" ry="18" fill="white" />
          <ellipse cx="70" cy="14" rx="30" ry="14" fill="white" />
          <ellipse cx="100" cy="20" rx="35" ry="16" fill="white" />
          <ellipse cx="70" cy="24" rx="55" ry="12" fill="white" />
        </g>
      ))}

      {/* Uzak dağlar (en arka, soluk) */}
      <path
        d="M0,420 L70,270 L150,330 L230,220 L320,295 L400,200 L480,280 L560,230 L640,300 L710,240 L800,290 L900,255 L900,450 L0,450 Z"
        fill="url(#mtn3)"
        filter="url(#softBlur)"
        opacity="0.5"
      />

      {/* Orta dağlar */}
      <path
        d="M0,460 L90,300 L180,360 L270,240 L370,320 L450,210 L540,295 L620,250 L710,330 L790,275 L900,320 L900,480 L0,480 Z"
        fill="url(#mtn2)"
        filter="url(#blur1)"
        opacity="0.75"
      />

      {/* Ön dağlar */}
      <path
        d="M0,500 L80,340 L180,400 L280,280 L380,360 L460,270 L560,350 L650,295 L750,370 L840,315 L900,345 L900,520 L0,520 Z"
        fill="url(#mtn1)"
      />

      {/* Zemin */}
      <path
        d="M0,500 Q225,480 450,490 Q675,480 900,500 L900,700 L0,700 Z"
        fill="url(#ground)"
      />

      {/* Göl */}
      <ellipse cx="450" cy="580" rx="200" ry="38" fill="url(#lake)" />
      {/* Göl yansıma çizgileri */}
      <path d="M290,572 Q370,565 450,568 Q530,565 610,572" stroke="#7dd3fc" strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d="M320,582 Q390,576 450,579 Q510,576 580,582" stroke="#7dd3fc" strokeWidth="0.8" fill="none" opacity="0.4" />

      {/* Sol ağaç grubu */}
      {[
        { x: 30, trunkH: 55, rx: 22, ry: 60, color1: '#16a34a', color2: '#22c55e' },
        { x: 75, trunkH: 65, rx: 18, ry: 72, color1: '#15803d', color2: '#16a34a' },
        { x: 115, trunkH: 48, rx: 20, ry: 54, color1: '#22c55e', color2: '#4ade80' },
        { x: 155, trunkH: 60, rx: 16, ry: 64, color1: '#16a34a', color2: '#22c55e' },
      ].map((t, i) => (
        <g key={`ltree-${i}`}>
          <rect x={t.x + 8} y={700 - t.trunkH} width="7" height={t.trunkH} rx="2" fill="#92400e" opacity="0.6" />
          <ellipse cx={t.x + 11.5} cy={700 - t.trunkH - t.ry * 0.5} rx={t.rx} ry={t.ry * 0.6} fill={t.color1} />
          <ellipse cx={t.x + 11.5} cy={700 - t.trunkH - t.ry * 0.65} rx={t.rx - 4} ry={t.ry * 0.5} fill={t.color2} />
        </g>
      ))}

      {/* Sağ ağaç grubu */}
      {[
        { x: 710, trunkH: 58, rx: 20, ry: 62, color1: '#16a34a', color2: '#22c55e' },
        { x: 752, trunkH: 70, rx: 22, ry: 75, color1: '#15803d', color2: '#16a34a' },
        { x: 798, trunkH: 50, rx: 18, ry: 56, color1: '#22c55e', color2: '#4ade80' },
        { x: 838, trunkH: 62, rx: 20, ry: 66, color1: '#16a34a', color2: '#22c55e' },
        { x: 875, trunkH: 45, rx: 15, ry: 50, color1: '#15803d', color2: '#16a34a' },
      ].map((t, i) => (
        <g key={`rtree-${i}`}>
          <rect x={t.x + 8} y={700 - t.trunkH} width="7" height={t.trunkH} rx="2" fill="#92400e" opacity="0.6" />
          <ellipse cx={t.x + 11.5} cy={700 - t.trunkH - t.ry * 0.5} rx={t.rx} ry={t.ry * 0.6} fill={t.color1} />
          <ellipse cx={t.x + 11.5} cy={700 - t.trunkH - t.ry * 0.65} rx={t.rx - 4} ry={t.ry * 0.5} fill={t.color2} />
        </g>
      ))}

      {/* Ön çimen detayı */}
      <path d="M0,620 Q450,600 900,620 L900,700 L0,700 Z" fill="#86efac" opacity="0.4" />
    </svg>
  );
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function LoginPage({ params: _params }: PageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'E-posta veya şifre hatalı.'
          : 'Giriş yapılırken bir hata oluştu.'
      );
      setLoading(false);
      return;
    }

    router.push('/tr');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sol: Doğa görseli */}
      <div className="relative hidden lg:flex lg:w-[58%] xl:w-[62%] overflow-hidden">
        <NatureBackground />
        {/* Sağa doğru solar overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/60" />
        {/* Sol alt logo */}
        <div className="absolute bottom-8 left-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/90 shadow-sm backdrop-blur">
            <Leaf className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-emerald-900">SCALD</p>
            <p className="text-[11px] text-emerald-700/80">Sustainable Cities & Local Development</p>
          </div>
        </div>
      </div>

      {/* Sağ: Form paneli */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-12">
        {/* Mobil logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <p className="text-lg font-bold text-slate-900">SCALD</p>
        </div>

        <div className="w-full max-w-[360px]">
          {/* Başlık */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">Hoş Geldiniz</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sisteme erişmek için giriş yapın
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* E-posta */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ornek@belediye.gov.tr"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>

            {/* Şifre */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Hata */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition',
                loading
                  ? 'cursor-not-allowed bg-emerald-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Giriş yapılıyor...
                </span>
              ) : 'Giriş Yap'}
            </button>
          </form>

          {/* Kayıt ol linki */}
          <p className="mt-5 text-center text-sm text-slate-500">
            Hesabınız yok mu?{' '}
            <Link
              href="register"
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Kayıt Olun
            </Link>
          </p>

          {/* Rol bilgisi */}
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Demo Hesaplar
            </p>
            <div className="space-y-2.5">
              {[
                { label: 'Admin', badge: 'Tüm yetkiler', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { label: 'Belediye Kullanıcısı', badge: 'Kendi belediyesi', badgeColor: 'bg-blue-100 text-blue-700' },
                { label: 'Vatandaş', badge: 'Sadece görüntüleme', badgeColor: 'bg-slate-100 text-slate-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{item.label}</span>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold', item.badgeColor)}>
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            © 2025 SCALD · EU Funded Project
          </p>
        </div>
      </div>
    </div>
  );
}
