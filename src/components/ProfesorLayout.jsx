import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfesorLayout({ children }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden font-sans relative transition-colors duration-500">
      {/* Top Navigation Bar - Compact for Mobile */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] transition-all duration-700">
        <div className="flex items-center gap-3">
          <img src="/logo-fertex.webp" alt="Fertex Logo" className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10" />
          <div className="flex flex-col justify-center leading-none">
            <h1 className="font-bold tracking-tight text-lg">Fertex <span className="text-red-600">Prof.</span></h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-slate-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 sm:w-auto sm:px-6 sm:h-10 rounded-full bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 text-red-600 dark:text-red-600 font-bold hover:bg-slate-200 dark:hover:bg-white/5 transition-all duration-300 active:scale-95"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline sm:ml-2">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Content Area - Mobile Optimized */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar" id="profesor-main-scroll">
          <div className="mx-auto w-full max-w-3xl transition-all duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
