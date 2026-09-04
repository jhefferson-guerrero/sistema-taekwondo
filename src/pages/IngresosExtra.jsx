import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabaseClient';
import { Search, Plus, Minus, X, CheckCircle, Calendar, DollarSign, CreditCard, Trash2, Edit2, Loader2, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import Pagination from '../components/Pagination';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function IngresosExtra() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    concepto: '',
    monto: '',
    fecha: getTodayStr(),
    metodo_pago: 'Efectivo',
    notas: ''
  });
  const [saving, setSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchIngresosData = async () => {
    const { data, error } = await supabase
      .from('ingresos_extra')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const { data: ingresos = [], isLoading: loading } = useQuery({
    queryKey: ['ingresosExtra'],
    queryFn: fetchIngresosData
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
        concepto: formData.concepto,
        monto: parseFloat(formData.monto),
        fecha: formData.fecha,
        metodo_pago: formData.metodo_pago,
        notas: formData.notas
      };

      if (editId) {
        const { error } = await supabase
          .from('ingresos_extra')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ingresos_extra')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setFormData({
        concepto: '',
        monto: '',
        fecha: getTodayStr(),
        metodo_pago: 'Efectivo',
        notas: ''
      });
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ['ingresosExtra'] });
    } catch (error) {
      console.error('Error saving ingreso:', error);
      alert('Error al guardar el ingreso. Verifica que la tabla en Supabase haya sido creada correctamente.');
    } finally {
      setSaving(false);
    }
  };

  const openNewModal = () => {
    setEditId(null);
    setFormData({
      concepto: '',
      monto: '',
      fecha: getTodayStr(),
      metodo_pago: 'Efectivo',
      notas: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ingreso) => {
    setEditId(ingreso.id);
    setFormData({
      concepto: ingreso.concepto,
      monto: ingreso.monto,
      fecha: ingreso.fecha || getTodayStr(),
      metodo_pago: ingreso.metodo_pago,
      notas: ingreso.notas || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('ingresos_extra')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['ingresosExtra'] });
    } catch (error) {
      console.error('Error deleting ingreso:', error);
      alert('Error al eliminar el ingreso.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredIngresos = ingresos.filter(ing => {
    if (!searchTerm) return true;
    return ing.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ing.notas && ing.notas.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const totalPages = Math.ceil(filteredIngresos.length / itemsPerPage);
  const paginatedIngresos = filteredIngresos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col gap-8 pb-10">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
              Caja
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-2 text-slate-900 dark:text-white transition-colors duration-500">
            Ingresos <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Extra</span>
          </h1>
        </div>

        <button
          onClick={openNewModal}
          className="group relative flex items-center justify-between bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black px-6 py-3 rounded-full font-medium dark:hover:bg-gray-100 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shrink-0"
        >
          <span className="relative z-10 pr-4">Nuevo Ingreso</span>
          <div className="relative z-10 w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 dark:bg-slate-800/10 flex items-center justify-center dark:group-hover:bg-black/20 transition-colors duration-500 shrink-0">
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" strokeWidth={2.5} />
          </div>
        </button>
      </header>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 w-full relative z-10">
        <div className="relative group/search w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400 group-focus-within/search:text-red-600 dark:text-white/40 dark:group-focus-within/search:text-red-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar por concepto o notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-all duration-300 ease-in-out shadow-sm"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-700 w-full overflow-hidden flex flex-col">
        <div className="bg-white dark:bg-slate-800 rounded-t-[calc(2rem-0.375rem)] flex-1 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col w-full overflow-x-auto custom-scrollbar relative min-h-[400px] transition-colors duration-500">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 transition-colors duration-500">
                <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80">Fecha</th>
                <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80">Concepto</th>
                <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80">Notas</th>
                <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80 text-center">Monto</th>
                <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80 text-center">Método</th>
                <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-white/80 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 transition-all duration-300 ease-in-out">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto" />
                    <p className="text-slate-500 dark:text-white/50 mt-4 font-medium">Cargando ingresos...</p>
                  </td>
                </tr>
              ) : paginatedIngresos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10">
                      <DollarSign className="w-8 h-8 text-slate-400 dark:text-white/30" />
                    </div>
                    <p className="text-slate-900 dark:text-white font-medium text-lg">No hay ingresos registrados</p>
                    <p className="text-slate-500 dark:text-white/50 mt-1">Intenta cambiar los filtros o agrega un nuevo ingreso.</p>
                  </td>
                </tr>
              ) : (
                paginatedIngresos.map((ingreso) => (
                  <tr key={ingreso.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 ease-in-out group">
                    <td className="px-8 py-5">
                      <div className="font-semibold text-slate-900 dark:text-white transition-colors duration-300">{ingreso.fecha}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="font-semibold text-slate-900 dark:text-white">{ingreso.concepto}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-slate-600 dark:text-white/60 text-sm max-w-[200px] truncate block">
                        {ingreso.notas || '-'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="inline-flex items-center justify-center font-bold text-slate-900 dark:text-white transition-colors duration-300">
                        S/ {Number(ingreso.monto).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 text-xs font-semibold tracking-wide transition-colors duration-300">
                        {ingreso.metodo_pago}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(ingreso)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(ingreso.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal - Nuevo/Editar Ingreso */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out"
            onClick={() => !saving && setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-md p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-in-out">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-5 transition-all duration-300 ease-in-out">

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ease-in-out">
                  {editId ? 'Editar Ingreso' : 'Nuevo Ingreso Extra'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-white/70 flex items-center justify-center dark:hover:bg-white/10 dark:hover:text-white transition-all duration-300 ease-in-out disabled:opacity-50"
                >
                  <X className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
                </button>
              </div>

              <form id="ingreso-form" onSubmit={handleSubmit} className="flex flex-col gap-5">

                <div className="flex flex-col gap-2 relative">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1 transition-colors duration-500">Concepto</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="concepto"
                      required
                      placeholder="Ej. Clase suelta (Juan Pérez), Uniforme M"
                      value={formData.concepto}
                      onChange={handleInputChange}
                      disabled={saving}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-all duration-300 ease-in-out disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1 transition-colors duration-500">Monto (S/)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">S/</div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="monto"
                        required
                        value={formData.monto}
                        onChange={handleInputChange}
                        disabled={saving}
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
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1 transition-colors duration-500">Fecha</label>
                    <div className="relative">
                      <input
                        type="date"
                        name="fecha"
                        required
                        value={formData.fecha}
                        onChange={handleInputChange}
                        disabled={saving}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 dark:focus:bg-white/10 transition-all duration-300 ease-in-out disabled:opacity-50 dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1 transition-colors duration-500">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Efectivo', 'Yape', 'Plin', 'Transferencia'].map((metodo) => (
                      <button
                        key={metodo}
                        type="button"
                        onClick={() => setFormData({ ...formData, metodo_pago: metodo })}
                        disabled={saving}
                        className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border disabled:opacity-50 ${formData.metodo_pago === metodo
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md dark:bg-white dark:text-black dark:border-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-transparent dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5'
                          }`}
                      >
                        {metodo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 relative">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-white/80 font-medium ml-1 transition-colors duration-500">Notas / Detalles (Opcional)</label>
                  <div className="relative">
                    <textarea
                      name="notas"
                      value={formData.notas}
                      onChange={handleInputChange}
                      disabled={saving}
                      rows="2"
                      placeholder="Algún detalle adicional..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-white/10 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-all duration-300 ease-in-out disabled:opacity-50 resize-none"
                    ></textarea>
                  </div>
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
                      editId ? 'Actualizar Ingreso' : 'Guardar Ingreso'
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-all duration-300 ease-in-out">¿Eliminar registro?</h3>
                <p className="text-sm text-slate-700 dark:text-white/80 transition-all duration-300 ease-in-out">Esta acción no se puede deshacer. Los datos se borrarán permanentemente.</p>
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

    </div>
  );
}
