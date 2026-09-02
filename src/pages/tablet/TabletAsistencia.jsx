import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { ChevronLeft, CheckCircle, Loader2, Users, Check, XCircle } from 'lucide-react';
import { getDisciplinaColor } from '../../utils/constants';

const getLocalDateString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function TabletAsistencia() {
  const { horarioId } = useParams();
  const navigate = useNavigate();
  
  const [horario, setHorario] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [asistenciasHoy, setAsistenciasHoy] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);

  useEffect(() => {
    if (horarioId) {
      fetchData();
    }
  }, [horarioId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Horario Info
      const { data: horarioData, error: horarioError } = await supabase
        .from('horarios')
        .select('*')
        .eq('id', horarioId)
        .single();
        
      if (horarioError) throw horarioError;
      setHorario(horarioData);

      // 2. Fetch Alumnos para este horario
      const { data: alumnosDataRaw, error: alumnosError } = await supabase
        .from('alumnos')
        .select(`
          id, nombre, apellidos, disciplina, estado, cinturon,
          horarios!inner(id),
          asistencias ( id, fecha_asistencia )
        `)
        .eq('estado', 'Activo')
        .eq('horarios.id', horarioId)
        .order('nombre', { ascending: true });

      if (alumnosError) throw alumnosError;

      const dateParts = getLocalDateString().split('-');
      const targetDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const targetStart = targetDate.getTime();
      const targetEndObj = new Date(targetDate);
      targetEndObj.setHours(23, 59, 59, 999);
      const targetEnd = targetEndObj.getTime();

      const attendedTodaySet = new Set();

      const alumnosProcessed = (alumnosDataRaw || []).map(a => {
        if (a.asistencias && a.asistencias.length > 0) {
          const hasAttendedToday = a.asistencias.some(att => {
            const time = new Date(att.fecha_asistencia).getTime();
            return time >= targetStart && time <= targetEnd;
          });

          if (hasAttendedToday) {
            attendedTodaySet.add(a.id);
          }
        }
        return a;
      });

      setAsistenciasHoy(attendedTodaySet);
      setAlumnos(alumnosProcessed);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarAsistencia = async (alumnoId) => {
    if (asistenciasHoy.has(alumnoId)) return; // Prevents double click
    
    try {
      setMarkingId(alumnoId);

      const dateParts = getLocalDateString().split('-');
      const insertDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      insertDate.setHours(12, 0, 0, 0);

      const { error } = await supabase
        .from('asistencias')
        .insert([{ alumno_id: alumnoId, estado: 'Presente', fecha_asistencia: insertDate.toISOString() }]);

      if (error) throw error;

      setAsistenciasHoy(prev => new Set([...prev, alumnoId]));
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Error al registrar asistencia.');
    } finally {
      setMarkingId(null);
    }
  };

  // We allow un-marking just in case they clicked by mistake
  const handleDesmarcarAsistencia = async (alumnoId) => {
    try {
      setMarkingId(alumnoId);
      
      const dateParts = getLocalDateString().split('-');
      const targetDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      targetDate.setHours(0, 0, 0, 0);
      const targetStartIso = targetDate.toISOString();
      const targetEndObj = new Date(targetDate);
      targetEndObj.setHours(23, 59, 59, 999);
      const targetEndIso = targetEndObj.toISOString();

      const { error } = await supabase
        .from('asistencias')
        .delete()
        .eq('alumno_id', alumnoId)
        .gte('fecha_asistencia', targetStartIso)
        .lte('fecha_asistencia', targetEndIso);

      if (error) throw error;

      setAsistenciasHoy(prev => {
        const next = new Set(prev);
        next.delete(alumnoId);
        return next;
      });
    } catch (error) {
      console.error('Error undoing attendance:', error);
      alert('Error al anular asistencia.');
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
        <Loader2 className="w-16 h-16 text-red-600 animate-spin" />
        <p className="text-xl font-medium text-slate-500 dark:text-white/60">Cargando alumnos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-6 w-full sm:w-auto">
          <button
            onClick={() => navigate('/tablet/horarios')}
            className="w-16 h-16 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 active:scale-95"
          >
            <ChevronLeft className="w-8 h-8 text-slate-700 dark:text-white" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {horario?.nombre || 'Clase'}
            </h1>
            <p className="text-lg text-slate-500 dark:text-white/60 font-medium">
              Lista de asistencia
            </p>
          </div>
        </div>
        
        <div className="bg-slate-100 dark:bg-white/5 px-6 py-4 rounded-2xl flex items-center gap-4 w-full sm:w-auto justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white leading-none mb-1">
              {asistenciasHoy.size} / {alumnos.length}
            </div>
            <div className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-white/50">
              Presentes
            </div>
          </div>
        </div>
      </header>

      {alumnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200 dark:border-white/10">
          <Users className="w-20 h-20 text-slate-300 dark:text-white/20 mb-6" />
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Sin alumnos inscritos</h3>
          <p className="text-lg text-slate-500 dark:text-white/60">No hay alumnos asignados a este horario.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {alumnos.map((alumno) => {
            const hasAttended = asistenciasHoy.has(alumno.id);
            const isMarking = markingId === alumno.id;

            return (
              <div 
                key={alumno.id} 
                className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all duration-300 ${
                  hasAttended 
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10'
                }`}
              >
                <div className="flex flex-col gap-1 overflow-hidden pr-4">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                    {alumno.nombre} {alumno.apellidos}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-sm font-bold text-slate-800 dark:text-white/90">
                      {alumno.cinturon}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${getDisciplinaColor(alumno.disciplina || 'Taekwondo')}`}></span>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {alumno.disciplina || 'Taekwondo'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => hasAttended ? handleDesmarcarAsistencia(alumno.id) : handleMarcarAsistencia(alumno.id)}
                  disabled={isMarking}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 active:scale-95 ${
                    isMarking 
                      ? 'bg-slate-200 dark:bg-white/10'
                      : hasAttended
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-100 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-600 dark:text-white/30 dark:hover:text-red-500 border-2 border-transparent hover:border-red-200 dark:hover:border-red-500/30'
                  }`}
                >
                  {isMarking ? (
                    <Loader2 className="w-8 h-8 animate-spin" strokeWidth={3} />
                  ) : hasAttended ? (
                    <Check className="w-10 h-10" strokeWidth={3} />
                  ) : (
                    <CheckCircle className="w-10 h-10" strokeWidth={2} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
