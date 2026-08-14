import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../services/supabaseClient';
import { Award, Search, Filter, Loader2, X, Users, History, ArrowUpCircle } from 'lucide-react';

export default function Cinturones() {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [beltFilter, setBeltFilter] = useState('Todos');

  // Modal states
  const [isAscensoModalOpen, setIsAscensoModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    cinturon_nuevo: '',
    fecha_examen: new Date().toISOString().split('T')[0],
    comentarios: ''
  });
  const [saving, setSaving] = useState(false);

  const cinturones = ['Blanco', 'Punta Amarilla', 'Amarillo', 'Punta Verde', 'Verde', 'Punta Azul', 'Azul', 'Punta Roja', 'Rojo', 'Punta Negra', 'Negro'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumnos')
        .select(`
          *,
          asistencias ( fecha_asistencia ),
          historial_cinturones ( id, cinturon_anterior, cinturon_nuevo, fecha_examen, comentarios )
        `)
        .order('fecha_registro', { ascending: false });

      if (error) throw error;

      const processedAlumnos = (data || []).map(a => {
        const historial = [...(a.historial_cinturones || [])].sort((x, y) => new Date(y.fecha_examen) - new Date(x.fecha_examen));

        // Determinar la fecha desde la cual contar asistencias
        let fechaReferencia = new Date(a.fecha_registro);
        if (historial.length > 0) {
          fechaReferencia = new Date(historial[0].fecha_examen);
        }

        // Asegurarnos de comparar solo fechas sin hora
        fechaReferencia.setHours(0, 0, 0, 0);

        const clasesAcumuladas = (a.asistencias || []).filter(asist => {
          const fechaAsist = new Date(asist.fecha_asistencia);
          fechaAsist.setHours(0, 0, 0, 0);
          return fechaAsist >= fechaReferencia;
        }).length;

        return {
          ...a,
          historial,
          clasesAcumuladas
        };
      });

      setAlumnos(processedAlumnos);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAscensoModal = (alumno) => {
    setSelectedAlumno(alumno);

    // Sugerir el siguiente cinturón
    const currentIndex = cinturones.indexOf(alumno.cinturon);
    const sugerido = currentIndex !== -1 && currentIndex < cinturones.length - 1
      ? cinturones[currentIndex + 1]
      : alumno.cinturon;

    setFormData({
      cinturon_nuevo: sugerido,
      fecha_examen: new Date().toISOString().split('T')[0],
      comentarios: ''
    });
    setIsAscensoModalOpen(true);
  };

  const openHistoryModal = (alumno) => {
    setSelectedAlumno(alumno);
    setIsHistoryModalOpen(true);
  };

  const handleSubmitAscenso = async (e) => {
    e.preventDefault();
    if (!selectedAlumno) return;

    try {
      setSaving(true);

      // 1. Insertar en historial_cinturones
      const { error: insertError } = await supabase
        .from('historial_cinturones')
        .insert([{
          alumno_id: selectedAlumno.id,
          cinturon_anterior: selectedAlumno.cinturon,
          cinturon_nuevo: formData.cinturon_nuevo,
          fecha_examen: formData.fecha_examen,
          comentarios: formData.comentarios
        }]);

      if (insertError) throw insertError;

      // 2. Actualizar cinturon en alumnos
      const { error: updateError } = await supabase
        .from('alumnos')
        .update({ cinturon: formData.cinturon_nuevo })
        .eq('id', selectedAlumno.id);

      if (updateError) throw updateError;

      setIsAscensoModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving ascenso:', error);
      alert('Error al registrar el ascenso.');
    } finally {
      setSaving(false);
    }
  };

  const filteredAlumnos = alumnos.filter(alumno => {
    const matchesSearch =
      alumno.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.apellidos.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBelt = beltFilter === 'Todos' || alumno.cinturon === beltFilter;

    return matchesSearch && matchesBelt;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">

        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
                Ascensos
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-2 text-slate-900 dark:text-white transition-colors duration-500">
              Control de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Grados</span>
            </h1>
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
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm"
            />
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
              <option value="Todos">Todos los cinturones</option>
              {cinturones.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-700 w-full overflow-hidden">
          <div className="bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col w-full overflow-x-auto custom-scrollbar relative min-h-[400px] transition-colors duration-500">

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
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Cinturón Actual</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Clases Acumuladas</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 transition-all duration-300 ease-in-out">
                  {filteredAlumnos.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 ease-in-out group">
                      <td className="px-8 py-5">
                        <div className="font-semibold text-slate-900 dark:text-white transition-colors duration-300">{alumno.nombre} {alumno.apellidos}</div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 group-hover:border-slate-300 dark:bg-white/10 dark:border-white/10 dark:text-white dark:group-hover:border-white/20 transition-all duration-300 ease-in-out">
                          {alumno.cinturon}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${alumno.clasesAcumuladas >= 24
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70'
                            }`}>
                            {alumno.clasesAcumuladas}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-white/50">desde el último examen</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openHistoryModal(alumno)}
                            className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-all duration-300 ease-in-out rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-2"
                            title="Ver Historial"
                          >
                            <History className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" />
                          </button>
                          <button
                            onClick={() => openAscensoModal(alumno)}
                            className="p-2 text-slate-500 hover:text-red-600 dark:text-white/60 dark:hover:text-red-500 transition-all duration-300 ease-in-out rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-2"
                            title="Registrar Ascenso"
                          >
                            <ArrowUpCircle className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal - Registrar Ascenso */}
      {isAscensoModalOpen && selectedAlumno && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => !saving && setIsAscensoModalOpen(false)} />

          <div className="relative w-full max-w-lg p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6 transition-all duration-300 ease-in-out">

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ease-in-out">
                    Registrar Ascenso
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                    {selectedAlumno.nombre} {selectedAlumno.apellidos}
                  </p>
                </div>
                <button
                  onClick={() => setIsAscensoModalOpen(false)}
                  disabled={saving}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-white/70 flex items-center justify-center dark:hover:bg-white/10 dark:hover:text-white transition-all duration-300 ease-in-out disabled:opacity-50"
                >
                  <X className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-widest font-semibold mb-1">Cinturón Actual</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedAlumno.cinturon}</span>
                </div>
                <ArrowUpCircle className="w-5 h-5 text-slate-400 dark:text-white/30" />
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-widest font-semibold mb-1">Clases Acumuladas</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedAlumno.clasesAcumuladas}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitAscenso} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Nuevo Cinturón</label>
                  <select
                    name="cinturon_nuevo"
                    value={formData.cinturon_nuevo}
                    onChange={handleInputChange}
                    disabled={saving}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-all duration-300 ease-in-out disabled:opacity-50 appearance-none"
                  >
                    <option value="" disabled>Selecciona el nuevo cinturón</option>
                    {cinturones.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Fecha de Examen</label>
                  <input
                    type="date"
                    name="fecha_examen"
                    value={formData.fecha_examen}
                    onChange={handleInputChange}
                    disabled={saving}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Comentarios (Opcional)</label>
                  <textarea
                    name="comentarios"
                    value={formData.comentarios}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="Ej. Excelente desempeño en rompimientos..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50 min-h-[100px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="group relative w-full flex items-center justify-center bg-red-600 text-white px-6 py-4 rounded-xl mt-2 font-medium hover:bg-red-700 transition-all duration-500 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Guardar Ascenso'
                    )}
                  </span>
                </button>
              </form>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal - Historial de Cinturones */}
      {isHistoryModalOpen && selectedAlumno && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => setIsHistoryModalOpen(false)} />

          <div className="relative w-full max-w-2xl p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col max-h-[85vh] transition-all duration-300 ease-in-out overflow-hidden">

              <div className="flex items-start justify-between pb-6 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ease-in-out">
                    Historial de Ascensos
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-white/50">
                    {selectedAlumno.nombre} {selectedAlumno.apellidos}
                  </p>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-white/70 flex items-center justify-center dark:hover:bg-white/10 dark:hover:text-white transition-all duration-300 ease-in-out"
                >
                  <X className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar mt-6">
                {selectedAlumno.historial?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8">
                    <Award className="w-12 h-12 text-slate-300 dark:text-white/20 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Sin ascensos registrados</h3>
                    <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Este alumno aún no ha rendido ningún examen de grado.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 dark:border-white/10 ml-4 py-2 space-y-8">
                    {selectedAlumno.historial.map((registro, idx) => (
                      <div key={registro.id} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-red-500" />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-slate-900 dark:text-white">{registro.cinturon_nuevo}</span>
                            {registro.cinturon_anterior && (
                              <span className="text-sm text-slate-500 dark:text-white/50 flex items-center gap-1">
                                <ArrowUpCircle className="w-4 h-4" />
                                de {registro.cinturon_anterior}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-slate-500 dark:text-white/40 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full w-fit">
                            {new Date(registro.fecha_examen).toLocaleDateString()}
                          </span>
                        </div>
                        {registro.comentarios && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-sm text-slate-700 dark:text-white/70">
                            {registro.comentarios}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

    </DashboardLayout>
  );
}
