import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../services/supabaseClient';
import { Plus, Users, X, Loader2, Calendar } from 'lucide-react';

export default function Alumnos() {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono_padres: '',
    cinturon: 'Blanco'
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchAlumnos();
  }, []);

  const fetchAlumnos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('fecha_registro', { ascending: false });

      if (error) throw error;
      setAlumnos(data || []);
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
      const { error } = await supabase
        .from('alumnos')
        .insert([formData]);

      if (error) throw error;

      // Close modal, clear form, refresh data
      setIsModalOpen(false);
      setFormData({ nombre: '', apellidos: '', telefono_padres: '', cinturon: 'Blanco' });
      await fetchAlumnos();
    } catch (error) {
      console.error('Error saving alumno:', error);
      alert('Error al guardar el alumno. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const cinturones = ['Blanco', 'Amarillo', 'Verde', 'Azul', 'Rojo', 'Negro'];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-white/60">
                Gestión
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-2">
              Directorio de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700">Alumnos</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group relative flex items-center justify-between bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shrink-0"
          >
            <span className="relative z-10 pr-4">Nuevo Alumno</span>
            <div className="relative z-10 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors duration-500 shrink-0">
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" strokeWidth={2.5} />
            </div>
          </button>
        </header>

        {/* Table Container (Double-Bezel approach) */}
        <div className="p-1.5 bg-white/[0.02] border border-white/10 rounded-[2rem] shadow-2xl backdrop-blur-xl transition-colors duration-700 w-full overflow-hidden">
          <div className="bg-[#0a0a0a] rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col w-full overflow-x-auto custom-scrollbar relative min-h-[400px]">
            
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            ) : alumnos.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-white/30" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">Sin alumnos registrados</h3>
                <p className="text-white/40 mt-2 max-w-sm text-sm">
                  Aún no hay alumnos en la base de datos. Haz clic en "Nuevo Alumno" para empezar a registrarlos.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse animate-in fade-in duration-700">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Nombre Completo</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Teléfono</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Cinturón</th>
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/40 text-right">Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {alumnos.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-white/[0.02] transition-colors duration-300 group">
                      <td className="px-8 py-5">
                        <div className="font-medium text-white">{alumno.nombre} {alumno.apellidos}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-white/70">{alumno.telefono_padres}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/80 group-hover:border-white/20 transition-colors duration-300">
                          {alumno.cinturon}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="inline-flex items-center gap-2 text-white/50 text-sm">
                          <Calendar className="w-4 h-4 opacity-50" />
                          {new Date(alumno.fecha_registro).toLocaleDateString()}
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => !saving && setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-lg p-1.5 bg-white/[0.02] border border-white/10 rounded-[2rem] shadow-2xl animate-in fade-in zoom-in-95 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="p-8 bg-[#0a0a0a] rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-6">
              
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Nuevo Alumno</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-white/40 font-medium ml-1">Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      disabled={saving}
                      required
                      className={`w-full bg-white/5 border text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-colors duration-300 disabled:opacity-50 ${formErrors.nombre ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {formErrors.nombre && (
                      <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1">
                        {formErrors.nombre}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-white/40 font-medium ml-1">Apellidos</label>
                    <input
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleInputChange}
                      disabled={saving}
                      required
                      className={`w-full bg-white/5 border text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-colors duration-300 disabled:opacity-50 ${formErrors.apellidos ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {formErrors.apellidos && (
                      <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1">
                        {formErrors.apellidos}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-white/40 font-medium ml-1">Teléfono (Padres/Tutor)</label>
                  <input
                    type="tel"
                    name="telefono_padres"
                    value={formData.telefono_padres}
                    onChange={handleInputChange}
                    disabled={saving}
                    required
                    className={`w-full bg-white/5 border text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-colors duration-300 disabled:opacity-50 ${formErrors.telefono_padres ? 'border-red-500' : 'border-white/10'}`}
                  />
                  {formErrors.telefono_padres && (
                    <span className="text-[10px] text-red-500 font-medium tracking-wide animate-in fade-in slide-in-from-top-1 ml-1">
                      {formErrors.telefono_padres}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-white/40 font-medium ml-1">Cinturón Actual</label>
                  <select
                    name="cinturon"
                    value={formData.cinturon}
                    onChange={handleInputChange}
                    disabled={saving}
                    className="w-full bg-[#111] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors duration-300 disabled:opacity-50 appearance-none"
                  >
                    {cinturones.map(c => (
                      <option key={c} value={c}>{c}</option>
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
        </div>
      )}
    </DashboardLayout>
  );
}
