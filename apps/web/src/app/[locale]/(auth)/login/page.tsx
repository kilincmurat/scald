'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, Building2, Cpu, Leaf, BarChart3, Globe2 } from 'lucide-react';
import { clsx } from 'clsx';

const features = [
  {
    icon: Leaf,
    title: 'Ekolojik Ayak İzi',
    desc: '15 ana gösterge ile belediyenizin çevresel performansını ölçün',
  },
  {
    icon: Cpu,
    title: 'AI Karar Desteği',
    desc: 'Yapay zeka ile 30+ strateji üretin, iklim adaptasyon skorunuzu artırın',
  },
  {
    icon: BarChart3,
    title: 'Otomatik Raporlama',
    desc: 'Şeffaf ve veri odaklı stratejik raporları tek tıkla oluşturun',
  },
  {
    icon: Globe2,
    title: '5 Dil Desteği',
    desc: 'TR · EN · EL · RO · MK — tüm ortaklık ülkelerinde kullanılabilir',
  },
];

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
    <div className="flex min-h-screen">

      {/* ── Sol Panel ── */}
      <div className="relative hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col overflow-hidden bg-gradient-to-br from-[#0d3b6e] via-[#1056a0] to-[#0d7a4e]">

        {/* Arka plan desen */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, #38bdf8 0%, transparent 45%),
                              radial-gradient(circle at 75% 70%, #34d399 0%, transparent 40%),
                              radial-gradient(circle at 55% 15%, #facc15 0%, transparent 30%)`,
          }}
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-1 flex-col px-12 py-10">

          {/* Başlık + Logo */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-white leading-snug">
              Yerel Yönetimler için<br />
              <span className="text-emerald-300">İklim Uyum Platformu</span>
            </h1>
            <p className="mt-3 text-base text-blue-100/80 leading-relaxed max-w-sm">
              Veriye dayalı kararlar alın, ekolojik performansınızı artırın
              ve sürdürülebilir bir gelecek için stratejiler geliştirin.
            </p>
          </div>

          {/* Özellik listesi */}
          <div className="mt-10 grid grid-cols-1 gap-4 max-w-md">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3.5 rounded-xl bg-white/8 border border-white/10 px-4 py-3.5 backdrop-blur-sm">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/20">
                    <Icon className="h-4 w-4 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 text-xs text-blue-100/70 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alt bilgi */}
          <div className="mt-auto pt-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {['TR', 'GR', 'RO', 'MK'].map((c) => (
                    <span key={c} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 text-[9px] font-bold text-white">
                      {c}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-blue-100/60">4 ülke ortaklığı</span>
              </div>
              <span className="text-white/20">·</span>
              <span className="text-xs text-blue-100/60">EU Funded · Horizon 2024</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-200/40" />
              <span className="text-xs text-blue-100/40">
                Strengthening Climate Adaption of Local Governments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sağ Panel — Form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-12">

        <div className="w-full max-w-[360px]">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/images/logo.jpeg"
              alt="SCALD Logo"
              width={240}
              height={60}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">Hoş Geldiniz</h2>
            <p className="mt-1 text-sm text-slate-500">Sisteme erişmek için giriş yapın</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

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
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
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

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition',
                loading
                  ? 'cursor-not-allowed bg-blue-400'
                  : 'bg-[#1056a0] hover:bg-[#0d3b6e] active:bg-[#0a2d54]'
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

          <p className="mt-5 text-center text-sm text-slate-500">
            Hesabınız yok mu?{' '}
            <Link href="register" className="font-semibold text-[#1056a0] hover:text-[#0d3b6e] transition">
              Kayıt Olun
            </Link>
          </p>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            © 2026 SCALD · EU Funded Project
          </p>
        </div>
      </div>
    </div>
  );
}
