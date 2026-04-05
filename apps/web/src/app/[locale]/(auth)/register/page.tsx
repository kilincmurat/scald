'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Leaf, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function RegisterPage({ params: _params }: PageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const passwordStrength = (pw: string) => {
    if (pw.length === 0) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = passwordStrength(password);
  const strengthLabel = ['', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-600'][strength];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'citizen' },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Bu e-posta adresi zaten kayıtlı.');
      } else {
        setError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Kayıt Başarılı!</h2>
          <p className="mt-2 text-sm text-slate-500">
            E-posta adresinize bir doğrulama bağlantısı gönderdik. Lütfen e-postanızı kontrol edin.
          </p>
          <button
            onClick={() => router.push('login')}
            className="mt-6 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-6 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <p className="text-lg font-bold text-slate-900">SCALD</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          {/* Başlık */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Hesap Oluştur</h1>
            <p className="mt-1 text-sm text-slate-500">
              Vatandaş olarak sisteme kaydolun
            </p>
          </div>

          {/* Vatandaş rolü bilgisi */}
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200">
              <span className="text-[10px] font-bold text-slate-600">i</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Vatandaş hesabı ile ekolojik göstergeleri ve raporları görüntüleyebilirsiniz.
              Belediye yetkilisi iseniz sistem yöneticinize başvurun.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Ad Soyad */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Ad Soyad
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Adınız Soyadınız"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>

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
                placeholder="ornek@mail.com"
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
                  autoComplete="new-password"
                  placeholder="En az 8 karakter"
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
              {/* Şifre güç göstergesi */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={clsx(
                          'h-1 flex-1 rounded-full transition-all',
                          i <= strength ? strengthColor : 'bg-slate-200'
                        )}
                      />
                    ))}
                  </div>
                  <p className={clsx('mt-1 text-[10px] font-medium', {
                    'text-red-500': strength === 1,
                    'text-amber-500': strength === 2,
                    'text-emerald-600': strength >= 3,
                  })}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Şifre tekrar */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Şifre Tekrar
              </label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Şifrenizi tekrar girin"
                  className={clsx(
                    'w-full rounded-lg border bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:bg-white focus:ring-2',
                    passwordConfirm.length > 0 && password !== passwordConfirm
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/15'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordConfirm.length > 0 && password !== passwordConfirm && (
                <p className="mt-1 text-[10px] text-red-500">Şifreler eşleşmiyor.</p>
              )}
            </div>

            {/* Hata */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Kayıt ol butonu */}
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
                  Kaydediliyor...
                </span>
              ) : 'Kayıt Ol'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Zaten hesabınız var mı?{' '}
            <Link
              href="login"
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Giriş Yapın
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          © 2025 SCALD · EU Funded Project
        </p>
      </div>
    </div>
  );
}
