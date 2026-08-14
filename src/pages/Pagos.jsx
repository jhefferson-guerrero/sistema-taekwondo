import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../services/supabaseClient';
import { Plus, Minus, CreditCard, X, Loader2, Calendar, Edit2, Trash2, AlertCircle, Search, Filter } from 'lucide-react';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getNextMonthStr = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [metodoFilter, setMetodoFilter] = useState('Todos');

  // Form State
  const [formData, setFormData] = useState({
    alumno_id: '',
    monto: '',
    fecha_inicio: getTodayStr(),
    fecha_vencimiento: getNextMonthStr(getTodayStr()),
    metodo_pago: 'Efectivo'
  });
  const [saving, setSaving] = useState(false);
  const [alumnoSearchTerm, setAlumnoSearchTerm] = useState('');
  const [isAlumnoDropdownOpen, setIsAlumnoDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select(`
          *,
          alumnos (
            nombre,
            apellidos
          )
        `)
        .order('fecha_pago', { ascending: false });

      if (pagosError) throw pagosError;
      setPagos(pagosData || []);

      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, nombre, apellidos')
        .order('nombre', { ascending: true });

      if (alumnosError) throw alumnosError;
      setAlumnos(alumnosData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fecha_inicio') {
      setFormData({
        ...formData,
        fecha_inicio: value,
        fecha_vencimiento: getNextMonthStr(value)
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const adjustMonto = (delta) => {
    const current = parseFloat(formData.monto) || 0;
    const next = Math.max(0, current + delta);
    setFormData(prev => ({ ...prev, monto: next.toFixed(2) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      const payload = {
        alumno_id: formData.alumno_id,
        monto: parseFloat(formData.monto),
        fecha_inicio: formData.fecha_inicio,
        fecha_vencimiento: formData.fecha_vencimiento,
        metodo_pago: formData.metodo_pago
      };

      if (editId) {
        const { error } = await supabase
          .from('pagos')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pagos')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setFormData({
        alumno_id: '',
        monto: '',
        fecha_inicio: getTodayStr(),
        fecha_vencimiento: getNextMonthStr(getTodayStr()),
        metodo_pago: 'Efectivo'
      });
      setEditId(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving pago:', error);
      alert('Error al guardar el pago. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const openNewModal = () => {
    setEditId(null);
    setFormData({
      alumno_id: '',
      monto: '',
      fecha_inicio: getTodayStr(),
      fecha_vencimiento: getNextMonthStr(getTodayStr()),
      metodo_pago: 'Efectivo'
    });
    setAlumnoSearchTerm('');
    setIsModalOpen(true);
  };

  const openEditModal = (pago) => {
    setEditId(pago.id);
    setFormData({
      alumno_id: pago.alumno_id,
      monto: pago.monto,
      fecha_inicio: pago.fecha_inicio || getTodayStr(),
      fecha_vencimiento: pago.fecha_vencimiento || getNextMonthStr(getTodayStr()),
      metodo_pago: pago.metodo_pago
    });
    const pagoAlumno = alumnos.find(a => a.id === pago.alumno_id);
    setAlumnoSearchTerm(pagoAlumno ? `${pagoAlumno.nombre} ${pagoAlumno.apellidos}` : '');
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('pagos')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setDeleteId(null);
      await fetchData();
    } catch (error) {
      console.error('Error deleting pago:', error);
      alert('Error al eliminar el pago.');
    } finally {
      setDeleting(false);
    }
  };

  const metodosPago = ['Efectivo', 'Yape', 'Plin', 'Transferencia'];

  const filteredPagos = pagos.filter(pago => {
    const alumnoNombreCompleto = `${pago.alumnos?.nombre || ''} ${pago.alumnos?.apellidos || ''}`.toLowerCase();
    const matchesSearch = alumnoNombreCompleto.includes(searchTerm.toLowerCase());
    const matchesMetodo = metodoFilter === 'Todos' || pago.metodo_pago === metodoFilter;

    return matchesSearch && matchesMetodo;
  });

  const filteredAlumnosDropdown = alumnos.filter(a => {
    const full = `${a.nombre} ${a.apellidos}`.toLowerCase();
    return full.includes(alumnoSearchTerm.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">

        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
                Finanzas
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-2 text-slate-900 dark:text-white transition-colors duration-500">
              Registro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Pagos</span>
            </h1>
          </div>

          <button
            onClick={openNewModal}
            className="group relative flex items-center justify-between bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black px-6 py-3 rounded-full font-medium dark:hover:bg-gray-100 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shrink-0"
          >
            <span className="relative z-10 pr-4">Nuevo Pago</span>
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
              placeholder="Buscar por nombre de alumno..."
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
              value={metodoFilter}
              onChange={(e) => setMetodoFilter(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm appearance-none"
            >
              <option value="Todos">Todos los métodos</option>
              {metodosPago.map(m => (
                <option key={m} value={m}>{m}</option>
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
            ) : filteredPagos.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center mb-6 transition-colors duration-500">
                  <CreditCard className="w-8 h-8 text-slate-400 dark:text-white/30" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight transition-colors duration-500">
                  {pagos.length === 0 ? 'Sin pagos registrados' : 'Sin resultados de búsqueda'}
                </h3>
                <p className="text-slate-500 dark:text-white/60 mt-2 max-w-sm text-sm transition-colors duration-500">
                  {pagos.length === 0
                    ? 'Aún no hay pagos en la base de datos. Haz clic en "Nuevo Pago" para empezar a registrarlos.'
                    : 'No se encontraron pagos que coincidan con los filtros aplicados.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse animate-in fade-in duration-700">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 transition-colors duration-500">
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Alumno</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Monto</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Vigencia</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Método</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Fecha</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Estado</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 transition-all duration-300 ease-in-out">
                  {filteredPagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 ease-in-out group">
                      <td className="px-8 py-5">
                        <div className="font-semibold text-slate-900 dark:text-white transition-colors duration-300">{pago.alumnos?.nombre} {pago.alumnos?.apellidos}</div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="font-medium text-slate-700 dark:text-white/90 transition-colors duration-300 text-emerald-600 dark:text-red-500">
                          S/ {Number(pago.monto).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex flex-col items-center text-xs text-slate-500 dark:text-white/60">
                          <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 w-max">
                            <span>{pago.fecha_inicio ? new Date(pago.fecha_inicio + 'T00:00:00').toLocaleDateString() : '-'}</span>
                            <span className="opacity-50 text-[10px]">→</span>
                            <span className="font-bold text-slate-700 dark:text-white/90">{pago.fecha_vencimiento ? new Date(pago.fecha_vencimiento + 'T00:00:00').toLocaleDateString() : '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 group-hover:border-slate-300 dark:bg-white/10 dark:border-white/10 dark:text-white dark:group-hover:border-white/20 transition-all duration-300 ease-in-out">
                          {pago.metodo_pago}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="inline-flex items-center justify-center gap-2 text-slate-500 dark:text-white/50 text-sm">
                          <Calendar className="w-4 h-4 opacity-50" />
                          {new Date(pago.fecha_pago).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ease-in-out ${pago.estado === 'Completado'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                          }`}>
                          {pago.estado || 'Completado'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(pago)}
                            className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-all duration-300 ease-in-out rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                            title="Editar"
                          >
                            <Edit2 className="w-[18px] h-[18px] transition-transform duration-300 hover:scale-110" />
                          </button>
                          <button
                            onClick={() => setDeleteId(pago.id)}
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

      {/* Modal - Nuevo/Editar Pago */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out" onClick={() => !saving && setIsModalOpen(false)} />

          <div className="relative w-full max-w-2xl p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6 transition-all duration-300 ease-in-out">

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ease-in-out">
                  {editId ? 'Editar Pago' : 'Nuevo Pago'}
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
                <div className="flex flex-col gap-2 relative">
                  <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Alumno</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar alumno..."
                      value={alumnoSearchTerm}
                      onChange={(e) => {
                        setAlumnoSearchTerm(e.target.value);
                        setIsAlumnoDropdownOpen(true);
                        setFormData({ ...formData, alumno_id: '' }); // reset selection if typing
                      }}
                      onFocus={() => setIsAlumnoDropdownOpen(true)}
                      onBlur={() => {
                        setTimeout(() => setIsAlumnoDropdownOpen(false), 200);
                      }}
                      disabled={saving}
                      required={!formData.alumno_id}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-all duration-300 ease-in-out disabled:opacity-50"
                    />
                    {isAlumnoDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredAlumnosDropdown.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-500 dark:text-white/50">No se encontraron alumnos</div>
                        ) : (
                          filteredAlumnosDropdown.map(a => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, alumno_id: a.id });
                                setAlumnoSearchTerm(`${a.nombre} ${a.apellidos}`);
                                setIsAlumnoDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white transition-colors"
                            >
                              {a.nombre} {a.apellidos}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Monto (S/)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">S/</div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="monto"
                        value={formData.monto}
                        onChange={handleInputChange}
                        disabled={saving}
                        required
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl pl-10 pr-22 py-3 focus:outline-none focus:border-red-600 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:_textfield]"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button type="button" onClick={() => adjustMonto(-10)} disabled={saving} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 transition-colors disabled:opacity-50">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => adjustMonto(10)} disabled={saving} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 transition-colors disabled:opacity-50">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Fecha de Inicio</label>
                    <div className="relative">
                      <input
                        type="date"
                        name="fecha_inicio"
                        value={formData.fecha_inicio}
                        onChange={handleInputChange}
                        disabled={saving}
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Fecha de Vencimiento</label>
                    <div className="relative">
                      <input
                        type="date"
                        name="fecha_vencimiento"
                        value={formData.fecha_vencimiento}
                        onChange={handleInputChange}
                        disabled={saving}
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium ml-1 transition-colors duration-500">Método de Pago</label>
                  <select
                    name="metodo_pago"
                    value={formData.metodo_pago}
                    onChange={handleInputChange}
                    disabled={saving}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-all duration-300 ease-in-out disabled:opacity-50 appearance-none"
                  >
                    {metodosPago.map(m => (
                      <option key={m} value={m}>{m}</option>
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
                      'Guardar Pago'
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-all duration-300 ease-in-out">¿Eliminar pago?</h3>
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
    </DashboardLayout>
  );
}
