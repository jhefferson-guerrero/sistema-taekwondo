export const DISCIPLINAS = ['Taekwondo', 'Muay Thai'];

export const GRADOS_TKD = [
  'Blanco', 'Punta Amarilla', 'Amarillo', 'Punta Verde', 
  'Verde', 'Punta Azul', 'Azul', 'Punta Roja', 
  'Rojo', 'Punta Negra', 'Negro'
];

export const GRADOS_MT = [
  'Khan 1 (Blanco)', 'Khan 2 (Amarillo)', 'Khan 3 (Amarillo-Blanco)',
  'Khan 4 (Verde)', 'Khan 5 (Verde-Blanco)', 'Khan 6 (Azul)',
  'Khan 7 (Azul-Blanco)', 'Khan 8 (Marrón)', 'Khan 9 (Marrón-Blanco)',
  'Khan 10 (Rojo)'
];

export const getGradosByDisciplina = (disciplina) => {
  if (disciplina === 'Muay Thai') return GRADOS_MT;
  return GRADOS_TKD;
};
