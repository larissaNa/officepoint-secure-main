import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PontoWithUser {
  id: string;
  user_id: string;
  date: string;
  entrada: string | null;
  saida: string | null;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const statusLabels: Record<string, string> = {
  aguardando_entrada: 'Aguardando Entrada',
  trabalhando: 'Trabalhando',
  aguardando_saida: 'Aguardando Saída',
  finalizado: 'Finalizado',
  faltou: 'Faltou',
  saida_nao_registrada: 'Saída não registrada',
};

const statusColors: Record<string, string> = {
  aguardando_entrada: 'bg-yellow-500',
  trabalhando: 'bg-green-500',
  aguardando_saida: 'bg-orange-500',
  finalizado: 'bg-blue-500',
  faltou: 'bg-red-500',
  saida_nao_registrada: 'bg-red-500',
};

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [pontos, setPontos] = useState<PontoWithUser[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    trabalhando: 0,
    finalizados: 0,
    aguardando: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: pontosRaw, error: pontosError } = await supabase
      .from('pontos')
      .select('*')
      .eq('date', today)
      .order('created_at', { ascending: false });

    if (pontosError) {
      console.error('Error fetching pontos:', pontosError);
      setIsLoading(false);
      return;
    }

    const userIds = Array.from(new Set((pontosRaw || []).map((p: any) => p.user_id).filter(Boolean)));
    let profilesMap: Record<string, { full_name: string; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        profilesMap = Object.fromEntries(
          (profilesData || []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }])
        );
      }
    }

    const pontosData = (pontosRaw || []).map((p: any) => ({
      ...p,
      profiles: profilesMap[p.user_id] || { full_name: '-', email: '' },
    })) as PontoWithUser[];
    setPontos(pontosData);

    // Calculate stats
    setStats({
      total: pontosData.length,
      trabalhando: pontosData.filter((p) => p.status === 'trabalhando').length,
      finalizados: pontosData.filter((p) => p.status === 'finalizado').length,
      aguardando: pontosData.filter((p) => p.status === 'aguardando_entrada').length,
    });

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Visão geral do ponto de hoje - {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trabalhando Agora</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.trabalhando}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.finalizados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.aguardando}</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Records */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {pontos.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Nenhum registro de ponto hoje
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pontos.map((ponto) => (
                  <TableRow key={ponto.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ponto.profiles.full_name}</p>
                        <p className="text-xs text-muted-foreground">{ponto.profiles.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{ponto.entrada || '-'}</TableCell>
                    <TableCell>{ponto.saida || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[ponto.status]}>
                        {statusLabels[ponto.status] || ponto.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
