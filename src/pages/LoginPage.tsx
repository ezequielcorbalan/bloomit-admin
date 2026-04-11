import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import logoIcon from '/logo-icon.png';
import logoFull from '/logo-full.png';

const TURNSTILE_SITE_KEY = '0x4AAAAAAC8JypaktJ3fFkyF';

interface LoginPageProps {
  onLogin: (email: string, password: string, turnstileToken: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@bloomit.com.ar')) {
      setError('Solo se permiten cuentas @bloomit.com.ar');
      return;
    }

    if (!turnstileToken) {
      setError('Completá la verificación CAPTCHA');
      return;
    }

    setLoading(true);
    try {
      await onLogin(email, password, turnstileToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      setTurnstileToken(null); // reset on failure so user retries
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-large p-8 border border-neutral-300">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-soft bg-neutral-200 flex items-center justify-center p-2">
              <img src={logoIcon} alt="Bloomit" className="w-full h-full object-contain" />
            </div>
            <img src={logoFull} alt="Bloomit" className="h-8 object-contain mb-1" />
            <p className="text-sm text-neutral-500 mt-1">Panel de superadministración</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                Email corporativo
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@bloomit.com.ar"
                required
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50"
              />
            </div>

            <div className="flex justify-center">
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            </div>

            {error && (
              <div className="bg-accent-coral/10 border border-accent-coral/30 rounded-lg px-4 py-3 text-sm text-accent-coral-dark">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-neutral-500 mt-6">
            Acceso restringido a personal de Bloomit
          </p>
        </div>
      </div>
    </div>
  );
}
