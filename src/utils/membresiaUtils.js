// Diccionario de Feriados Nacionales de Perú (Formato 'MM-DD')
export const FERIADOS_PERU = [
  '01-01', // Año Nuevo
  '03-28', // Jueves Santo
  '03-29', // Viernes Santo
  '05-01', // Día del Trabajador
  '06-29', // San Pedro y San Pablo
  '07-23', // Día de la Fuerza Aérea
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-06', // Batalla de Junín
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Día de Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-25'  // Navidad
];

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Calcula las clases restantes basado en fechas, ignorando feriados y asistencias pasadas.
 * @param {string} fechaInicio - 'YYYY-MM-DD'
 * @param {string} fechaVencimiento - 'YYYY-MM-DD'
 * @param {Array<string>} diasHorario - ['Lunes', 'Miércoles']
 * @returns {number} cantidad de clases restantes
 */
export const calcularClasesRestantes = (fechaInicio, fechaVencimiento, diasHorario = []) => {
  if (!fechaInicio || !fechaVencimiento || !diasHorario || diasHorario.length === 0) return 0;

  const now = new Date();
  // Using T00:00:00 ensures we parse the date strictly in local timezone, not UTC.
  const startParam = new Date(`${fechaInicio}T00:00:00`); 
  const endParam = new Date(`${fechaVencimiento}T23:59:59`); 

  // Empezar a contar desde MAX(Hoy, fecha_inicio)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let currentDate = startParam > today ? startParam : today;
  
  // Si la membresía ya venció
  if (today > endParam) {
    return 0;
  }

  let count = 0;

  while (currentDate <= endParam) {
    const dayName = diasSemana[currentDate.getDay()];
    
    // Si es un día de clases
    if (diasHorario.includes(dayName)) {
      // Verificar feriados
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const dateKey = `${mm}-${dd}`;
      
      if (!FERIADOS_PERU.includes(dateKey)) {
        count++;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
};

/**
 * Calcula el total de clases en un rango de fechas estricto, ignorando feriados.
 */
export const calcularClasesEnRango = (fechaInicio, fechaFin, diasHorario = []) => {
  if (!fechaInicio || !fechaFin || !diasHorario || diasHorario.length === 0) return 0;

  const startParam = new Date(`${fechaInicio}T00:00:00`); 
  const endParam = new Date(`${fechaFin}T23:59:59`); 
  
  if (startParam > endParam) return 0;

  let currentDate = new Date(startParam);
  let count = 0;

  while (currentDate <= endParam) {
    const dayName = diasSemana[currentDate.getDay()];
    
    if (diasHorario.includes(dayName)) {
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const dateKey = `${mm}-${dd}`;
      
      if (!FERIADOS_PERU.includes(dateKey)) {
        count++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
};
