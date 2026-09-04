import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Clock, Calendar, Users, Loader2, ChevronRight } from 'lucide-react';

const DIAS_MAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function ProfesorHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getTodayString = () => {
    const d = new Date();
    return DIAS_MAP[d.getDay()]; // Ej. 'Lunes'
  };

  useEffect(() => {
    fetchHorariosHoy();
  }, []);

  const fetchHorariosHoy = async () => {
    try {
      setLoading(true);
      const hoy = getTodayString();
      
      const { data, error } = await supabase
        .from('horarios')
        .select('*, profesores(nombre, apellidos)')
        .order('hora_inicio', { ascending: true });

      if (error) throw error;

      // Filter local
      const horariosHoy = (data || []).filter(h => h.dias && h.dias.includes(hoy));
      
      setHorarios(horariosHoy);
    } catch (error) {
      console.error('Error fetching horarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const handleSelectHorario = (horario) => {
    navigate(`/profesor/asistencia/${horario.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      
      <header className="flex flex-col gap-2 text-center items-center mt-2">
        <div className="w-16 h-16 bg-slate-100 dark:bg-[#1A1A1A] rounded-full flex items-center justify-center border border-slate-200 dark:border-white/10 mb-1 shadow-sm">
          <Calendar className="w-7 h-7 text-red-600 dark:text-red-600" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mis Clases Hoy
        </h1>
        <p className="text-base text-slate-500 dark:text-white/60 font-medium">
          {getTodayString()}, {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        </div>
      ) : horarios.length === 0 ? (
        <div className="p-1 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm w-full">
          <div className="bg-white dark:bg-slate-800 rounded-[calc(1.5rem-0.25rem)] flex flex-col w-full min-h-[250px] items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-slate-400 dark:text-white/30" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No hay clases hoy
            </h3>
            <p className="text-sm text-slate-500 dark:text-white/60">
              Parece que no tienes horarios registrados para el día de hoy.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {horarios.map((horario) => (
            <button
              key={horario.id}
              onClick={() => handleSelectHorario(horario)}
              className="group relative flex flex-col p-5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 border-l-[4px] border-l-red-600 dark:border-l-red-600 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden text-left active:scale-[0.98]"
            >
              <div className="flex flex-col gap-3 w-full">
                <div className="flex justify-between items-center gap-2 w-full">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {horario.nombre}
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-200 dark:bg-white/5 dark:group-hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:text-white/40 dark:group-hover:text-white" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-white/80 font-medium text-base">
                    <Clock className="w-5 h-5 text-red-500 dark:text-red-400" />
                    <span>{formatTime(horario.hora_inicio)} - {formatTime(horario.hora_fin)}</span>
                  </div>
                  
                  {horario.profesores && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-white/60 font-medium text-sm">
                      <Users className="w-4 h-4 opacity-70" />
                      <span>{horario.profesores.nombre} {horario.profesores.apellidos}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
