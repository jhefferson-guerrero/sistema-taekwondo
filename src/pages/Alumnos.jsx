import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../services/supabaseClient';
import { Plus, Users, X, Loader2, Calendar, Edit2, Trash2, AlertCircle, Search, Filter, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { calcularClasesRestantes, FERIADOS_PERU } from '../utils/membresiaUtils';

export default function Alumnos() {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [beltFilter, setBeltFilter] = useState('Todos');
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [profileStats, setProfileStats] = useState({
    asistenciasMes: [],
    pagosRecientes: [],
    clasesRestantes: 0,
    loading: false
  });

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono_padres: '',
    cinturon: 'Blanco',
    horario_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchAlumnos();
    fetchHorarios();
  }, []);

  const fetchHorarios = async () => {
    try {
      const { data, error } = await supabase
        .from('horarios')
        .select('id, nombre, dias')
        .eq('estado', 'Activo');
      if (error) throw error;
      setHorariosDisponibles(data || []);
    } catch (error) {
      console.error('Error fetching horarios:', error);
    }
  };

  const fetchAlumnos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumnos')
        .select('*, horarios(nombre, dias), pagos(fecha_vencimiento)')
        .order('fecha_registro', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const processedAlumnos = (data || []).map(a => {
        let paymentStatus = 'none';
        if (a.pagos && a.pagos.length > 0) {
          const latestPago = [...a.pagos].sort((x, y) => new Date(y.fecha_vencimiento) - new Date(x.fecha_vencimiento))[0];
          const vDate = new Date(`${latestPago.fecha_vencimiento}T00:00:00`);
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

      setAlumnos(processedAlumnos);
    } catch (error) {
      console.error('Error fetching alumnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormErrors({ ...formErrors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let errors = {};
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const phoneRegex = /^\d{9}$/;

    if (!nameRegex.test(formData.nombre.trim())) {
      errors.nombre = 'Solo se permiten letras y espacios';
    }
    if (!nameRegex.test(formData.apellidos.trim())) {
      errors.apellidos = 'Solo se permiten letras y espacios';
    }
    if (!phoneRegex.test(formData.telefono_padres.trim())) {
      errors.telefono_padres = 'Debe contener exactamente 9 dígitos numéricos';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSaving(true);

      const payload = { ...formData };
      if (!payload.horario_id) {
        payload.horario_id = null;
      }

      if (editId) {
        const { error } = await supabase
          .from('alumnos')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('alumnos')
          .insert([payload]);
        if (error) throw error;
      }

      // Close modal, clear form, refresh data
      setIsModalOpen(false);
      setFormData({ nombre: '', apellidos: '', telefono_padres: '', cinturon: 'Blanco', horario_id: '' });
      setEditId(null);
      await fetchAlumnos();
    } catch (error) {
      console.error('Error saving alumno:', error);
      alert('Error al guardar el alumno. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const openNewModal = () => {
    setEditId(null);
    setFormData({ nombre: '', apellidos: '', telefono_padres: '', cinturon: 'Blanco', horario_id: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (alumno) => {
    setEditId(alumno.id);
    setFormData({
      nombre: alumno.nombre,
      apellidos: alumno.apellidos,
      telefono_padres: alumno.telefono_padres,
      cinturon: alumno.cinturon,
      horario_id: alumno.horario_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('alumnos')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setDeleteId(null);
      await fetchAlumnos();
    } catch (error) {
      console.error('Error deleting alumno:', error);
      alert('Error al eliminar el alumno.');
    } finally {
      setDeleting(false);
    }
  };

  const openProfileModal = async (alumno) => {
    setSelectedProfile(alumno);
    setIsProfileModalOpen(true);
    setProfileStats(prev => ({ ...prev, loading: true }));

    try {
      // 1. Pagos recientes (ultimos 5)
      const { data: pagosData } = await supabase
        .from('pagos')
        .select('*')
        .eq('alumno_id', alumno.id)
        .order('fecha_pago', { ascending: false })
        .limit(5);

      // 2. Asistencias (Historial completo para navegación)
      const { data: asistenciasData } = await supabase
        .from('asistencias')
        .select('fecha_asistencia')
        .eq('alumno_id', alumno.id);

      // 3. Cálculo de clases restantes con motor matemático
      const { data: todosPagos } = await supabase
        .from('pagos')
        .select('fecha_inicio, fecha_vencimiento')
        .eq('alumno_id', alumno.id);

      let clasesRestantes = 0;
      if (todosPagos && todosPagos.length > 0) {
        // Encontrar el pago con mayor fecha de vencimiento
        const latestPago = [...todosPagos].sort((x, y) => new Date(y.fecha_vencimiento) - new Date(x.fecha_vencimiento))[0];
        clasesRestantes = calcularClasesRestantes(
          latestPago.fecha_inicio,
          latestPago.fecha_vencimiento,
          alumno.horarios?.dias || []
        );
      }

      // Guardamos todas las fechas en formato YYYY-MM-DD local
      const fechasHistorial = asistenciasData?.map(a => {
        const d = new Date(a.fecha_asistencia);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }) || [];

      setProfileStats({
        pagosRecientes: pagosData || [],
        asistenciasMes: fechasHistorial,
        clasesRestantes: clasesRestantes,
        latestPago: todosPagos && todosPagos.length > 0 ? [...todosPagos].sort((x, y) => new Date(y.fecha_vencimiento) - new Date(x.fecha_vencimiento))[0] : null,
        loading: false
      });
      setCurrentMonth(new Date());
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      setProfileStats(prev => ({ ...prev, loading: false }));
    }
  };

  const cinturones = ['Blanco', 'Amarillo', 'Verde', 'Azul', 'Rojo', 'Negro'];

  // Derived state for filtering
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
                Gestión
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-2 text-slate-900 dark:text-white transition-colors duration-500">
              Directorio de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Alumnos</span>
            </h1>
          </div>

          <button
            onClick={openNewModal}
            className="group relative flex items-center justify-between bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black px-6 py-3 rounded-full font-medium dark:hover:bg-gray-100 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shrink-0"
          >
            <span className="relative z-10 pr-4">Nuevo Alumno</span>
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

        {/* Table Container (Double-Bezel approach) */}
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
                  {alumnos.length === 0 ? 'Sin alumnos registrados' : 'Sin resultados de búsqueda'}
                </h3>
                <p className="text-slate-500 dark:text-white/60 mt-2 max-w-sm text-sm transition-colors duration-500">
                  {alumnos.length === 0
                    ? 'Aún no hay alumnos en la base de datos. Haz clic en "Nuevo Alumno" para empezar a registrarlos.'
                    : 'No se encontraron alumnos que coincidan con los filtros aplicados.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse animate-in fade-in duration-700">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 transition-colors duration-500">
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Nombre Completo</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Teléfono</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Cinturón</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Horario</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Registro</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Estado Pago</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 transition-all duration-300 ease-in-out">
                  {filteredAlumnos.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 ease-in-out group">
                      <td className="px-8 py-5">
                        <div className="font-semibold text-slate-900 dark:text-white transition-colors duration-300">{alumno.nombre} {alumno.apellidos}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-medium text-slate-700 dark:text-white/90 transition-colors duration-300">{alumno.telefono_padres}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 group-hover:border-slate-300 dark:bg-white/10 dark:border-white/10 dark:text-white dark:group-hover:border-white/20 transition-all duration-300 ease-in-out">
                          {alumno.cinturon}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-medium text-slate-700 dark:text-white/90 transition-colors duration-300">
                          {alumno.horarios?.nombre || '-'}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="inline-flex items-center gap-2 text-slate-500 dark:text-white/50 text-sm">
                          <Calendar className="w-4 h-4 opacity-50" />
                          {new Date(alumno.fecha_registro).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {alumno.paymentStatus === 'ok' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                            Al Día
                          </span>
                        )}
                        {alumno.paymentStatus === 'warning' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                            Por Vencer
                          </span>
                        )}
                        {alumno.paymentStatus === 'expired' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                            Vencido
                          </span>
                        )}
                        {alumno.paymentStatus === 'none' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-white/10 dark:text-white/50 dark:border-white/10">
                            Sin Pagos
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openProfileModal(alumno)}
                            className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-all duration-300 ease-in-out rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                            title="Ver Expediente"
                          >
                            <Eye className="w-[18px] h-[18px] transition-transform duration-300 hover:scale-110" />
                          </button>
                          <button
                            onClick={() => openEditModal(alumno)}
                            className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-all duration-300 ease-in-out rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                            title="Editar"
                          >
                            <Edit2 className="w-[18px] h-[18px] transition-transform duration-300 hover:scale-110" />
                          </button>
                          <button
                            onClick={() => setDeleteId(alumno.id)}
                            className="p-2 text-slate-500 hover:text-red-600 dark:text-white/60 dark:hover:text-red-500 transition-all duration-300 ease-in-out rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                            title="Eliminar"
                          >
                            <Trash2 className="w-[18px] h-[18px] transition-transform duration-300 hover:scale-110" />
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

      {/* Modal - Nuevo Alumno */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => !saving && setIsModalOpen(false)} />

          <div className="relative w-full max-w-lg p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6 transition-all duration-300 ease-in-out">

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ease-in-out">
                  {editId ? 'Editar Alumno' : 'Nuevo Alumno'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-white/70 flex items-center justify-center dark:hover:bg-white/10 dark:hover:text-white transition-all duration-300 ease-in-out disabled:opacity-50"
                >
                  <X className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      disabled={saving}
                      required
                      className={`w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50 ${formErrors.nombre ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`}
                    />
                    {formErrors.nombre && (
                      <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1">
                        {formErrors.nombre}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Apellidos</label>
                    <input
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleInputChange}
                      disabled={saving}
                      required
                      className={`w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50 ${formErrors.apellidos ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`}
                    />
                    {formErrors.apellidos && (
                      <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1">
                        {formErrors.apellidos}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Teléfono (Padres/Tutor)</label>
                  <input
                    type="tel"
                    name="telefono_padres"
                    value={formData.telefono_padres}
                    onChange={handleInputChange}
                    disabled={saving}
                    required
                    className={`w-full bg-slate-50 border text-slate-900 focus:bg-white dark:bg-white/5 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50 ${formErrors.telefono_padres ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`}
                  />
                  {formErrors.telefono_padres && (
                    <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1">
                      {formErrors.telefono_padres}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Cinturón Actual</label>
                  <select
                    name="cinturon"
                    value={formData.cinturon}
                    onChange={handleInputChange}
                    disabled={saving}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-all duration-300 ease-in-out disabled:opacity-50 appearance-none"
                  >
                    {cinturones.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Horario Asignado</label>
                  <select
                    name="horario_id"
                    value={formData.horario_id}
                    onChange={handleInputChange}
                    disabled={saving}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-all duration-300 ease-in-out disabled:opacity-50 appearance-none"
                  >
                    <option value="">Sin horario asignado</option>
                    {horariosDisponibles.map(h => (
                      <option key={h.id} value={h.id}>{h.nombre}</option>
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
                      'Guardar Alumno'
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-all duration-300 ease-in-out">¿Eliminar alumno?</h3>
                <p className="text-sm text-slate-500 dark:text-white/50 transition-all duration-300 ease-in-out">Esta acción no se puede deshacer. Los datos se borrarán permanentemente.</p>
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

      {/* Modal - Perfil de Alumno (Expediente) */}
      {isProfileModalOpen && selectedProfile && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => setIsProfileModalOpen(false)} />

          <div className="relative w-full max-w-4xl p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col max-h-[85vh] lg:max-h-[80vh] transition-all duration-300 ease-in-out overflow-hidden">

              {/* Header del Perfil */}
              <div className="flex items-start justify-between pb-6 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ease-in-out">
                    {selectedProfile.nombre} {selectedProfile.apellidos}
                  </h2>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-white">
                      {selectedProfile.cinturon}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-medium text-slate-500 dark:text-white/70">
                      {selectedProfile.horarios?.nombre || 'Sin horario asignado'}
                    </span>
                    {profileStats.loading ? (
                      <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full border font-bold ${profileStats.clasesRestantes <= 0 ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40' : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/40'}`}>
                        Clases Restantes: {profileStats.clasesRestantes}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-white/70 flex items-center justify-center dark:hover:bg-white/10 dark:hover:text-white transition-all duration-300 ease-in-out"
                >
                  <X className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
                </button>
              </div>

              {/* Contenido del Perfil */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 overflow-y-auto custom-scrollbar">

                {/* Lado Izquierdo: Pagos */}
                <div className="flex flex-col gap-6 lg:border-r border-slate-200 dark:border-white/10 lg:pr-8">
                  <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 dark:text-white/30">Pagos Recientes</h3>

                  {profileStats.loading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                    </div>
                  ) : profileStats.pagosRecientes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                      <span className="text-slate-400 dark:text-white/60 text-sm">No hay pagos registrados.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {profileStats.pagosRecientes.map(pago => (
                        <div key={pago.id} className="flex flex-col p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 transition-colors duration-300">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">S/ {pago.monto}</span>
                            <span className="text-xs font-medium text-slate-500 dark:text-white/50">{new Date(pago.fecha_pago).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-end text-xs font-semibold text-slate-500 dark:text-white/40 mt-1">
                            {pago.metodo_pago}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lado Derecho: Calendario */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 dark:text-white/30">
                      Asistencia del Mes
                    </h3>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-5">
                    {/* Controles de navegacion de mes */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                        {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Dias de la semana */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                        <div key={d} className="text-center text-[10px] uppercase font-bold text-slate-400 dark:text-white/30">{d}</div>
                      ))}
                    </div>

                    {/* Cuadricula del Mes */}
                    <div className="grid grid-cols-7 gap-2 min-h-[260px] sm:min-h-[280px] content-start">
                      {(() => {
                        const year = currentMonth.getFullYear();
                        const month = currentMonth.getMonth();

                        // 0 = Domingo, 1 = Lunes
                        const firstDay = new Date(year, month, 1).getDay();
                        // Ajustamos para que la semana empiece en Lunes (0=Lunes, 6=Domingo)
                        const startOffset = firstDay === 0 ? 6 : firstDay - 1;

                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const now = new Date();
                        const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                        const diasTurno = selectedProfile.horarios?.dias || [];

                        const { fecha_inicio, fecha_vencimiento } = profileStats.latestPago || {};
                        const inicioTime = fecha_inicio ? new Date(`${fecha_inicio}T00:00:00`).getTime() : null;
                        const finTime = fecha_vencimiento ? new Date(`${fecha_vencimiento}T23:59:59`).getTime() : null;

                        const cells = [];

                        // Empty slots before 1st of month
                        for (let i = 0; i < startOffset; i++) {
                          cells.push(<div key={`empty-${i}`} className="w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-xl" />);
                        }

                        // Days of month
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateObj = new Date(year, month, d);
                          const cellTime = dateObj.getTime();
                          const mm = String(month + 1).padStart(2, '0');
                          const dd = String(d).padStart(2, '0');
                          const dateStr = `${year}-${mm}-${dd}`;
                          const dateKey = `${mm}-${dd}`;
                          const nombreDia = diasSemana[dateObj.getDay()];

                          const isWithinRange = inicioTime && finTime && cellTime >= inicioTime && cellTime <= finTime;
                          const shouldAttend = isWithinRange && diasTurno.includes(nombreDia) && !FERIADOS_PERU.includes(dateKey);

                          const attended = profileStats.asistenciasMes.includes(dateStr);
                          const isPastStrict = cellTime < todayTime; // Strictly before today
                          const isFutureOrToday = cellTime >= todayTime;

                          let bgColor = "bg-transparent";
                          let borderColor = "border-transparent";
                          let textColor = "text-slate-400 dark:text-white/40";

                          if (attended) {
                            // VERDE
                            bgColor = "bg-emerald-500";
                            borderColor = "border-emerald-600";
                            textColor = "text-white font-bold";
                          } else if (shouldAttend && isPastStrict) {
                            // ROJO
                            bgColor = "bg-red-500";
                            borderColor = "border-red-600";
                            textColor = "text-white font-bold";
                          } else if (shouldAttend && isFutureOrToday) {
                            // GRIS (Pendiente)
                            bgColor = "bg-gray-200 dark:bg-white/10";
                            borderColor = "border-gray-300 dark:border-white/20";
                            textColor = "text-slate-600 dark:text-white/90 font-bold";
                          } else {
                            // NEUTRO (Libre, transparente)
                            bgColor = "bg-transparent";
                            borderColor = "border-transparent";
                            textColor = "text-slate-400 dark:text-white/30";
                          }

                          cells.push(
                            <div
                              key={`day-${d}`}
                              className={`w-8 h-8 sm:w-9 sm:h-9 mx-auto flex items-center justify-center rounded-lg border transition-colors duration-300 ${bgColor} ${borderColor}`}
                              title={dateStr}
                            >
                              <span className={`text-xs sm:text-sm ${textColor}`}>{d}</span>
                            </div>
                          );
                        }

                        return cells;
                      })()}
                    </div>

                    <div className="flex items-center gap-6 mt-6 justify-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs text-slate-500 dark:text-white/40 font-medium">Asistió</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-xs text-slate-500 dark:text-white/40 font-medium">Faltó</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-neutral-700" />
                        <span className="text-xs text-slate-500 dark:text-white/40 font-medium">Pendiente / Libre</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </DashboardLayout>
  );
}
