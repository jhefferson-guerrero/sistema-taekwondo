import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Search, Plus, Loader2, Edit2, Trash2, GraduationCap, X, Calendar, Users, Phone, User, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { DISCIPLINAS } from '../utils/constants';

export default function Profesores() {
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
            alumnos ( id, nombre, apellidos, disciplina, estado, pagos(fecha_vencimiento) )
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

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este profesor? Los horarios asociados perderán su asignación.')) return;
    try {
      const { error } = await supabase.from('profesores').delete().eq('id', id);
      if (error) throw error;
      fetchProfesores();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error eliminando profesor');
    }
  };

  const filteredProfesores = profesores.filter(p => {
    const full = `${p.nombre} ${p.apellidos || ''}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  return (
    <>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-white/10 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-red-600 dark:text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profesores</h1>
              <p className="text-slate-500 dark:text-white/60 text-sm">Gestiona el equipo de instructores</p>
            </div>
          </div>

          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-sm shadow-red-600/20 dark:shadow-none hover:shadow-md hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Nuevo Profesor
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400 focus-within:text-red-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o apellidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-red-600 dark:focus:border-red-500 focus:ring-1 focus:ring-red-600 dark:focus:ring-red-500 transition-all duration-300 ease-in-out shadow-sm"
          />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfesores.map((prof) => (
              <div 
                key={prof.id} 
                onClick={() => openDetailsModal(prof)}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-xl font-bold text-slate-700 dark:text-white/80">
                    {prof.nombre.charAt(0)}{prof.apellidos ? prof.apellidos.charAt(0) : ''}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditModal(prof)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(prof.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editId ? 'Editar Profesor' : 'Nuevo Profesor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-white/90 mb-1.5">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" name="nombre" required value={formData.nombre} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-white/90 mb-1.5">Apellidos</label>
                  <input type="text" name="apellidos" value={formData.apellidos} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-white/90 mb-1.5">Teléfono</label>
                  <input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-white/90 mb-1.5">Disciplina</label>
                  <select name="disciplina" value={formData.disciplina} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-800 dark:focus:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500">
                    {DISCIPLINAS.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-white/90 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedProfesor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
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
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {detailsLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-red-500" /></div>
              ) : (
                <div className="flex flex-col gap-8">
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProfesor.horarios?.length || 0}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-white/60">Horarios a cargo</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
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
                                  className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-red-300 dark:hover:border-red-500/50 hover:shadow-sm transition-all text-left"
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
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors" />
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
                                .filter(a => a.estado !== 'Inactivo')
                                .map(a => {
                                  let paymentStatus = 'none';
                                  if (a.pagos && a.pagos.length > 0) {
                                    const latestPago = [...a.pagos].sort((x, y) => new Date(y.fecha_vencimiento) - new Date(x.fecha_vencimiento))[0];
                                    const vDate = new Date(latestPago.fecha_vencimiento + 'T00:00:00');
                                    const vTime = vDate.getTime();
                                    const diffDays = Math.ceil((vTime - todayTime) / (1000 * 60 * 60 * 24));

                                    if (diffDays < 0) {
                                      paymentStatus = 'expired';
                                    } else if (diffDays <= 5) {
                                      paymentStatus = 'warning';
                                    } else {
                                      paymentStatus = 'ok';
                                    }
                                  }
                                  return { ...a, paymentStatus };
                                });

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
                                        {alumno.paymentStatus === 'ok' && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                            Al Día
                                          </span>
                                        )}
                                        {alumno.paymentStatus === 'warning' && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                                            Por Vencer
                                          </span>
                                        )}
                                        {alumno.paymentStatus === 'expired' && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                                            Vencido
                                          </span>
                                        )}
                                        {alumno.paymentStatus === 'none' && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10">
                                            Sin Pagos
                                          </span>
                                        )}
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
      )}
    </>
  );
}
