import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function TabletLayout({ children }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden font-sans relative transition-colors duration-500">
      {/* Top Navigation Bar */}
      <header className="h-24 flex items-center justify-between px-6 md:px-12 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] transition-all duration-700">
        <div className="flex items-center gap-4">
          <img src="/logo-fertex.webp" alt="Fertex Logo" className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10" />
          <div>
            <h1 className="font-bold tracking-tight text-2xl">Fertex <span className="text-red-600">Tablet</span></h1>
            <span className="text-sm uppercase tracking-widest text-slate-500 dark:text-white/50 font-semibold">Toma de Asistencia</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 transition-colors"
          >
            {isDark ? (
              <Sun className="w-7 h-7 text-slate-400" />
            ) : (
              <Moon className="w-7 h-7 text-slate-600" />
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-slate-100 text-red-600 font-bold hover:bg-red-50 dark:bg-red-600/10 dark:hover:bg-red-600/20 border border-red-200 dark:border-red-500/20 transition-all duration-300 active:scale-95"
          >
            <LogOut className="w-6 h-6" />
            <span className="hidden sm:inline text-lg">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar" id="tablet-main-scroll">
          <div className="mx-auto w-full max-w-[1400px] transition-all duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
