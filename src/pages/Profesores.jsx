import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabaseClient';
import { Search, Plus, Loader2, Edit2, Trash2, GraduationCap, X, Calendar, Users, Phone, User, MapPin, ChevronRight, ArrowLeft, AlertCircle, Activity } from 'lucide-react';
import { DISCIPLINAS } from '../utils/constants';

export default function Profesores() {
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplinaFilter, setDisciplinaFilter] = useState('Todos');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    disciplina: 'Taekwondo',
    estado: 'Activo'
  });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Details State
  const [selectedProfesor, setSelectedProfesor] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSearchTerm, setDetailsSearchTerm] = useState('');
  const [selectedHorarioView, setSelectedHorarioView] = useState(null);

  useEffect(() => {
    fetchProfesores();
  }, []);

  const fetchProfesores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profesores')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setProfesores(data || []);
    } catch (error) {
      console.error('Error fetching profesores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openNewModal = () => {
    setFormData({ nombre: '', apellidos: '', telefono: '', disciplina: 'Taekwondo', estado: 'Activo' });
    setEditId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (profesor) => {
    setFormData({
      nombre: profesor.nombre,
      apellidos: profesor.apellidos || '',
      telefono: profesor.telefono || '',
      disciplina: profesor.disciplina || 'Taekwondo',
      estado: profesor.estado || 'Activo'
    });
    setEditId(profesor.id);
    setIsModalOpen(true);
  };

  const openDetailsModal = async (profesor) => {
    setSelectedProfesor(profesor);
    setIsDetailsModalOpen(true);
    setDetailsLoading(true);
    setDetailsSearchTerm('');
    setSelectedHorarioView(null);

    try {
      const { data, error } = await supabase
        .from('profesores')
        .select(`
          *,
          horarios (
            id, nombre, dias, hora_inicio, hora_fin,
            alumnos ( id, nombre, apellidos, disciplina, estado, cinturon )
          )
        `)
        .eq('id', profesor.id)
        .single();

      if (error) throw error;
      setSelectedProfesor(data);
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        const { error } = await supabase
          .from('profesores')
          .update(formData)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profesores')
          .insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchProfesores();
    } catch (error) {
      console.error('Error saving profesor:', error);
      alert('Error guardando profesor');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const { error } = await supabase.from('profesores').delete().eq('id', deleteId);
      if (error) throw error;
      setDeleteId(null);
      await fetchProfesores();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error eliminando profesor');
    } finally {
      setDeleting(false);
    }
  };

  const filteredProfesores = profesores.filter(p => {
    const full = `${p.nombre} ${p.apellidos || ''}`.toLowerCase();
    const matchesSearch = full.includes(searchTerm.toLowerCase());
    const matchesDisciplina = disciplinaFilter === 'Todos' || p.disciplina === disciplinaFilter;
    return matchesSearch && matchesDisciplina;
  });

  return (
    <>
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
                Equipo
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-2 text-slate-900 dark:text-white transition-colors duration-500">
              Directorio de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Profesores</span>
            </h1>
          </div>

          <button
            onClick={openNewModal}
            className="group relative flex items-center justify-between bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black px-6 py-3 rounded-full font-medium dark:hover:bg-gray-100 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shrink-0"
          >
            <span className="relative z-10 pr-4">Nuevo Profesor</span>
            <div className="relative z-10 w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 dark:bg-slate-800/10 flex items-center justify-center dark:group-hover:bg-black/20 transition-colors duration-500 shrink-0">
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" strokeWidth={2.5} />
            </div>
          </button>
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

          <div className="relative w-full sm:w-60 group/filter">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Activity className="w-4 h-4 text-slate-400 group-focus-within/filter:text-red-600 dark:text-white/40 dark:group-focus-within/filter:text-red-500 transition-all duration-300 ease-in-out" />
            </div>
            <select
              value={disciplinaFilter}
              onChange={(e) => setDisciplinaFilter(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm appearance-none"
            >
              <option value="Todos">Todas las disciplinas</option>
              {DISCIPLINAS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 dark:text-white/60" />
          </div>
        ) : filteredProfesores.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5">
            <GraduationCap className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay profesores</h3>
            <p className="text-slate-500 dark:text-white/60 mt-1">Registra tu primer instructor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">
            {filteredProfesores.map((prof) => (
              <div
                key={prof.id}
                onClick={() => openDetailsModal(prof)}
                className="group relative flex flex-col p-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_20px_50px_-12px_rgba(255,255,255,0.08)] overflow-hidden cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-xl font-bold text-slate-700 dark:text-white/80">
                    {prof.nombre.charAt(0)}{prof.apellidos ? prof.apellidos.charAt(0) : ''}
                  </div>
                  <div className="flex items-center gap-1 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditModal(prof)} className="p-2 text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-all duration-300 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10" title="Editar">
                      <Edit2 className="w-[18px] h-[18px] transition-transform duration-300 hover:scale-110" />
                    </button>
                    <button onClick={() => confirmDelete(prof.id)} className="p-2 text-slate-400 hover:text-red-600 dark:text-white/40 dark:hover:text-red-500 transition-all duration-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10" title="Eliminar">
                      <Trash2 className="w-[18px] h-[18px] transition-transform duration-300 hover:scale-110" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 truncate">
                  {prof.nombre} {prof.apellidos}
                </h3>

                <div className="flex items-center gap-1.5 mb-4">
                  <span className={`w-1.5 h-1.5 rounded-full ${prof.disciplina === 'Muay Thai' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {prof.disciplina || 'Taekwondo'}
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-white/60">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {prof.telefono || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => !saving && setIsModalOpen(false)} />

          <div className="relative w-full max-w-md p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6 transition-colors duration-300">

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ease-in-out">
                  {editId ? 'Editar Profesor' : 'Nuevo Profesor'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-white/70 flex items-center justify-center dark:hover:bg-white/10 dark:hover:text-white transition-all duration-300 ease-in-out disabled:opacity-50"
                >
                  <X className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" name="nombre" required disabled={saving} value={formData.nombre} onChange={handleInputChange} className="w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-colors duration-300 border-slate-200 dark:border-white/10" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">Apellidos</label>
                  <input type="text" name="apellidos" disabled={saving} value={formData.apellidos} onChange={handleInputChange} className="w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-colors duration-300 border-slate-200 dark:border-white/10" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">Teléfono</label>
                  <input type="text" name="telefono" disabled={saving} value={formData.telefono} onChange={handleInputChange} className="w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-colors duration-300 border-slate-200 dark:border-white/10" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">Disciplina</label>
                  <select name="disciplina" disabled={saving} value={formData.disciplina} onChange={handleInputChange} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors duration-300">
                    {DISCIPLINAS.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{d}</option>)}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="group relative w-full flex items-center justify-center bg-red-600 text-white px-6 py-4 rounded-xl mt-4 font-medium hover:bg-red-700 transition-all duration-500 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Guardar Profesor'
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedProfesor && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => setIsDetailsModalOpen(false)} />

          <div className="relative w-full max-w-2xl max-h-[85vh] p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col">
            <div className="bg-white dark:bg-slate-900 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col overflow-hidden h-full">
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center text-xl font-bold text-slate-700 dark:text-white">
                    {selectedProfesor.nombre.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedProfesor.nombre} {selectedProfesor.apellidos}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedProfesor.disciplina === 'Muay Thai' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {selectedProfesor.disciplina || 'Taekwondo'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-white/70 flex items-center justify-center dark:hover:bg-white/10 dark:hover:text-white transition-all duration-300 ease-in-out"
                >
                  <X className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {detailsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-red-500" /></div>
                ) : (
                  <div className="flex flex-col gap-8">

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-red-600 dark:text-red-500">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProfesor.horarios?.length || 0}</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-white/60">Horarios a cargo</p>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-red-600 dark:text-red-500">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {selectedProfesor.horarios?.reduce((acc, curr) => acc + (curr.alumnos?.filter(a => a.estado !== 'Inactivo').length || 0), 0) || 0}
                          </p>
                          <p className="text-xs font-medium text-slate-500 dark:text-white/60">Alumnos Activos</p>
                        </div>
                      </div>
                    </div>
                    {/* Navigation View for Schedules/Students */}
                    <div className="flex flex-col h-full mt-2">

                      {!selectedHorarioView ? (
                        // --- VIEW 1: LIST OF SCHEDULES ---
                        <>
                          <div className="mb-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Horarios Asignados</h3>
                            <p className="text-sm text-slate-500 dark:text-white/60">Selecciona un horario para ver a sus alumnos matriculados.</p>
                          </div>

                          {(!selectedProfesor.horarios || selectedProfesor.horarios.length === 0) ? (
                            <p className="text-sm text-slate-500 dark:text-white/50 text-center py-6 bg-slate-50 dark:bg-white/5 rounded-xl">
                              Este profesor no tiene horarios asignados.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {selectedProfesor.horarios.map(horario => {
                                const alumnosActivos = (horario.alumnos || []).filter(a => a.estado !== 'Inactivo');

                                return (
                                  <button
                                    key={horario.id}
                                    onClick={() => setSelectedHorarioView(horario)}
                                    className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-red-600 dark:hover:border-red-500 hover:shadow-sm transition-all text-left"
                                  >
                                    <div>
                                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                        {horario.nombre}
                                      </h4>
                                      <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                                        {horario.hora_inicio.substring(0, 5)} - {horario.hora_fin.substring(0, 5)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="text-xs font-bold px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-full text-slate-600 dark:text-white/80">
                                        {alumnosActivos.length} Alumnos
                                      </div>
                                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        // --- VIEW 2: LIST OF STUDENTS IN SCHEDULE ---
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                          <div className="flex items-center gap-3 mb-6">
                            <button
                              onClick={() => {
                                setSelectedHorarioView(null);
                                setDetailsSearchTerm('');
                              }}
                              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                            >
                              <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {selectedHorarioView.nombre}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                                {selectedHorarioView.hora_inicio.substring(0, 5)} - {selectedHorarioView.hora_fin.substring(0, 5)}
                              </p>
                            </div>
                          </div>

                          <div className="relative mb-4">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Search className="w-4 h-4 text-slate-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Buscar alumno en este horario..."
                              value={detailsSearchTerm}
                              onChange={(e) => setDetailsSearchTerm(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors shadow-sm"
                            />
                          </div>

                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex-1 max-h-[50vh] flex flex-col shadow-sm">
                            <div className="overflow-y-auto">
                              {(() => {
                                const now = new Date();
                                const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                                let alumnosActivos = (selectedHorarioView.alumnos || [])
                                  .filter(a => a.estado !== 'Inactivo');

                                if (detailsSearchTerm) {
                                  alumnosActivos = alumnosActivos.filter(a => {
                                    const full = (a.nombre + ' ' + a.apellidos).toLowerCase();
                                    return full.includes(detailsSearchTerm.toLowerCase());
                                  });
                                }

                                if (alumnosActivos.length === 0) {
                                  return (
                                    <div className="p-8 text-center text-sm text-slate-400 dark:text-white/40 italic">
                                      {detailsSearchTerm ? 'Ningún alumno coincide con la búsqueda.' : 'Ningún alumno matriculado.'}
                                    </div>
                                  );
                                }

                                return (
                                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {alumnosActivos.map(alumno => (
                                      <div key={alumno.id} className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center text-sm font-medium text-slate-700 dark:text-white/90 pl-1">
                                          <span className="truncate">{alumno.nombre} {alumno.apellidos}</span>
                                        </div>
                                        <div className="pl-3.5 sm:pl-0 flex-shrink-0">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10">
                                            {alumno.cinturon || 'Blanco'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal - Confirmar Eliminar */}
      {deleteId && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => !deleting && setDeleteId(null)} />

          <div className="relative w-full max-w-sm p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6 text-center transition-all duration-300 ease-in-out">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-all duration-300 ease-in-out">¿Eliminar profesor?</h3>
                <p className="text-sm text-slate-700 dark:text-white/80 transition-all duration-300 ease-in-out">Esta acción no se puede deshacer y los horarios asociados perderán su asignación.</p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white dark:bg-white/5 dark:hover:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-all duration-300 ease-in-out disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Eliminar</span>
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
