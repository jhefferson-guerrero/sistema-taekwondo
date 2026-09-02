import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Clock, Calendar, Users, Loader2, ChevronRight } from 'lucide-react';

const DIAS_MAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function TabletHorarios() {
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

      // Filter local as postgres doesn't support jsonb array string matching easily in select sometimes
      const horariosHoy = (data || []).filter(h => h.dias && h.dias.includes(hoy));
      
      setHorarios(horariosHoy);
    } catch (error) {
      console.error('Error fetching horarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format time (e.g., "15:00:00" to "15:00")
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const handleSelectHorario = (horario) => {
    // Navigates to the attendance screen for this specific schedule
    navigate(`/tablet/asistencia/${horario.id}`);
  };

  return (
    <div className="flex flex-col gap-10">
      
      <header className="flex flex-col gap-4 text-center items-center mt-4">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center border border-red-200 dark:border-red-500/20 mb-2">
          <Calendar className="w-10 h-10 text-red-600 dark:text-red-500" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          Horarios de Hoy
        </h1>
        <p className="text-xl text-slate-500 dark:text-white/60 font-medium">
          {getTodayString()} - {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        </div>
      ) : horarios.length === 0 ? (
        <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[3rem] shadow-xl backdrop-blur-xl w-full">
          <div className="bg-white dark:bg-slate-800 rounded-[calc(3rem-0.375rem)] flex flex-col w-full relative min-h-[400px] items-center justify-center text-center p-12">
            <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 text-slate-400 dark:text-white/30" />
            </div>
            <h3 className="text-3xl font-semibold text-slate-900 dark:text-white mb-4">
              No hay clases hoy
            </h3>
            <p className="text-xl text-slate-500 dark:text-white/60">
              Parece que no hay horarios registrados para el día de hoy.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {horarios.map((horario) => (
            <button
              key={horario.id}
              onClick={() => handleSelectHorario(horario)}
              className="group relative flex flex-col p-8 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[2.5rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_30px_60px_-12px_rgba(255,255,255,0.1)] overflow-hidden text-left active:scale-[0.98]"
            >
              <div className="flex flex-col gap-6 w-full">
                <div className="flex justify-between items-start gap-4 w-full">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                    {horario.nombre}
                  </h3>
                  <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-red-100 dark:bg-white/5 dark:group-hover:bg-red-500/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-red-600 dark:text-white/40 dark:group-hover:text-red-500" strokeWidth={3} />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-slate-700 dark:text-white/80 font-medium text-xl bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                    <Clock className="w-6 h-6 text-red-500 dark:text-red-400" />
                    <span>{formatTime(horario.hora_inicio)} - {formatTime(horario.hora_fin)}</span>
                  </div>
                  
                  {horario.profesores && (
                    <div className="flex items-center gap-3 text-slate-600 dark:text-white/60 font-medium text-lg px-2">
                      <Users className="w-5 h-5 opacity-70" />
                      <span>Prof. {horario.profesores.nombre} {horario.profesores.apellidos}</span>
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
