import { useEffect, useState } from 'react';
import { ClipboardList, Users, CheckCircle, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KPICard } from './KPICard';
import { StatusMetricCard } from './StatusMetricCard';
import { PontoFilters } from './PontoFilters';
import { PontoTable } from './PontoTable';
import { JustifyAbsenceModal } from './JustifyAbsenceModal';
import { calculateDashboardStats, calculateStatusMetrics, filterPontos } from '@/services/businessRules';
import { Ponto, PontoFilter, User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<PontoFilter>({
    search: '',
    status: 'todos',
    date: null,
  });
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);

  const stats = calculateDashboardStats(pontos);
  const metrics = calculateStatusMetrics(pontos);
  const filteredPontos = filterPontos(pontos, filters.search, filters.status, filters.date);

  const handleJustifyAbsence = (userId: string, date: Date, justification: string) => {
    const selectedUser = users.find(u => u.id === userId);
    toast.success(`Falta de ${selectedUser?.name} justificada com sucesso!`);
  };

  useEffect(() => {
    const loadData = async () => {
      const targetDate = format(filters.date ?? new Date(), 'yyyy-MM-dd');
      const { data: pontosRaw, error: pontosError } = await supabase
        .from('pontos')
        .select('*')
        .eq('date', targetDate)
        .order('created_at', { ascending: false });

      if (!pontosError) {
        const userIds = Array.from(new Set(((pontosRaw || []) as Database['public']['Tables']['pontos']['Row'][]).map((p) => p.user_id).filter(Boolean)));

        let profilesMap: Record<string, { full_name: string; email: string; created_at: string }> = {};
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email, created_at')
            .in('id', userIds);

          profilesMap = Object.fromEntries(
            ((profilesData || []) as Database['public']['Tables']['profiles']['Row'][]).map((p) => [
              p.id,
              { full_name: p.full_name, email: p.email, created_at: p.created_at },
            ])
          );
        }

        const pontosMapped: Ponto[] = ((pontosRaw || []) as Database['public']['Tables']['pontos']['Row'][]).map((p) => ({
          id: p.id,
          userId: p.user_id,
          userName: profilesMap[p.user_id]?.full_name || '-',
          date: new Date(p.date),
          entrada: p.entrada ? String(p.entrada).slice(0, 5) : null,
          saida: p.saida ? String(p.saida).slice(0, 5) : null,
          status: p.status,
          observacoes: p.observacoes,
          shiftId: p.shift_id,
        }));

        setPontos(pontosMapped);
      }

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const rolesMap = Object.fromEntries(((rolesData || []) as Database['public']['Tables']['user_roles']['Row'][]).map((r) => [r.user_id, r.role]));

      const usersMapped: User[] = ((allProfiles || []) as Database['public']['Tables']['profiles']['Row'][]).map((p) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        role: rolesMap[p.id] || 'user',
        shifts: [],
        createdAt: new Date(p.created_at),
      }));

      setUsers(usersMapped);
    };

    loadData();
  }, [filters.date]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Visão geral do controle de ponto • Olá, {user.name}!
          </p>
        </div>
        <Button onClick={() => setIsJustifyModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Justificar Falta
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Registros"
          value={stats.totalRegistros}
          icon={ClipboardList}
          variant="total"
        />
        <KPICard
          title="Trabalhando Agora"
          value={stats.trabalhandoAgora}
          icon={Users}
          variant="working"
        />
        <KPICard
          title="Finalizados Hoje"
          value={stats.finalizadosHoje}
          icon={CheckCircle}
          variant="finished"
        />
        <KPICard
          title="Aguardando Entrada"
          value={stats.aguardandoEntrada}
          icon={Clock}
          variant="waiting"
        />
      </div>

      {/* Status Metrics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Métricas por Status</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatusMetricCard
            title="Aguardando"
            count={metrics.aguardando.count}
            percentage={metrics.aguardando.percentage}
            variant="waiting"
          />
          <StatusMetricCard
            title="Trabalhando"
            count={metrics.trabalhando.count}
            percentage={metrics.trabalhando.percentage}
            variant="working"
          />
          <StatusMetricCard
            title="Saindo"
            count={metrics.saindo.count}
            percentage={metrics.saindo.percentage}
            variant="exiting"
          />
          <StatusMetricCard
            title="Finalizado"
            count={metrics.finalizado.count}
            percentage={metrics.finalizado.percentage}
            variant="finished"
          />
          <StatusMetricCard
            title="Faltou"
            count={metrics.faltou.count}
            percentage={metrics.faltou.percentage}
            variant="absent"
          />
        </div>
      </div>

      {/* Filters */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Registros de Ponto</h2>
        <PontoFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Table */}
      <PontoTable pontos={filteredPontos} />

      {/* Justify Modal */}
      <JustifyAbsenceModal
        open={isJustifyModalOpen}
        onOpenChange={setIsJustifyModalOpen}
        users={users}
        onSubmit={handleJustifyAbsence}
      />
    </div>
  );
}
