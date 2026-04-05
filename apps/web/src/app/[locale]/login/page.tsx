'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Leaf, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

// Doğa temalı SVG arka plan — yazısız, sadece manzara
function NatureBackground() {
  return (
    <svg
      viewBox="0 0 800 600"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0a1628" />
          <stop offset="45%" stopColor="#0d2b1e" />
          <stop offset="100%" stopColor="#1a4731" />
        </linearGradient>
        <linearGradient id="moonGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%" gradientUnits="objectBoundingBox">
          <radialGradient id="moonGlow">
            <stop offset="0%" stopColor="#e8f5e9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e8f5e9" stopOpacity="0" />
          </radialGradient>
        </linearGradient>
        <radialGradient id="moonLight" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c8e6c9" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1a4731" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1b5e20" />
          <stop offset="100%" stopColor="#0d2b1e" />
        </linearGradient>
        <linearGradient id="mountain2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2e7d32" />
          <stop offset="100%" stopColor="#1a4731" />
        </linearGradient>
        <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1b5e20" />
          <stop offset="100%" stopColor="#0a1628" />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1565c0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0a1628" stopOpacity="0.8" />
        </linearGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Gökyüzü */}
      <rect width="800" height="600" fill="url(#skyGrad)" />

      {/* Yıldızlar */}
      {[
        [80, 40], [150, 25], [220, 55], [310, 15], [380, 45], [450, 20],
        [520, 60], [600, 30], [670, 50], [730, 20], [760, 70], [50, 80],
        [120, 90], [280, 35], [490, 80], [640, 15], [700, 85], [30, 110],
        [180, 75], [350, 90], [560, 40], [420, 95], [790, 45], [240, 110],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={i % 3 === 0 ? 1.5 : 1}
          fill="white"
          fillOpacity={0.5 + (i % 4) * 0.12}
          filter="url(#glow)"
        />
      ))}

      {/* Ay */}
      <circle cx="660" cy="80" r="45" fill="#c8e6c9" fillOpacity="0.08" />
      <circle cx="660" cy="80" r="30" fill="#e8f5e9" fillOpacity="0.12" />
      <circle cx="660" cy="80" r="18" fill="#f1f8e9" fillOpacity="0.2" />
      <circle cx="655" cy="75" r="14" fill="url(#skyGrad)" fillOpacity="0.85" />

      {/* Uzak dağlar (arka) */}
      <path
        d="M0,350 L60,200 L130,270 L200,160 L280,240 L350,130 L420,210 L490,150 L560,220 L620,170 L700,230 L760,180 L800,210 L800,380 L0,380 Z"
        fill="url(#mountainGrad)"
        fillOpacity="0.6"
        filter="url(#blur)"
      />

      {/* Orta dağlar */}
      <path
        d="M0,400 L80,260 L160,310 L250,200 L340,270 L410,190 L490,260 L570,210 L650,280 L720,230 L800,270 L800,420 L0,420 Z"
        fill="url(#mountain2Grad)"
        fillOpacity="0.8"
      />

      {/* Ön ağaçlar — sol grup */}
      {[
        { x: 20, h: 160, w: 28 },
        { x: 55, h: 190, w: 24 },
        { x: 85, h: 140, w: 22 },
        { x: 115, h: 175, w: 26 },
      ].map((tree, i) => (
        <g key={`ltree-${i}`}>
          <rect x={tree.x + tree.w / 2 - 3} y={580 - 40} width="6" height="40" fill="#1a2e1a" />
          <ellipse cx={tree.x + tree.w / 2} cy={580 - tree.h / 2 - 20} rx={tree.w / 2} ry={tree.h / 2} fill="#1b5e20" />
          <ellipse cx={tree.x + tree.w / 2} cy={580 - tree.h / 2 - 35} rx={tree.w / 2 - 4} ry={tree.h / 2 - 20} fill="#2e7d32" />
        </g>
      ))}

      {/* Ön ağaçlar — sağ grup */}
      {[
        { x: 650, h: 150, w: 26 },
        { x: 685, h: 185, w: 28 },
        { x: 720, h: 135, w: 22 },
        { x: 755, h: 170, w: 24 },
      ].map((tree, i) => (
        <g key={`rtree-${i}`}>
          <rect x={tree.x + tree.w / 2 - 3} y={580 - 40} width="6" height="40" fill="#1a2e1a" />
          <ellipse cx={tree.x + tree.w / 2} cy={580 - tree.h / 2 - 20} rx={tree.w / 2} ry={tree.h / 2} fill="#1b5e20" />
          <ellipse cx={tree.x + tree.w / 2} cy={580 - tree.h / 2 - 35} rx={tree.w / 2 - 4} ry={tree.h / 2 - 20} fill="#2e7d32" />
        </g>
      ))}

      {/* Göl yansıması */}
      <ellipse cx="400" cy="530" rx="220" ry="40" fill="url(#waterGrad)" />
      <path d="M200,520 Q280,510 400,515 Q520,510 600,520 Q520,530 400,535 Q280,530 200,520 Z" fill="#1565c0" fillOpacity="0.15" />

      {/* Ay yansıması sularda */}
      <ellipse cx="400" cy="535" rx="20" ry="6" fill="#e8f5e9" fillOpacity="0.12" />

      {/* Zemin */}
      <path
        d="M0,490 Q200,470 400,480 Q600,470 800,490 L800,600 L0,600 Z"
        fill="url(#groundGrad)"
      />

      {/* Hafif sis efekti (altta) */}
      <rect x="0" y="450" width="800" height="80" fill="white" fillOpacity="0.03" filter="url(#blur)" />
    </svg>
  );
}

export default function LoginPage({ params: _params }: LoginPageProps) {
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
    <div className="flex min-h-screen">
      {/* Sol: Doğa görseli */}
      <div className="relative hidden lg:flex lg:w-3/5 xl:w-2/3">
        <NatureBackground />
        {/* Overlay gradient — sağa doğru solar */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-950/80" />
        {/* Logo — sol alt */}
        <div className="absolute bottom-10 left-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 backdrop-blur">
            <Leaf className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">SCALD</p>
            <p className="text-xs text-emerald-300/80">Sustainable Cities & Local Development</p>
          </div>
        </div>
      </div>

      {/* Sağ: Login formu */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-8 py-12">
        {/* Mobilde logo */}
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <p className="text-xl font-bold text-white">SCALD</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Hoş Geldiniz</h1>
            <p className="mt-1 text-sm text-slate-400">
              Sisteme erişmek için giriş yapın
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* E-posta */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ornek@belediye.gov.tr"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Şifre */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Hata mesajı */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition',
                loading
                  ? 'cursor-not-allowed bg-emerald-700/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
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
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          {/* Rol bilgisi */}
          <div className="mt-8 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="mb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Demo Hesaplar</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Admin</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Tüm yetkiler
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Belediye Kullanıcısı</span>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  Kendi belediyesi
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Vatandaş</span>
                <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  Sadece görüntüleme
                </span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            © 2025 SCALD · EU Funded Project
          </p>
        </div>
      </div>
    </div>
  );
}
