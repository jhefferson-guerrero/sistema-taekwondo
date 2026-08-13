import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../services/supabaseClient';
import { Loader2, Calendar, Search, Filter, CheckCircle, Check, Users, AlertCircle, X } from 'lucide-react';
import { calcularClasesRestantes } from '../utils/membresiaUtils';

export default function Asistencia() {
  const [alumnos, setAlumnos] = useState([]);
  const [asistenciasHoy, setAsistenciasHoy] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [undoAlumno, setUndoAlumno] = useState(null);
  const [undoing, setUndoing] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [beltFilter, setBeltFilter] = useState('Todos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select(`
          *,
          pagos ( fecha_inicio, fecha_vencimiento ),
          horarios ( dias ),
          asistencias ( id, fecha_asistencia )
        `)
        .order('nombre', { ascending: true });

      if (alumnosError) throw alumnosError;

      // Current local date limits
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      const attendedTodaySet = new Set();

      const alumnosProcessed = alumnosData.map(a => {
        let clasesRestantes = 0;
        if (a.pagos && a.pagos.length > 0) {
          // Find the latest payment based on fecha_vencimiento
          const latestPago = [...a.pagos].sort((x, y) => new Date(y.fecha_vencimiento) - new Date(x.fecha_vencimiento))[0];
          clasesRestantes = calcularClasesRestantes(
            latestPago.fecha_inicio,
            latestPago.fecha_vencimiento,
            a.horarios?.dias || []
          );
        }

        let ultima_asistencia = null;
        if (a.asistencias && a.asistencias.length > 0) {
          const sorted = [...a.asistencias].sort((x, y) => new Date(y.fecha_asistencia) - new Date(x.fecha_asistencia));
          ultima_asistencia = sorted[0].fecha_asistencia;
          
          const hasAttendedToday = sorted.some(att => {
            const time = new Date(att.fecha_asistencia).getTime();
            return time >= todayStart && time <= todayEnd;
          });
          
          if (hasAttendedToday) {
            attendedTodaySet.add(a.id);
          }
        }

        return {
          ...a,
          clases_restantes: clasesRestantes,
          ultima_asistencia
        };
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
    try {
      setMarkingId(alumnoId);
      
      const { error } = await supabase
        .from('asistencias')
        .insert([{ alumno_id: alumnoId, estado: 'Presente' }]);
        
      if (error) throw error;
      
      setAsistenciasHoy(prev => new Set([...prev, alumnoId]));
      setAlumnos(prevAlumnos => prevAlumnos.map(a => 
        a.id === alumnoId ? { 
          ...a, 
          ultima_asistencia: new Date().toISOString()
        } : a
      ));
      
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
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

      const { error } = await supabase
        .from('asistencias')
        .delete()
        .eq('alumno_id', undoAlumno.id)
        .gte('fecha_asistencia', todayStart)
        .lte('fecha_asistencia', todayEnd);
        
      if (error) throw error;
      
      setAsistenciasHoy(prev => {
        const next = new Set(prev);
        next.delete(undoAlumno.id);
        return next;
      });
      setAlumnos(prevAlumnos => prevAlumnos.map(a => 
        a.id === undoAlumno.id ? { 
          ...a
        } : a
      ));
      setUndoAlumno(null);
    } catch (error) {
      console.error('Error undoing attendance:', error);
      alert('Error al anular asistencia.');
    } finally {
      setUndoing(false);
    }
  };

  const cinturones = ['Blanco', 'Amarillo', 'Verde', 'Azul', 'Rojo', 'Negro'];

  const filteredAlumnos = alumnos.filter(alumno => {
    const full = `${alumno.nombre} ${alumno.apellidos}`.toLowerCase();
    const matchesSearch = full.includes(searchTerm.toLowerCase());
    const matchesBelt = beltFilter === 'Todos' || alumno.cinturon === beltFilter;
    return matchesSearch && matchesBelt;
  });

  const today = new Date();
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = today.toLocaleDateString('es-ES', options);

  return (
    <DashboardLayout>
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
            <p className="text-lg font-medium text-slate-500 dark:text-white/60 mt-2">
              Hoy, <span className="capitalize">{formattedDate}</span>
            </p>
          </div>
        </header>

        {/* Toolbar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="relative w-full sm:w-96 group/search">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within/search:text-red-600 dark:text-white/40 dark:group-focus-within/search:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o apellido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm"
            />
          </div>
          
          <div className="relative w-full sm:w-48 group/filter">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-slate-400 group-focus-within/filter:text-red-600 dark:text-white/40 dark:group-focus-within/filter:text-red-500 transition-all duration-300 ease-in-out" />
            </div>
            <select
              value={beltFilter}
              onChange={(e) => setBeltFilter(e.target.value)}
              className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm appearance-none"
            >
              <option value="Todos">Todos los cinturones</option>
              {cinturones.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl backdrop-blur-xl transition-colors duration-700 w-full overflow-hidden">
          <div className="bg-white dark:bg-black rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col w-full overflow-x-auto custom-scrollbar relative min-h-[400px] transition-colors duration-500">
            
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            ) : filteredAlumnos.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center mb-6 transition-colors duration-500">
                  <Users className="w-8 h-8 text-slate-400 dark:text-white/30" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight transition-colors duration-500">
                  Sin resultados
                </h3>
                <p className="text-slate-500 dark:text-white/60 mt-2 max-w-sm text-sm transition-colors duration-500">
                  No se encontraron alumnos que coincidan con los filtros aplicados.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse animate-in fade-in duration-700">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 transition-colors duration-500">
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Alumno</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Cinturón</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Clases Restantes</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Última Asistencia</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 transition-all duration-300 ease-in-out">
                  {filteredAlumnos.map((alumno) => {
                    const hasAttended = asistenciasHoy.has(alumno.id);
                    const isMarking = markingId === alumno.id;

                    return (
                      <tr key={alumno.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 ease-in-out group">
                        <td className="px-8 py-5">
                          <div className="font-semibold text-slate-900 dark:text-white transition-colors duration-300">{alumno.nombre} {alumno.apellidos}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 group-hover:border-slate-300 dark:bg-white/10 dark:border-white/10 dark:text-white dark:group-hover:border-white/20 transition-all duration-300 ease-in-out">
                            {alumno.cinturon}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className={`font-medium ${
                            alumno.clases_restantes <= 0 
                              ? 'text-red-600 font-bold dark:text-red-500' 
                              : alumno.clases_restantes <= 2 
                                ? 'text-amber-500 font-bold dark:text-amber-400' 
                                : 'text-slate-700 dark:text-white/90'
                          }`}>
                            {alumno.clases_restantes}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          {alumno.ultima_asistencia ? (
                            <div className="inline-flex items-center gap-2 text-slate-500 dark:text-white/50 text-sm">
                              <Calendar className="w-4 h-4 opacity-50" />
                              {new Date(alumno.ultima_asistencia).toLocaleDateString('es-ES')}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-white/30 italic">Sin registros</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right w-[140px]">
                          <button 
                            onClick={() => hasAttended ? setUndoAlumno(alumno) : handleMarcarAsistencia(alumno.id)}
                            disabled={isMarking}
                            className={`group/btn relative inline-flex items-center justify-center gap-2 w-[112px] h-[40px] rounded-xl text-sm font-semibold transition-all duration-500 overflow-hidden ${
                              hasAttended 
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Modal - Anular Asistencia */}
      {undoAlumno && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => !undoing && setUndoAlumno(null)} />
          
          <div className="relative w-full max-w-sm p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-8 bg-white dark:bg-black rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6 text-center transition-all duration-300 ease-in-out">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-all duration-300 ease-in-out">¿Anular Asistencia?</h3>
                <p className="text-sm text-slate-500 dark:text-white/50 transition-all duration-300 ease-in-out">
                  ¿Estás seguro de anular la asistencia de hoy para <span className="font-semibold text-slate-900 dark:text-white">{undoAlumno.nombre}</span>?
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
    </DashboardLayout>
  );
}
