import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabaseClient';
import { Calendar as CalendarIcon, Clock, Users, Plus, X, Loader2, Search, Filter, Edit2, Trash2, AlertCircle } from 'lucide-react';

const DIAS_SEMANA = [
  { full: 'Lunes', short: 'L' },
  { full: 'Martes', short: 'M' },
  { full: 'Miércoles', short: 'X' }, // Usamos X o M, pero mejor mostrar M en la UI
  { full: 'Jueves', short: 'J' },
  { full: 'Viernes', short: 'V' },
  { full: 'Sábado', short: 'S' },
  { full: 'Domingo', short: 'D' },
];

export default function Horarios() {
  const [horarios, setHorarios] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState('Todos');

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    dias: [],
    hora_inicio: '',
    hora_fin: '',
    profesor_id: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchHorarios();
    fetchProfesores();
  }, []);

  const fetchProfesores = async () => {
    try {
      const { data, error } = await supabase.from('profesores').select('id, nombre, apellidos, disciplina').eq('estado', 'Activo');
      if (error) throw error;
      setProfesores(data || []);
    } catch (error) {
      console.error('Error fetching profesores:', error);
    }
  };

  const fetchHorarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('horarios')
        .select('*, profesores(nombre, apellidos)')
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setHorarios(data || []);
    } catch (error) {
      console.error('Error fetching horarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormErrors({ ...formErrors, [e.target.name]: '' });
  };

  const toggleDia = (diaFull) => {
    setFormData(prev => {
      const currentDias = [...prev.dias];
      if (currentDias.includes(diaFull)) {
        return { ...prev, dias: currentDias.filter(d => d !== diaFull) };
      } else {
        return { ...prev, dias: [...currentDias, diaFull] };
      }
    });
    setFormErrors(prev => ({ ...prev, dias: '' }));
  };

  const handleTimeChange = (e) => {
    let val = e.target.value;
    
    // Allow digits and colons
    val = val.replace(/[^\d:]/g, '');
    
    // Prevent multiple colons
    const colonCount = (val.match(/:/g) || []).length;
    if (colonCount > 1) {
      val = val.replace(/:/g, (match, offset, string) => {
        return offset === string.indexOf(':') ? ':' : '';
      });
    }

    // If user types a colon right after a single digit (e.g. "5:"), auto-pad it to "05:"
    if (val.length === 2 && val[1] === ':') {
      val = '0' + val;
    }

    // Strip colon to get raw digits for formatting
    let digits = val.replace(/:/g, '');
    if (digits.length > 4) digits = digits.substring(0, 4);

    let result = '';
    if (digits.length > 2) {
      result = digits.substring(0, 2) + ':' + digits.substring(2);
    } else {
      result = digits;
      // Preserve manual colon if they typed 2 digits then colon (e.g. "12:")
      if (val.endsWith(':') && digits.length === 2) {
        result += ':';
      }
    }

    // Validate hours
    if (result.length >= 2) {
      let hours = parseInt(result.substring(0, 2), 10);
      if (hours > 23) hours = 23;
      result = hours.toString().padStart(2, '0') + result.substring(2);
    }
    
    // Validate minutes
    if (result.length === 5) {
      let mins = parseInt(result.substring(3, 5), 10);
      if (mins > 59) mins = 59;
      result = result.substring(0, 3) + mins.toString().padStart(2, '0');
    }

    setFormData({ ...formData, [e.target.name]: result });
    setFormErrors({ ...formErrors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (formData.dias.length === 0) errors.dias = 'Selecciona al menos un día';

    if (!formData.hora_inicio || formData.hora_inicio.length !== 5) {
      errors.hora_inicio = 'Formato inválido (Ej: 16:30)';
    }
    if (!formData.hora_fin || formData.hora_fin.length !== 5) {
      errors.hora_fin = 'Formato inválido (Ej: 18:00)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        nombre: formData.nombre,
        dias: formData.dias,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        profesor_id: formData.profesor_id || null
      };

      if (editId) {
        const { error } = await supabase
          .from('horarios')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('horarios')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setFormData({ nombre: '', dias: [], hora_inicio: '', hora_fin: '', profesor_id: '' });
      setEditId(null);
      await fetchHorarios();
    } catch (error) {
      console.error('Error saving horario:', error);
      alert('Error al guardar el horario. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const openNewModal = () => {
    setEditId(null);
    setFormData({ nombre: '', dias: [], hora_inicio: '', hora_fin: '', profesor_id: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (horario) => {
    setEditId(horario.id);
    setFormData({
      nombre: horario.nombre,
      dias: horario.dias || [],
      hora_inicio: formatTime(horario.hora_inicio),
      hora_fin: formatTime(horario.hora_fin),
      profesor_id: horario.profesor_id || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('horarios')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setDeleteId(null);
      await fetchHorarios();
    } catch (error) {
      console.error('Error deleting horario:', error);
      alert('Error al eliminar el horario.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper to format time (e.g., "15:00:00" to "15:00")
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const filteredHorarios = horarios.filter(horario => {
    const matchesSearch = horario.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = dayFilter === 'Todos' || (horario.dias && horario.dias.includes(dayFilter));
    return matchesSearch && matchesDay;
  });

  return (
    <>
      <div className="flex flex-col gap-8">

        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
                Configuración
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-2 text-slate-900 dark:text-white transition-colors duration-500">
              Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Horarios</span>
            </h1>
          </div>

          <button
            onClick={openNewModal}
            className="group relative flex items-center justify-between bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black px-6 py-3 rounded-full font-medium dark:hover:bg-gray-100 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shrink-0"
          >
            <span className="relative z-10 pr-4">Nuevo Horario</span>
            <div className="relative z-10 w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 dark:bg-slate-800/10 flex items-center justify-center dark:group-hover:bg-black/20 transition-colors duration-500 shrink-0">
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" strokeWidth={2.5} />
            </div>
          </button>
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-2">
          <div className="relative w-full sm:w-96 group/search">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within/search:text-red-600 dark:text-white/40 dark:group-focus-within/search:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre de horario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm"
            />
          </div>

          <div className="relative w-full sm:w-56 group/filter">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <CalendarIcon className="w-4 h-4 text-slate-400 group-focus-within/filter:text-red-600 dark:text-white/40 dark:group-focus-within/filter:text-red-500 transition-all duration-300 ease-in-out" />
            </div>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm appearance-none"
            >
              <option value="Todos">Todos los días</option>
              {DIAS_SEMANA.map(d => (
                <option key={d.full} value={d.full}>{d.full}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid de Horarios */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        ) : filteredHorarios.length === 0 ? (
          <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-700 w-full overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col w-full relative min-h-[400px] transition-colors duration-500 items-center justify-center text-center p-12">
              <div className="animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center mb-6 transition-colors duration-500">
                  <Clock className="w-8 h-8 text-slate-400 dark:text-white/30" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight transition-colors duration-500">
                  {horarios.length === 0 ? "Sin horarios registrados" : "Ningún horario coincide"}
                </h3>
                <p className="text-slate-500 dark:text-white/60 mt-2 max-w-sm text-sm transition-colors duration-500">
                  {horarios.length === 0 
                    ? "Aún no has creado ningún turno u horario. Haz clic en \"Nuevo Horario\" para empezar." 
                    : "Ajusta los filtros de búsqueda para encontrar horarios."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-700">
            {filteredHorarios.map((horario) => (
              <div
                key={horario.id}
                className="group relative flex flex-col p-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_20px_50px_-12px_rgba(255,255,255,0.08)] overflow-hidden"
              >

                <div className="flex items-start justify-between mb-4 gap-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                    {horario.nombre}
                  </h3>

                  <div className="flex items-center gap-1 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0">
                    <button
                      onClick={() => openEditModal(horario)}
                      className="p-2 text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-all duration-300 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                      title="Editar"
                    >
                      <Edit2 className="w-[18px] h-[18px] transition-transform duration-300 hover:scale-110" />
                    </button>
                    <button
                      onClick={() => setDeleteId(horario.id)}
                      className="p-2 text-slate-400 hover:text-red-600 dark:text-white/40 dark:hover:text-red-500 transition-all duration-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                      title="Eliminar"
                    >
                      <Trash2 className="w-[18px] h-[18px] transition-transform duration-300 hover:scale-110" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-white/80 mb-6 font-medium">
                  <Clock className="w-4 h-4 text-slate-400 dark:text-white/40" />
                  <span>{formatTime(horario.hora_inicio)} - {formatTime(horario.hora_fin)}</span>
                </div>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {horario.dias.map(dia => (
                    <span
                      key={dia}
                      className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:border-white/10 dark:text-white/90"
                    >
                      {dia}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal - Nuevo Horario */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => !saving && setIsModalOpen(false)} />

          <div className="relative w-full max-w-md p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6 transition-colors duration-300">

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ease-in-out">
                  {editId ? 'Editar Horario' : 'Nuevo Horario'}
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

                {/* Nombre */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">
                    Nombre del grupo
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Ej. Infantil L-M-V"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    disabled={saving}
                    className={`w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-colors duration-300 ease-in-out disabled:opacity-50 ${formErrors.nombre ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`}
                  />
                  <div className="min-h-[20px]">
                    {formErrors.nombre && (
                      <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1 block">
                        {formErrors.nombre}
                      </span>
                    )}
                  </div>
                </div>

                {/* Días Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">
                    Días de la semana
                  </label>
                  <div className="flex justify-between gap-1 sm:gap-2">
                    {DIAS_SEMANA.map((dia) => {
                      const isActive = formData.dias.includes(dia.full);
                      return (
                        <button
                          key={dia.full}
                          type="button"
                          disabled={saving}
                          onClick={() => toggleDia(dia.full)}
                          className={`flex-1 aspect-square rounded-xl text-sm font-bold transition-all duration-300 ${isActive
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
                            } disabled:opacity-50`}
                        >
                          {dia.short}
                        </button>
                      );
                    })}
                  </div>
                  <div className="min-h-[20px] mt-1">
                    {formErrors.dias && (
                      <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1 block">
                        {formErrors.dias}
                      </span>
                    )}
                  </div>
                </div>

                {/* Horas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">
                      Hora Inicio
                    </label>
                    <input
                      type="text"
                      name="hora_inicio"
                      placeholder="00:00"
                      maxLength={5}
                      value={formData.hora_inicio}
                      onChange={handleTimeChange}
                      disabled={saving}
                      className={`w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-colors duration-300 ease-in-out disabled:opacity-50 text-center text-lg font-medium tracking-widest ${formErrors.hora_inicio ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`}
                    />
                    <div className="min-h-[20px]">
                      {formErrors.hora_inicio && (
                        <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1 block">
                          {formErrors.hora_inicio}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">
                      Hora Fin
                    </label>
                    <input
                      type="text"
                      name="hora_fin"
                      placeholder="00:00"
                      maxLength={5}
                      value={formData.hora_fin}
                      onChange={handleTimeChange}
                      disabled={saving}
                      className={`w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-colors duration-300 ease-in-out disabled:opacity-50 text-center text-lg font-medium tracking-widest ${formErrors.hora_fin ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`}
                    />
                    <div className="min-h-[20px]">
                      {formErrors.hora_fin && (
                        <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1 block">
                          {formErrors.hora_fin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profesor a cargo */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1">
                    Profesor a cargo
                  </label>
                  <select
                    name="profesor_id"
                    value={formData.profesor_id}
                    onChange={handleInputChange}
                    disabled={saving}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors duration-300"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- Sin Profesor --</option>
                    {profesores.map(p => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {p.nombre} {p.apellidos} ({p.disciplina})
                      </option>
                    ))}
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
                      'Guardar Horario'
                    )}
                  </span>
                </button>
              </form>

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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-all duration-300 ease-in-out">¿Eliminar horario?</h3>
                <p className="text-sm text-slate-700 dark:text-white/80 transition-all duration-300 ease-in-out">Esta acción no se puede deshacer y los alumnos asociados quedarán sin horario asignado.</p>
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
