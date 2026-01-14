import { useEffect, useState } from 'react';
import { ClipboardList, Users, CheckCircle, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KPICard } from './KPICard';
import { StatusMetricCard } from './StatusMetricCard';
import { PontoFilters } from './PontoFilters';
import { PontoTable } from './PontoTable';
import { JustifyAbsenceModal } from './JustifyAbsenceModal';
import { calculateDashboardStats, calculateStatusMetrics, filterPontos, determineStatus } from '@/services/businessRules';
import { Ponto, PontoFilter, User, Shift } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, isAfter, endOfDay } from 'date-fns';
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
    shiftId: 'todos',
  });
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);

  const parseLocalDate = (value: string | Date): Date => {
    if (value instanceof Date) return value;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const stats = calculateDashboardStats(pontos);
  const metrics = calculateStatusMetrics(pontos);
  const filteredPontos = filterPontos(
    pontos,
    filters.search,
    filters.status,
    filters.date,
    filters.shiftId
  );

  const handleJustifyAbsence = async (userId: string, date: Date, justification: string) => {
    try {
      const selectedUser = users.find(u => u.id === userId);
      if (!selectedUser) return;

      // Check if there is already a record for this user and date
      // We will look for an existing record in our state
      const existingPonto = pontos.find(p => 
        p.userId === userId && 
        isSameDay(new Date(p.date), date)
      );

      const dateStr = format(date, 'yyyy-MM-dd');

      if (existingPonto && !existingPonto.id.startsWith('synthetic')) {
        // Update existing record
        const { error } = await supabase
          .from('pontos')
          .update({
            observacoes: justification,
            // If it was 'faltou' (which might not be in DB, but if it WAS in DB), update it?
            // If the record exists, it usually has a status like 'aguardando' or 'trabalhando' or 'finalizado'.
            // If we are justifying, maybe we should set status to something? 
            // The prompt doesn't explicitly say to change status, but "Justificar Falta" implies handling a 'faltou'.
            // If the record exists and is 'faltou', we keep it 'faltou' but add observation?
            // Or if they forgot to clock in, we might be creating a record now.
          })
          .eq('id', existingPonto.id);

        if (error) throw error;
      } else {
        // Create new record (was synthetic or didn't exist)
        // We need a shift ID. Use the first one from user's shifts or null.
        const shiftId = selectedUser.shifts[0]?.id || null;

        const { error } = await supabase
          .from('pontos')
          .insert({
            user_id: userId,
            date: dateStr,
            status: 'faltou', // We mark it as 'faltou' with justification? Or maybe we need a 'justificado' status?
                              // For now, I'll use 'faltou' and rely on observation.
            observacoes: `Justificativa: ${justification}`,
            shift_id: shiftId
          });

        if (error) throw error;
      }

      toast.success(`Falta de ${selectedUser.name} justificada com sucesso!`);
      
      // Reload data
      setFilters(prev => ({ ...prev })); // Trigger effect
    } catch (error) {
      console.error('Error justifying absence:', error);
      toast.error('Erro ao justificar falta');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const targetDate = filters.date || new Date();
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');
      
      // 1. Fetch Profiles (Users)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const rolesMap = Object.fromEntries(((rolesData || []) as Database['public']['Tables']['user_roles']['Row'][]).map((r) => [r.user_id, r.role]));

      // 2. Fetch User Shifts
      const { data: shiftsData } = await supabase
        .from('user_shifts')
        .select('user_id, shifts(id, name, start_time, end_time)');

      // Create a map of user shifts
      const userShiftsMap: Record<string, Shift[]> = {};
      if (shiftsData) {
        shiftsData.forEach((item: any) => {
          if (item.shifts) {
            if (!userShiftsMap[item.user_id]) {
              userShiftsMap[item.user_id] = [];
            }
            
            // Avoid duplicate shifts for the same user
            const exists = userShiftsMap[item.user_id].some(s => s.id === item.shifts.id);
            if (!exists) {
              userShiftsMap[item.user_id].push({
                id: item.shifts.id,
                name: item.shifts.name,
                startTime: item.shifts.start_time,
                endTime: item.shifts.end_time
              });
            }
          }
        });
      }

      const usersMapped: User[] = ((allProfiles || []) as Database['public']['Tables']['profiles']['Row'][]).map((p) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        role: rolesMap[p.id] || 'user',
        shifts: userShiftsMap[p.id] || [],
        createdAt: new Date(p.created_at),
      }));

      setUsers(usersMapped);

      // 3. Fetch Pontos for the date
      const { data: pontosRaw, error: pontosError } = await supabase
        .from('pontos')
        .select('*')
        .eq('date', targetDateStr)
        .order('created_at', { ascending: false });

      if (pontosError) {
        console.error(pontosError);
        return;
      }

      // Deduplicar registros por usuário+turno na data (mantendo o mais recente)
      const dbPontosMap = new Map<string, Ponto>();
      ((pontosRaw || []) as Database['public']['Tables']['pontos']['Row'][]).forEach((p) => {
        const userForPonto = usersMapped.find(u => u.id === p.user_id);
        let effectiveShiftId = p.shift_id as string | null;

        // Se o registro é legado (shift_id nulo) e o usuário tem exatamente 1 turno,
        // associamos visualmente esse ponto a esse turno para que o filtro por turno funcione.
        if (!effectiveShiftId && userForPonto && userForPonto.shifts.length === 1) {
          effectiveShiftId = userForPonto.shifts[0].id;
        }

        const key = `${p.user_id}-${effectiveShiftId || 'noshift'}`;
        if (!dbPontosMap.has(key)) {
          dbPontosMap.set(key, {
            id: p.id,
            userId: p.user_id,
            userName: userForPonto?.name || '-',
            date: parseLocalDate(p.date as string),
            entrada: p.entrada ? String(p.entrada).slice(0, 5) : null,
            saida: p.saida ? String(p.saida).slice(0, 5) : null,
            status: p.status as any,
            observacoes: p.observacoes,
            shiftId: effectiveShiftId,
          });
        }
      });

      const dbPontos: Ponto[] = Array.from(dbPontosMap.values());

      // 4. Generate Synthetic Pontos and Update Statuses
      const finalPontos: Ponto[] = [];
      const isToday = isSameDay(targetDate, new Date());
      // For logic, if it's past date, treat "current time" as end of day.
      // If it's future, treat as start of day?
      const referenceTime = isToday ? new Date() : (isAfter(new Date(), targetDate) ? endOfDay(targetDate) : new Date(targetDate.setHours(0,0,0,0)));

      usersMapped.forEach(user => {
        const userDbPontos = dbPontos.filter(p => p.userId === user.id);

        if (userDbPontos.length > 0) {
          // Usuário já tem registro real neste dia.
          // Não criamos registros sintéticos para ele, apenas ajustamos status dinâmico.
          userDbPontos.forEach(p => {
            const shift = user.shifts.find(s => s.id === p.shiftId) || user.shifts[0] || null;
            const dynamicStatus = determineStatus(p.entrada, p.saida, shift, referenceTime);
            let displayStatus = p.status;

            if (p.status === 'trabalhando' && dynamicStatus === 'saida_nao_registrada') {
              displayStatus = 'saida_nao_registrada';
            }

            finalPontos.push({
              ...p,
              status: displayStatus
            });
          });
        } else {
          // Usuário não tem nenhum registro real neste dia.
          // Criamos registros sintéticos por turno ou um único sem turno.
          if (user.shifts.length > 0) {
            user.shifts.forEach(shift => {
              const dynamicStatus = determineStatus(null, null, shift, referenceTime);
              finalPontos.push({
                id: `synthetic-${user.id}-${shift.id}`,
                userId: user.id,
                userName: user.name,
                date: targetDate,
                entrada: null,
                saida: null,
                status: dynamicStatus,
                observacoes: null,
                shiftId: shift.id
              });
            });
          } else {
            finalPontos.push({
              id: `synthetic-${user.id}-noshift`,
              userId: user.id,
              userName: user.name,
              date: targetDate,
              entrada: null,
              saida: null,
              status: 'aguardando_entrada',
              observacoes: null,
              shiftId: null
            });
          }
        }
      });

      setPontos(finalPontos);
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
        <PontoFilters
          filters={filters}
          onFiltersChange={setFilters}
          shiftOptions={Array.from(
            users.reduce((map, user) => {
              user.shifts.forEach((shift) => {
                if (!map.has(shift.id)) {
                  map.set(shift.id, shift.name);
                }
              });
              return map;
            }, new Map<string, string>())
          ).map(([id, name]) => ({ id, name }))}
        />
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
