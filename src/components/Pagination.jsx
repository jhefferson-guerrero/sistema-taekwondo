import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems }) {
  if (totalItems === 0) return null;
  // Asegurar que totalPages sea al menos 1 para la visualización
  const displayTotalPages = Math.max(1, totalPages);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-b-[calc(2rem-0.375rem)]">
      <div className="flex items-center text-sm text-slate-500 dark:text-white/50 font-medium">
        Mostrando <span className="text-slate-900 dark:text-white mx-1 font-bold">{totalItems}</span> registros
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white disabled:dark:hover:bg-white/5 transition-all duration-300 active:scale-95 flex items-center justify-center"
          title="Página Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-sm font-semibold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-transparent">
          {currentPage} <span className="text-slate-400 dark:text-white/30 font-medium mx-1">de</span> {displayTotalPages}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === displayTotalPages}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white disabled:dark:hover:bg-white/5 transition-all duration-300 active:scale-95 flex items-center justify-center"
          title="Página Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
