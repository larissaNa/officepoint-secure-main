export type UserRole = 'admin' | 'user';

export type PontoStatus = 
  | 'aguardando_entrada'
  | 'trabalhando'
  | 'aguardando_saida'
  | 'finalizado'
  | 'faltou'
  | 'saida_nao_registrada';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  shifts: Shift[];
  createdAt: Date;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface Ponto {
  id: string;
  userId: string;
  userName: string;
  date: Date;
  entrada: string | null; // HH:mm
  saida: string | null; // HH:mm
  status: PontoStatus;
  observacoes: string | null;
  shiftId: string | null;
}

export interface AuthorizedDevice {
  id: string;
  fingerprint: string;
  name: string;
  approvedBy: string;
  approvedAt: Date;
  isActive: boolean;
}

export interface DashboardStats {
  totalRegistros: number;
  trabalhandoAgora: number;
  finalizadosHoje: number;
  aguardandoEntrada: number;
}

export interface StatusMetrics {
  aguardando: { count: number; percentage: number };
  trabalhando: { count: number; percentage: number };
  saindo: { count: number; percentage: number };
  finalizado: { count: number; percentage: number };
  faltou: { count: number; percentage: number };
}

export interface PontoFilter {
  search: string;
  status: PontoStatus | 'todos';
  date: Date | null;
  shiftId?: string | 'todos';
}
