import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  Home,
  Users,
  CreditCard,
  Award,
  CalendarCheck,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  GraduationCap
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
  { name: 'Inicio', path: '/dashboard', icon: Home },
  { name: 'Alumnos', path: '/dashboard/alumnos', icon: Users },
  { name: 'Pagos', path: '/dashboard/pagos', icon: CreditCard },
  { name: 'Grados y Ascensos', path: '/dashboard/cinturones', icon: Award },
  { name: 'Asistencia', path: '/dashboard/asistencia', icon: CalendarCheck },
  { name: 'Horarios', path: '/dashboard/horarios', icon: Clock },
  { name: 'Profesores', path: '/dashboard/profesores', icon: GraduationCap },
];

export default function DashboardLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden font-sans relative transition-colors duration-500">
      {/* Sidebar */}
      <aside
        className={`relative z-20 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Header & Toggle */}
        <div className={`h-24 flex items-center border-b border-slate-200 dark:border-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'
          }`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
              <img src="/logo-fertex.webp" alt="Fertex Logo" className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10" />
              <span className="font-bold tracking-tight truncate">Fertex Admin</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors border dark:border-white/10 shrink-0 group"
          >
            {isCollapsed ? (
              <Menu className="w-5 h-5 text-slate-500 group-hover:text-slate-900 dark:text-white/70 dark:group-hover:text-white transition-colors" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900 dark:text-white/70 dark:group-hover:text-white transition-colors" />
            )}
          </button>
        </div>

        {/* Nav Links */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-6 flex flex-col gap-2 custom-scrollbar ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                title={isCollapsed ? item.name : ''}
                className={`group relative flex items-center h-12 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden active:scale-95 ${isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white'
                  } ${isCollapsed ? 'justify-center w-14 mx-auto' : 'px-4 w-full'}`}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-red-600 rounded-r-full" />
                )}

                <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-500 ${isActive ? 'text-red-500' : 'group-hover:scale-110'
                  }`} />

                {!isCollapsed && (
                  <span className="ml-4 font-medium whitespace-nowrap text-sm tracking-wide">
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Theme & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">

          <button
            onClick={toggleTheme}
            title={isCollapsed ? (isDark ? 'Modo Claro' : 'Modo Oscuro') : ''}
            className={`group relative flex items-center h-12 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white overflow-hidden active:scale-95 ${isCollapsed ? 'justify-center w-14 mx-auto' : 'px-4 w-full'
              }`}
          >
            <div className="w-5 h-5 shrink-0 flex items-center justify-center relative">
              {isDark ? (
                <Sun className="w-5 h-5 transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110" />
              ) : (
                <Moon className="w-5 h-5 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" />
              )}
            </div>
            {!isCollapsed && (
              <span className="ml-4 font-medium whitespace-nowrap text-sm tracking-wide">
                {isDark ? 'Modo Claro' : 'Modo Oscuro'}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Cerrar Sesión' : ''}
            className={`group relative flex items-center h-12 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] text-slate-500 hover:bg-slate-200/50 hover:text-red-600 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-red-500 overflow-hidden active:scale-95 ${isCollapsed ? 'justify-center w-14 mx-auto' : 'px-4 w-full'
              }`}
          >
            <LogOut className="w-5 h-5 shrink-0 transition-all duration-500 group-hover:-translate-x-1" />
            {!isCollapsed && (
              <span className="ml-4 font-medium whitespace-nowrap text-sm tracking-wide">
                Cerrar Sesión
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 lg:p-12" id="main-scroll-container">
          <div className={`mx-auto transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] w-full ${isCollapsed ? 'max-w-[1600px]' : 'max-w-[1440px]'}`}>
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}
