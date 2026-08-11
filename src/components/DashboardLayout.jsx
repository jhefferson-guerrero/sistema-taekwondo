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
  Menu
} from 'lucide-react';

const navItems = [
  { name: 'Inicio', path: '/dashboard', icon: Home },
  { name: 'Alumnos', path: '/dashboard/alumnos', icon: Users },
  { name: 'Pagos', path: '/dashboard/pagos', icon: CreditCard },
  { name: 'Cinturones y Ascensos', path: '/dashboard/cinturones', icon: Award },
  { name: 'Asistencia', path: '/dashboard/asistencia', icon: CalendarCheck },
  { name: 'Horarios', path: '/dashboard/horarios', icon: Clock },
];

export default function DashboardLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#050505] text-white overflow-hidden font-sans relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Sidebar */}
      <aside 
        className={`relative z-20 flex flex-col border-r border-white/10 bg-white/[0.02] backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Header & Toggle */}
        <div className={`h-24 flex items-center border-b border-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isCollapsed ? 'justify-center px-0' : 'justify-between px-6'
        }`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shrink-0" />
              <span className="font-bold tracking-tight truncate">Fertex Admin</span>
            </div>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors border border-white/10 shrink-0 group"
          >
            {isCollapsed ? (
              <Menu className="w-5 h-5 text-white/70 group-hover:text-white" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-white/70 group-hover:text-white" />
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
                className={`group relative flex items-center h-12 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                } ${isCollapsed ? 'justify-center w-14 mx-auto' : 'px-4 w-full'}`}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-red-600 rounded-r-full" />
                )}
                
                <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-500 ${
                  isActive ? 'text-red-500' : 'group-hover:scale-110'
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

        {/* Footer / Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Cerrar Sesión' : ''}
            className={`group relative flex items-center h-12 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] text-white/50 hover:bg-red-500/10 hover:text-red-500 overflow-hidden ${
              isCollapsed ? 'justify-center w-14 mx-auto' : 'px-4 w-full'
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform duration-500" />
            {!isCollapsed && (
              <span className="ml-4 font-medium whitespace-nowrap text-sm tracking-wide">
                Cerrar Sesión
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] fill-mode-both">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}
