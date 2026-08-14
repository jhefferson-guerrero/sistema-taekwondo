import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../services/supabaseClient';
import { Loader2, TrendingUp, Users, AlertTriangle, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // KPIs
  const [ingresosMes, setIngresosMes] = useState(0);
  const [totalAlumnos, setTotalAlumnos] = useState(0);
  const [vencidasCount, setVencidasCount] = useState(0);

  // Alertas
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [alumnosRes, pagosRes] = await Promise.all([
        supabase.from('alumnos').select('id, nombre, apellidos'),
        supabase.from('pagos').select('id, alumno_id, monto, fecha_inicio, fecha_vencimiento')
      ]);

      if (alumnosRes.error) throw alumnosRes.error;
      if (pagosRes.error) throw pagosRes.error;

      const alumnosData = alumnosRes.data || [];
      const pagosData = pagosRes.data || [];

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 1. Ingresos del Mes (basado en fecha_inicio)
      let sumaIngresos = 0;
      pagosData.forEach(p => {
        if (!p.fecha_inicio) return;
        const pDate = new Date(`${p.fecha_inicio}T00:00:00`);
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          sumaIngresos += Number(p.monto || 0);
        }
      });
      setIngresosMes(sumaIngresos);

      // 2. Alumnos Registrados
      setTotalAlumnos(alumnosData.length);

      // Agrupar el último pago de cada alumno
      const alumnosConUltimoPago = alumnosData.map(a => {
        const misPagos = pagosData.filter(p => p.alumno_id === a.id);
        let latestPago = null;
        if (misPagos.length > 0) {
          latestPago = [...misPagos].sort((x, y) => new Date(y.fecha_vencimiento) - new Date(x.fecha_vencimiento))[0];
        }
        return { ...a, latestPago };
      });

      // 3. Mensualidades Vencidas (históricas)
      let vencidas = 0;
      alumnosConUltimoPago.forEach(a => {
        if (a.latestPago && a.latestPago.fecha_vencimiento) {
          const vDate = new Date(`${a.latestPago.fecha_vencimiento}T00:00:00`);
          if (vDate < today) {
            vencidas++;
          }
        }
      });
      setVencidasCount(vencidas);

      // 4. Alertas (Últimos 15 días vencidos, próximos 5 días por vencer)
      const limitPast = new Date(today);
      limitPast.setDate(today.getDate() - 15);

      const limitFuture = new Date(today);
      limitFuture.setDate(today.getDate() + 5);

      const listaAlertas = [];
      alumnosConUltimoPago.forEach(a => {
        if (a.latestPago && a.latestPago.fecha_vencimiento) {
          const vDate = new Date(`${a.latestPago.fecha_vencimiento}T00:00:00`);

          if (vDate >= limitPast && vDate <= limitFuture) {
            let status = '';
            if (vDate < today) {
              status = 'Vencido';
            } else {
              status = 'Vence pronto';
            }
            listaAlertas.push({
              id: a.id,
              nombreCompleto: `${a.nombre} ${a.apellidos}`,
              fechaVencimiento: a.latestPago.fecha_vencimiento,
              vDate,
              status
            });
          }
        }
      });

      // Ordenar cronológicamente (las más antiguas primero)
      listaAlertas.sort((a, b) => a.vDate - b.vDate);
      setAlertas(listaAlertas);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">

        {/* Header Section */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
              Métricas
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mt-4 text-slate-900 dark:text-white transition-colors duration-500">
            Resumen de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Academia</span>
          </h1>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

              {/* Tarjeta 1: Ingresos */}
              <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] backdrop-blur-xl group transition-colors duration-700">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-4 h-full relative overflow-hidden transition-colors duration-500">
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-500 dark:text-white/50 text-xs font-semibold tracking-[0.15em] uppercase">Ingresos del Mes</h3>
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center transition-colors duration-500">
                      <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-500" />
                    </div>
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 transition-all duration-500">
                    <span className="text-xl text-slate-400 dark:text-white/30 mr-1">S/</span>
                    {ingresosMes.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Alumnos Registrados */}
              <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] backdrop-blur-xl group transition-colors duration-700">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-4 h-full relative overflow-hidden transition-colors duration-500">
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-500 dark:text-white/50 text-xs font-semibold tracking-[0.15em] uppercase">Alumnos Registrados</h3>
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center transition-colors duration-500">
                      <Users className="w-5 h-5 text-red-600 dark:text-red-500" />
                    </div>
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 transition-all duration-500">
                    {totalAlumnos}
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Mensualidades Vencidas */}
              <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] backdrop-blur-xl group transition-colors duration-700">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-4 h-full relative overflow-hidden transition-colors duration-500">
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-500 dark:text-white/50 text-xs font-semibold tracking-[0.15em] uppercase">Mensualidades Vencidas</h3>
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center transition-colors duration-500">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
                    </div>
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 transition-all duration-500">
                    {vencidasCount}
                  </div>
                </div>
              </div>

            </div>

            {/* SECCIÓN ALERTAS */}
            <div className="mt-4 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="flex items-center gap-2 px-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Alertas de Vencimiento</h2>
                <span className="text-sm text-slate-500 dark:text-white/50">(-15 días a +5 días)</span>
              </div>

              <div className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 border-t-[4px] border-t-red-600 dark:border-t-red-600 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-700 w-full overflow-hidden">
                <div className="bg-white dark:bg-slate-800 rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col w-full overflow-x-auto custom-scrollbar relative transition-colors duration-500">

                  {alertas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-12">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center mb-4 transition-colors duration-500">
                        <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-white/20" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Todo al día</h3>
                      <p className="text-slate-500 dark:text-white/50 mt-1">No hay mensualidades por vencer pronto ni vencimientos recientes.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 transition-colors duration-500 bg-slate-50/50 dark:bg-white/[0.02]">
                          <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Alumno</th>
                          <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Fecha de Vencimiento</th>
                          <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5 transition-all duration-300 ease-in-out">
                        {alertas.map((alerta) => (
                          <tr key={alerta.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 ease-in-out group">
                            <td className="px-8 py-5">
                              <div className="font-semibold text-slate-900 dark:text-white transition-colors duration-300">{alerta.nombreCompleto}</div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-white/70">
                                <Calendar className="w-4 h-4 opacity-50" />
                                {new Date(`${alerta.fechaVencimiento}T00:00:00`).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              {alerta.status === 'Vencido' ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                                  Vencido
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                                  Vence pronto
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
