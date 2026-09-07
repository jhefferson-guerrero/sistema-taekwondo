import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Verificar la sesión actual
    const checkSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const { data: roleData } = await supabase
          .from('usuarios_roles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setUserRole(roleData?.role || 'admin');
      }
      setLoading(false);
    };

    checkSessionAndRole();

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const { data: roleData } = await supabase
          .from('usuarios_roles')
          .select('role')
          .eq('id', newSession.user.id)
          .single();
        setUserRole(roleData?.role || 'admin');
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirigir según el rol real del usuario
    if (userRole === 'profesor') {
      return <Navigate to="/profesor/horarios" replace />;
    } else if (userRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    } else {
      // Si el rol no es válido (ej. "tablet" u otro) y no tiene permiso, lo enviamos al login o le mostramos un error
      // para evitar un bucle infinito de redirección.
      return (
        <div className="min-h-[100dvh] w-full bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
            <p className="text-slate-500 mb-6">Tu tipo de cuenta ({userRole}) no tiene una vista asignada en el sistema actualmente.</p>
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="bg-red-600 text-white font-bold py-2 px-6 rounded-full w-full"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
}
