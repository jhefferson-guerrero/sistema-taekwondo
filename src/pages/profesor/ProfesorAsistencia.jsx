import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { ChevronLeft, CheckCircle, Loader2, Users, Check, Snowflake, UserPlus } from 'lucide-react';
import { getDisciplinaColor } from '../../utils/constants';

const METODOS_PAGO_LIBRE = ['Efectivo', 'Yape', 'Plin'];

const getLocalDateString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function ProfesorAsistencia() {
  const { horarioId } = useParams();
  const navigate = useNavigate();
  
  const [horario, setHorario] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [asistenciasHoy, setAsistenciasHoy] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);

  // Clase libre
  const [isLibreModalOpen, setIsLibreModalOpen] = useState(false);
  const [metodoLibre, setMetodoLibre] = useState('Efectivo');
  const [savingLibre, setSavingLibre] = useState(false);
  const [libresRegistradas, setLibresRegistradas] = useState(0);

  useEffect(() => {
    if (horarioId) {
      fetchData();
    }
  }, [horarioId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: horarioData, error: horarioError } = await supabase
        .from('horarios')
        .select('*')
        .eq('id', horarioId)
        .single();
        
      if (horarioError) throw horarioError;
      setHorario(horarioData);

      const { data: alumnosDataRaw, error: alumnosError } = await supabase
        .from('alumnos')
        .select(`
          id, nombre, apellidos, disciplina, estado, cinturon,
          horarios!inner(id),
          asistencias ( id, fecha_asistencia, estado )
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
        let isFrozenToday = false;
        if (a.asistencias && a.asistencias.length > 0) {
          const hasAttendedToday = a.asistencias.some(att => {
            const time = new Date(att.fecha_asistencia).getTime();
            return time >= targetStart && time <= targetEnd && (!att.estado || att.estado === 'Presente');
          });

          isFrozenToday = a.asistencias.some(att => {
            const time = new Date(att.fecha_asistencia).getTime();
            return time >= targetStart && time <= targetEnd && att.estado === 'Congelado';
          });

          if (hasAttendedToday) {
            attendedTodaySet.add(a.id);
          }
        }
        return { ...a, is_frozen_today: isFrozenToday };
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
    if (asistenciasHoy.has(alumnoId)) return; 
    
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
        .or('estado.eq.Presente,estado.is.null')
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

  const handleRegistrarClaseLibre = async () => {
    try {
      setSavingLibre(true);

      const { error } = await supabase.rpc('registrar_clase_libre', {
        p_horario_id: horarioId,
        p_metodo_pago: metodoLibre
      });

      if (error) throw error;

      setIsLibreModalOpen(false);
      setMetodoLibre('Efectivo');
      setLibresRegistradas(prev => prev + 1);
    } catch (error) {
      console.error('Error registering free class:', error);
      alert('Error al registrar la clase libre.');
    } finally {
      setSavingLibre(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        <p className="text-lg font-medium text-slate-500 dark:text-white/60">Cargando alumnos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      
      <header className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-white/10 border-t-[4px] border-t-red-600 dark:border-t-red-600 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/profesor/horarios')}
            className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-slate-700 dark:text-white" />
          </button>
          <div className="flex-1 overflow-hidden">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {horario?.nombre || 'Clase'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/60 font-medium">
              Asistencia
            </p>
          </div>
        </div>
        
        <div className="bg-slate-100 dark:bg-white/5 px-4 py-3 rounded-2xl flex items-center justify-center gap-2">
          <div className="text-xl font-bold text-slate-900 dark:text-white leading-none">
            {asistenciasHoy.size} / {alumnos.length}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/50 mt-0.5">
            Presentes
          </div>
        </div>
      </header>

      {alumnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-white/10">
          <Users className="w-16 h-16 text-slate-300 dark:text-white/20 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Sin alumnos</h3>
          <p className="text-sm text-slate-500 dark:text-white/60">No hay alumnos asignados a este horario.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alumnos.map((alumno) => {
            const hasAttended = asistenciasHoy.has(alumno.id);
            const isMarking = markingId === alumno.id;

            return (
              <div 
                key={alumno.id} 
                className="flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 bg-white dark:bg-[#141414] border-slate-200 dark:border-white/10 shadow-sm"
              >
                <div className="flex flex-col gap-1 overflow-hidden pr-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {alumno.nombre} {alumno.apellidos}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-800 dark:text-white/90">
                      {alumno.cinturon}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${getDisciplinaColor(alumno.disciplina || 'Taekwondo')}`}></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {alumno.disciplina || 'Taekwondo'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (alumno.is_frozen_today) return;
                    hasAttended ? handleDesmarcarAsistencia(alumno.id) : handleMarcarAsistencia(alumno.id);
                  }}
                  disabled={isMarking || alumno.is_frozen_today}
                  title={alumno.is_frozen_today ? "Membresía Congelada" : ""}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 active:scale-95 ${
                    isMarking 
                      ? 'bg-slate-200 dark:bg-white/10'
                      : alumno.is_frozen_today
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-2 border-slate-200 dark:border-slate-700/50'
                      : hasAttended
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white border-2 border-transparent hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {isMarking ? (
                    <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} />
                  ) : alumno.is_frozen_today ? (
                    <Snowflake className="w-7 h-7 opacity-80" strokeWidth={1.5} />
                  ) : hasAttended ? (
                    <Check className="w-8 h-8" strokeWidth={3} />
                  ) : (
                    <CheckCircle className="w-8 h-8" strokeWidth={2} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setIsLibreModalOpen(true)}
          className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 text-slate-700 dark:text-white/80 font-bold hover:border-red-600 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-500 transition-all duration-300 active:scale-[0.98]"
        >
          <UserPlus className="w-6 h-6" />
          Registrar clase libre
        </button>

        {libresRegistradas > 0 && (
          <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {libresRegistradas} {libresRegistradas === 1 ? 'clase libre registrada' : 'clases libres registradas'}
          </p>
        )}
      </div>

      {/* Modal - Registrar clase libre */}
      {isLibreModalOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md" onClick={() => !savingLibre && setIsLibreModalOpen(false)} />

          <div className="relative w-full max-w-sm p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] flex flex-col gap-6">
              <div className="flex flex-col gap-2 text-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registrar clase libre</h3>
                <p className="text-sm text-slate-700 dark:text-white/80">
                  Se registrará <span className="font-semibold text-slate-900 dark:text-white">1 clase libre</span> en {horario?.nombre || 'esta clase'}.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">Método de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {METODOS_PAGO_LIBRE.map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setMetodoLibre(metodo)}
                      disabled={savingLibre}
                      className={`py-3 px-2 rounded-xl text-sm font-bold transition-all border disabled:opacity-50 ${metodoLibre === metodo
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md dark:bg-white dark:text-black dark:border-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-transparent dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5'
                        }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLibreModalOpen(false)}
                  disabled={savingLibre}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white dark:bg-white/5 dark:hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegistrarClaseLibre}
                  disabled={savingLibre}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {savingLibre && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Registrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
