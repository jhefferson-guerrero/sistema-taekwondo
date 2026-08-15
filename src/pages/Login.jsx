import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ArrowRight, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error('Credenciales incorrectas o error de conexión');
      }

      if (data.session) {
        navigate('/dashboard');
      }
    } catch (err) {
      // Cero fuga de información: Mensaje genérico
      setError('Credenciales incorrectas o error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500">

      <div className="w-full max-w-md flex flex-col items-center gap-8 md:gap-10 z-10 py-8">

        {/* Top Logo Space */}
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-8 duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:shadow-none flex items-center justify-center transition-colors duration-500">
            <div className="w-8 h-8 bg-red-600 rounded-full" /> {/* Placeholder Logo */}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium tracking-[0.2em] uppercase text-slate-500 dark:text-white/50 text-center">Admin Portal</span>
            <h1 className="text-2xl font-bold tracking-tight text-center text-slate-900 dark:text-white transition-colors duration-500">TaekwondoFertex</h1>
          </div>
        </div>

        {/* Login Container (Double-Bezel Architecture) */}
        <div className="w-full">

          {/* Outer Shell */}
          <div className="p-2 bg-white/50 border border-slate-200 border-t-[4px] border-t-red-600 dark:bg-white/[0.02] dark:border-white/10 dark:border-t-red-600 rounded-[2rem] shadow-xl dark:shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150 ease-[cubic-bezier(0.32,0.72,0,1)] fill-mode-both transition-colors">

            {/* Inner Core */}
            <div className="p-8 sm:p-10 bg-white dark:bg-[#0a0a0a] rounded-[calc(2rem-0.5rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-8 relative overflow-hidden transition-colors duration-500">

              <div className="flex flex-col gap-2 relative z-10">
                <h2 className="text-3xl font-semibold tracking-tight">Acceder</h2>
                <p className="text-slate-500 dark:text-white/40 text-sm transition-colors duration-500">Ingresa tus credenciales para continuar al panel de administración.</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-4 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-5 relative z-10">

                <div className="flex flex-col gap-4">
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-slate-400 dark:text-white/30 group-focus-within/input:text-red-500 transition-colors duration-500" strokeWidth={1.5} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="Correo electrónico"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-red-500 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    />
                  </div>

                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-slate-400 dark:text-white/30 group-focus-within/input:text-red-500 transition-colors duration-500" strokeWidth={1.5} />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      placeholder="Contraseña"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:bg-white dark:focus:bg-white/10 focus:ring-1 focus:ring-red-500 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex items-center justify-between bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black px-6 py-4 rounded-full mt-2 font-medium dark:hover:bg-gray-100 transition-all duration-300 ease-in-out active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="relative z-10 flex-1 text-left pl-2">
                    {loading ? 'Autenticando...' : 'Ingresar al sistema'}
                  </span>

                  {/* Nested Icon Wrapper */}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 dark:bg-black/10 flex items-center justify-center dark:group-hover:bg-black/20 transition-colors duration-500 shrink-0">
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
                    ) : (
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-[1px] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" strokeWidth={2} />
                    )}
                  </div>

                  {/* Subtle hover fill effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/5 to-red-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
