import DashboardLayout from '../components/DashboardLayout';

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        
        {/* Header Section */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">
              Vista General
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mt-4 text-slate-900 dark:text-white transition-colors duration-500">
            Bienvenido, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 dark:from-red-500 dark:to-red-700">Administrador</span>
          </h1>
          <p className="text-slate-500 dark:text-white/40 text-lg max-w-2xl mt-2 transition-colors duration-500">
            Panel principal del sistema TaekwondoFertex. Aquí podrás visualizar el resumen de tus alumnos, asistencias y próximos vencimientos de pagos.
          </p>
        </header>

        {/* Placeholder Cards (Double-Bezel approach) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          
          {[
            { title: 'Alumnos Activos', val: '142', trend: '+12 este mes' },
            { title: 'Pagos Pendientes', val: '18', trend: 'Revisar detalles' },
            { title: 'Próximos Ascensos', val: '5', trend: 'En 2 semanas' },
          ].map((stat, i) => (
            <div key={i} className="p-1.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl dark:shadow-2xl backdrop-blur-xl group hover:border-slate-300 dark:hover:border-white/20 transition-colors duration-700">
              <div className="p-6 bg-white dark:bg-black rounded-[calc(2rem-0.375rem)] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-4 h-full relative overflow-hidden transition-colors duration-500">
                <h3 className="text-slate-500 dark:text-white/50 text-sm font-medium tracking-wide uppercase">{stat.title}</h3>
                <div className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">{stat.val}</div>
                <div className="text-red-600 dark:text-red-500 text-sm font-medium mt-auto flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500" />
                  {stat.trend}
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </DashboardLayout>
  );
}
