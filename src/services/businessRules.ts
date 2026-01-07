import { Ponto, PontoStatus, Shift, DashboardStats, StatusMetrics } from '@/types';

// RN01 - Cálculo de horas trabalhadas
export function calculateWorkedHours(entrada: string | null, saida: string | null): string {
  if (!entrada || !saida) return '--:--';
  
  const [entradaH, entradaM] = entrada.split(':').map(Number);
  const [saidaH, saidaM] = saida.split(':').map(Number);
  
  const entradaMinutes = entradaH * 60 + entradaM;
  const saidaMinutes = saidaH * 60 + saidaM;
  
  const diffMinutes = saidaMinutes - entradaMinutes;
  
  if (diffMinutes < 0) return '--:--';
  
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// RN02 - Determinar status baseado no turno
export function determineStatus(
  entrada: string | null,
  saida: string | null,
  shift: Shift | null,
  currentTime: Date
): PontoStatus {
  const now = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
  
  if (!entrada) {
    if (shift && now > shift.endTime) {
      return 'faltou';
    }
    return 'aguardando_entrada';
  }
  
  if (entrada && !saida) {
    if (shift && now > shift.endTime) {
      return 'saida_nao_registrada';
    }
    return 'trabalhando';
  }
  
  if (entrada && saida) {
    return 'finalizado';
  }
  
  return 'aguardando_entrada';
}

// RN03 - Verificar saída não registrada
export function checkMissedCheckout(ponto: Ponto, shift: Shift | null): boolean {
  if (!shift) return false;
  if (!ponto.entrada || ponto.saida) return false;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  return currentTime > shift.endTime;
}

// RN05 - Formatação de data
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// RN05 - Formatação de hora
export function formatTime(time: string | null): string {
  if (!time) return '--:--';
  return time;
}

// Calcular estatísticas do dashboard
export function calculateDashboardStats(pontos: Ponto[]): DashboardStats {
  const today = new Date().toDateString();
  const todayPontos = pontos.filter(p => new Date(p.date).toDateString() === today);
  
  return {
    totalRegistros: pontos.length,
    trabalhandoAgora: todayPontos.filter(p => p.status === 'trabalhando').length,
    finalizadosHoje: todayPontos.filter(p => p.status === 'finalizado').length,
    aguardandoEntrada: todayPontos.filter(p => p.status === 'aguardando_entrada').length,
  };
}

// Calcular métricas por status
export function calculateStatusMetrics(pontos: Ponto[]): StatusMetrics {
  const total = pontos.length || 1;
  
  const aguardando = pontos.filter(p => p.status === 'aguardando_entrada').length;
  const trabalhando = pontos.filter(p => p.status === 'trabalhando').length;
  const saindo = pontos.filter(p => p.status === 'aguardando_saida' || p.status === 'saida_nao_registrada').length;
  const finalizado = pontos.filter(p => p.status === 'finalizado').length;
  const faltou = pontos.filter(p => p.status === 'faltou').length;
  
  return {
    aguardando: { count: aguardando, percentage: Math.round((aguardando / total) * 100) },
    trabalhando: { count: trabalhando, percentage: Math.round((trabalhando / total) * 100) },
    saindo: { count: saindo, percentage: Math.round((saindo / total) * 100) },
    finalizado: { count: finalizado, percentage: Math.round((finalizado / total) * 100) },
    faltou: { count: faltou, percentage: Math.round((faltou / total) * 100) },
  };
}

// Obter label do status
export function getStatusLabel(status: PontoStatus): string {
  const labels: Record<PontoStatus, string> = {
    aguardando_entrada: 'Aguardando Entrada',
    trabalhando: 'Trabalhando',
    aguardando_saida: 'Aguardando Saída',
    finalizado: 'Finalizado',
    faltou: 'Faltou',
    saida_nao_registrada: 'Saída não registrada',
  };
  return labels[status];
}

// Filtrar pontos
export function filterPontos(
  pontos: Ponto[],
  search: string,
  status: PontoStatus | 'todos',
  date: Date | null
): Ponto[] {
  return pontos.filter(ponto => {
    const matchesSearch = search === '' || 
      ponto.userName.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = status === 'todos' || ponto.status === status;
    
    const matchesDate = !date || 
      new Date(ponto.date).toDateString() === date.toDateString();
    
    return matchesSearch && matchesStatus && matchesDate;
  });
}
