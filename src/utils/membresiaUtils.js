// Feriados Nacionales de Perú con fecha fija (Formato 'MM-DD').
// Jueves y Viernes Santo cambian cada año: se calculan en getSemanaSanta().
export const FERIADOS_FIJOS_PERU = [
  '01-01', // Año Nuevo
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

const formatMMDD = (date) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const semanaSantaCache = new Map();

/**
 * Devuelve ['MM-DD', 'MM-DD'] con Jueves y Viernes Santo del año indicado.
 * Usa el algoritmo gregoriano anónimo para obtener el Domingo de Pascua.
 */
const getSemanaSanta = (year) => {
  if (semanaSantaCache.has(year)) return semanaSantaCache.get(year);

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const juevesSanto = formatMMDD(new Date(year, month - 1, day - 3));
  const viernesSanto = formatMMDD(new Date(year, month - 1, day - 2));

  const result = [juevesSanto, viernesSanto];
  semanaSantaCache.set(year, result);
  return result;
};

/**
 * Indica si una fecha (objeto Date local) es feriado nacional en Perú.
 */
export const esFeriado = (fecha) => {
  const key = formatMMDD(fecha);
  return FERIADOS_FIJOS_PERU.includes(key) || getSemanaSanta(fecha.getFullYear()).includes(key);
};

/**
 * Calcula las clases restantes basado en fechas, ignorando feriados y días congelados.
 * @param {string} fechaInicio - 'YYYY-MM-DD'
 * @param {string} fechaVencimiento - 'YYYY-MM-DD'
 * @param {Array<string>} diasHorario - ['Lunes', 'Miércoles']
 * @param {Array<string>} fechasCongeladas - Array de ISO strings de días congelados
 * @returns {number} cantidad de clases restantes
 */
export const calcularClasesRestantes = (fechaInicio, fechaVencimiento, diasHorario = [], fechasCongeladas = []) => {
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

  // Construir un Set de fechas congeladas en formato 'YYYY-MM-DD' para búsqueda O(1)
  const frozenDatesSet = new Set(
    fechasCongeladas.map(iso => {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })
  );

  let count = 0;

  while (currentDate <= endParam) {
    const dayName = diasSemana[currentDate.getDay()];
    
    // Si es un día de clases
    if (diasHorario.includes(dayName)) {
      const y = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const fullDateKey = `${y}-${mm}-${dd}`;

      // Ignorar feriados Y días congelados
      if (!esFeriado(currentDate) && !frozenDatesSet.has(fullDateKey)) {
        count++;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
};

/**
 * Calcula el total de clases en un rango de fechas estricto, ignorando feriados y días congelados.
 * @param {Array<string>} fechasCongeladas - Array de ISO strings de días congelados
 */
export const calcularClasesEnRango = (fechaInicio, fechaFin, diasHorario = [], fechasCongeladas = []) => {
  if (!fechaInicio || !fechaFin || !diasHorario || diasHorario.length === 0) return 0;

  const startParam = new Date(`${fechaInicio}T00:00:00`); 
  const endParam = new Date(`${fechaFin}T23:59:59`); 
  
  if (startParam > endParam) return 0;

  // Construir un Set de fechas congeladas en formato 'YYYY-MM-DD' para búsqueda O(1)
  const frozenDatesSet = new Set(
    fechasCongeladas.map(iso => {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })
  );

  let currentDate = new Date(startParam);
  let count = 0;

  while (currentDate <= endParam) {
    const dayName = diasSemana[currentDate.getDay()];
    
    if (diasHorario.includes(dayName)) {
      const y = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const fullDateKey = `${y}-${mm}-${dd}`;

      if (!esFeriado(currentDate) && !frozenDatesSet.has(fullDateKey)) {
        count++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
};
