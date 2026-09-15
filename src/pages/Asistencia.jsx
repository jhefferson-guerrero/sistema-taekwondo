import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabaseClient';
import { DISCIPLINAS, getGradosByDisciplina, getDisciplinaColor } from '../utils/constants';
import { Search, Filter, CalendarCheck, Clock, User, CheckCircle, XCircle, AlertCircle, Plus, ChevronLeft, ChevronRight, Loader2, Users, Calendar, Check, X, Activity, Snowflake } from 'lucide-react';
import { calcularClasesRestantes } from '../utils/membresiaUtils';
import Pagination from '../components/Pagination';

const getLocalDateString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function Asistencia() {
  const queryClient = useQueryClient();
  const [asistenciasHoy, setAsistenciasHoy] = useState(new Set());
  const [markingId, setMarkingId] = useState(null);
  const [undoAlumno, setUndoAlumno] = useState(null);
  const [undoing, setUndoing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [beltFilter, setBeltFilter] = useState('Todos');
  const [disciplinaFilter, setDisciplinaFilter] = useState('Todos');
  const cinturones = getGradosByDisciplina(disciplinaFilter === 'Todos' ? 'Taekwondo' : disciplinaFilter);
  
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  
  const handlePrevDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, beltFilter, selectedDate, disciplinaFilter]);

  const fetchAsistenciaData = async () => {
    const { data: alumnosDataRaw, error: alumnosError } = await supabase
      .from('alumnos')
      .select(`
        *,
        pagos ( fecha_inicio, fecha_vencimiento ),
        horarios ( dias ),
        asistencias ( id, fecha_asistencia, estado )
      `)
      .order('nombre', { ascending: true });

    if (alumnosError) throw alumnosError;

    const alumnosData = (alumnosDataRaw || []).filter(a => a.estado !== 'Inactivo');

    const dateParts = selectedDate.split('-');
    const targetDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const targetStart = targetDate.getTime();
    const targetEndObj = new Date(targetDate);
    targetEndObj.setHours(23, 59, 59, 999);
    const targetEnd = targetEndObj.getTime();

    const attendedTodaySet = new Set();

    const alumnosProcessed = alumnosData.map(a => {
      let clasesRestantes = 0;
      if (a.pagos && a.pagos.length > 0) {
        const latestPago = [...a.pagos].sort((x, y) => new Date(y.fecha_vencimiento) - new Date(x.fecha_vencimiento))[0];
        const fechasCongeladas = (a.asistencias || []).filter(att => att.estado === 'Congelado').map(att => att.fecha_asistencia);
        clasesRestantes = calcularClasesRestantes(
          latestPago.fecha_inicio,
          latestPago.fecha_vencimiento,
          a.horarios?.dias || [],
          fechasCongeladas
        );
      }

      let ultima_asistencia = null;
      let isFrozenToday = false;
      if (a.asistencias && a.asistencias.length > 0) {
        const sorted = [...a.asistencias].sort((x, y) => new Date(y.fecha_asistencia) - new Date(x.fecha_asistencia));
        const presentes = sorted.filter(att => !att.estado || att.estado === 'Presente');
        ultima_asistencia = presentes.length > 0 ? presentes[0].fecha_asistencia : null;

        const hasAttendedToday = presentes.some(att => {
          const time = new Date(att.fecha_asistencia).getTime();
          return time >= targetStart && time <= targetEnd;
        });

        isFrozenToday = sorted.some(att => {
          const time = new Date(att.fecha_asistencia).getTime();
          return time >= targetStart && time <= targetEnd && att.estado === 'Congelado';
        });

        if (hasAttendedToday) {
          attendedTodaySet.add(a.id);
        }
      }

      return {
        ...a,
        clases_restantes: clasesRestantes,
        ultima_asistencia,
        is_frozen_today: isFrozenToday
      };
    });

    return { alumnosProcessed, attendedTodaySet };
  };

  const { data, isLoading: loading } = useQuery({
    queryKey: ['asistenciaData', selectedDate],
    queryFn: fetchAsistenciaData
  });

  const alumnos = data?.alumnosProcessed || [];
  
  useEffect(() => {
    if (data?.attendedTodaySet) {
      setAsistenciasHoy(data.attendedTodaySet);
    }
  }, [data?.attendedTodaySet]);

  const handleMarcarAsistencia = async (alumnoId) => {
    try {
      setMarkingId(alumnoId);

      const dateParts = selectedDate.split('-');
      const insertDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      insertDate.setHours(12, 0, 0, 0);

      const { error } = await supabase
        .from('asistencias')
        .insert([{ alumno_id: alumnoId, estado: 'Presente', fecha_asistencia: insertDate.toISOString() }]);

      if (error) throw error;

      setAsistenciasHoy(prev => new Set([...prev, alumnoId]));
      queryClient.invalidateQueries({ queryKey: ['asistenciaData', selectedDate] });

    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Error al registrar asistencia.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleAnularAsistencia = async () => {
    if (!undoAlumno) return;
    try {
      setUndoing(true);

      const dateParts = selectedDate.split('-');
      const targetDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      targetDate.setHours(0, 0, 0, 0);
      const targetStartIso = targetDate.toISOString();
      const targetEndObj = new Date(targetDate);
      targetEndObj.setHours(23, 59, 59, 999);
      const targetEndIso = targetEndObj.toISOString();

      const { error } = await supabase
        .from('asistencias')
        .delete()
        .eq('alumno_id', undoAlumno.id)
        .or('estado.eq.Presente,estado.is.null')
        .gte('fecha_asistencia', targetStartIso)
        .lte('fecha_asistencia', targetEndIso);

      if (error) throw error;

      setAsistenciasHoy(prev => {
        const next = new Set(prev);
        next.delete(undoAlumno.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['asistenciaData', selectedDate] });
      setUndoAlumno(null);
    } catch (error) {
      console.error('Error undoing attendance:', error);
      alert('Error al anular asistencia.');
    } finally {
      setUndoing(false);
    }
  };



  const filteredAlumnos = alumnos.filter(alumno => {
    const full = `${alumno.nombre} ${alumno.apellidos}`.toLowerCase();
    const matchesSearch = full.includes(searchTerm.toLowerCase());
    const matchesBelt = beltFilter === 'Todos' || alumno.cinturon === beltFilter;
    const matchDisciplina = disciplinaFilter === 'Todos' || alumno.disciplina === disciplinaFilter;

    return matchesSearch && matchesBelt && matchDisciplina;
  });

  const totalPages = Math.ceil(filteredAlumnos.length / itemsPerPage);
  const currentAlumnos = filteredAlumnos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="flex flex-col gap-8">

        {/* Header Section */}
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
                Control Diario
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-2 text-slate-900 dark:text-white transition-colors duration-500">
              Asistencia de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Alumnos</span>
            </h1>
            <div className="flex items-center gap-1 mt-2">
              <button 
                onClick={handlePrevDay}
                title="Día anterior"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-all duration-300 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                <Calendar className="w-4 h-4 text-slate-700 dark:text-white/80" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                />
              </div>
              <button 
                onClick={handleNextDay}
                title="Día siguiente"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-all duration-300 active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Toolbar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-96 group/search">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within/search:text-red-600 dark:text-white/40 dark:group-focus-within/search:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o apellido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm"
            />
          </div>

          <div className="relative w-full sm:w-60 group/filter">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Activity className="w-4 h-4 text-slate-400 group-focus-within/filter:text-red-600 dark:text-white/40 dark:group-focus-within/filter:text-red-500 transition-all duration-300 ease-in-out" />
            </div>
            <select
              value={disciplinaFilter}
              onChange={(e) => { setDisciplinaFilter(e.target.value); setBeltFilter('Todos'); }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm appearance-none"
            >
              <option value="Todos">Todas las disciplinas</option>
              {DISCIPLINAS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:w-56 group/filter">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-slate-400 group-focus-within/filter:text-red-600 dark:text-white/40 dark:group-focus-within/filter:text-red-500 transition-all duration-300 ease-in-out" />
            </div>
            <select
              value={beltFilter}
              onChange={(e) => setBeltFilter(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm appearance-none"
            >
              <option value="Todos">Todos los grados</option>
              {cinturones.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-700 w-full overflow-hidden flex flex-col">
          <div className="bg-white dark:bg-slate-800 rounded-t-[calc(2rem-0.375rem)] flex-1 overflow-x-auto custom-scrollbar relative min-h-[400px] transition-colors duration-500">

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            ) : currentAlumnos.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center mb-6 transition-colors duration-500">
                  <Users className="w-8 h-8 text-slate-400 dark:text-white/30" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight transition-colors duration-500">
                  Sin resultados
                </h3>
                <p className="text-slate-500 dark:text-white/60 mt-2 max-w-sm text-sm transition-colors duration-500">
                  No se encontraron alumnos que coincidan con los filtros aplicados en esta fecha.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 transition-colors duration-500">
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80">Alumno</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80 text-center">Cinturón</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80 text-center">Clases Restantes</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80 text-center">Última Asistencia</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 transition-all duration-300 ease-in-out">
                  {currentAlumnos.map((alumno) => {
                    const hasAttended = asistenciasHoy.has(alumno.id);
                    const isMarking = markingId === alumno.id;

                    return (
                      <tr key={alumno.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 ease-in-out group">
                        <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <div className="font-semibold text-slate-900 dark:text-white transition-colors duration-300">{alumno.nombre} {alumno.apellidos}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${getDisciplinaColor(alumno.disciplina || 'Taekwondo')}`}></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              {alumno.disciplina || 'Taekwondo'}
                            </span>
                          </div>
                        </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 group-hover:border-slate-300 dark:bg-white/10 dark:border-white/10 dark:text-white dark:group-hover:border-white/20 transition-all duration-300 ease-in-out">
                            {alumno.cinturon}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className={`font-medium ${alumno.clases_restantes <= 0
                            ? 'text-red-600 font-bold dark:text-red-500'
                            : alumno.clases_restantes <= 2
                              ? 'text-amber-500 font-bold dark:text-amber-400'
                              : 'text-slate-700 dark:text-white/90'
                            }`}>
                            {alumno.clases_restantes}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          {alumno.ultima_asistencia ? (
                            <div className="inline-flex items-center justify-center gap-2 text-slate-700 dark:text-white/80 text-sm">
                              <Calendar className="w-4 h-4 opacity-50" />
                              {new Date(alumno.ultima_asistencia).toLocaleDateString('es-ES')}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-white/30 italic">Sin registros</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-center w-[140px]">
                          {alumno.is_frozen_today ? (
                            <div className="inline-flex items-center justify-center gap-1.5 w-[112px] h-[40px] rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 cursor-not-allowed" title="Membresía Congelada">
                              <Snowflake className="w-3.5 h-3.5" strokeWidth={2.5} />
                              <span>Congelado</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => hasAttended ? setUndoAlumno(alumno) : handleMarcarAsistencia(alumno.id)}
                              disabled={isMarking}
                              className={`group/btn relative inline-flex items-center justify-center gap-2 w-[112px] h-[40px] rounded-xl text-sm font-semibold transition-all duration-500 overflow-hidden ${hasAttended
                                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-600 disabled:opacity-50'
                                : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:border-red-600 hover:text-red-700 dark:hover:border-red-600 dark:hover:text-red-500 shadow-sm active:scale-[0.98]'
                                }`}
                            >
                              {isMarking ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : hasAttended ? (
                                <>
                                  <Check className="w-4 h-4" strokeWidth={3} />
                                  <span>Asistió</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-300" />
                                  <span>Marcar</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAlumnos.length}
            onPageChange={setCurrentPage}
          />
        </div>

      </div>

      {/* Modal - Anular Asistencia */}
      {undoAlumno && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => !undoing && setUndoAlumno(null)} />

          <div className="relative w-full max-w-sm p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6 text-center transition-all duration-300 ease-in-out">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-all duration-300 ease-in-out">¿Anular Asistencia?</h3>
                <p className="text-sm text-slate-700 dark:text-white/80 transition-all duration-300 ease-in-out">
                  ¿Estás seguro de anular la asistencia seleccionada para <span className="font-semibold text-slate-900 dark:text-white">{undoAlumno.nombre}</span>?
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setUndoAlumno(null)}
                  disabled={undoing}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white dark:bg-white/5 dark:hover:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAnularAsistencia}
                  disabled={undoing}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-all duration-300 ease-in-out disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {undoing && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Anular</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
