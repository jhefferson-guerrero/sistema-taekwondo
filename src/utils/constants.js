export const DISCIPLINAS = ['Taekwondo', 'Muay Thai', 'Capoeira'];

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

export const GRADOS_CP = [
  'Cuerda Cruda', 'Cuerda Amarilla', 'Cuerda Naranja', 
  'Cuerda Azul', 'Cuerda Verde', 'Cuerda Morada', 
  'Cuerda Marrón', 'Cuerda Negra'
];

export const getGradosByDisciplina = (disciplina) => {
  if (disciplina === 'Muay Thai') return GRADOS_MT;
  if (disciplina === 'Capoeira') return GRADOS_CP;
  return GRADOS_TKD;
};

export const getDisciplinaColor = (disciplina) => {
  switch (disciplina) {
    case 'Muay Thai':
      return 'bg-red-500';
    case 'Capoeira':
      return 'bg-green-500';
    case 'Taekwondo':
    default:
      return 'bg-blue-500';
  }
};
