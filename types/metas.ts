// Tipos para la arquitectura multi-meta

export interface Accion {
  id?: number;
  texto: string;
  diasProgramados: string[]; // ["lunes", "martes", etc.]
  completada: boolean;
  enRevision: boolean;
  requiereEvidencia: boolean;
  lastCompletedDate?: Date | null;
}

export interface MetaCompleta {
  id?: number;
  orden: number;
  declaracionPoder: string; // "Yo soy abundancia infinita..."
  metaPrincipal: string;    // "Juntar 10k pesos"
  avance: number;           // Porcentaje 0-100
  acciones: Accion[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MetasPorCategoria {
  [categoria: string]: MetaCompleta[];
}

export interface CartaMetasResponse {
  cartaId: number;
  metas: MetasPorCategoria;
}
