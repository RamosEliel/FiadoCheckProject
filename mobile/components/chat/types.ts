export type TipoMensaje = 'bot' | 'usuario' | 'sugerencias';

export type Mensaje = {
  id: string;
  tipo: TipoMensaje;
  texto?: string;
  opciones?: string[];
  createdAt?: number;
  esError?: boolean;
};

export type ActionBanner = {
  visible: boolean;
  accion: string;
  mensaje: string;
} | null;
