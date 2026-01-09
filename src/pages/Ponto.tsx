import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, LogIn, LogOut, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDeviceFingerprint } from '@/utils/fingerprint';

interface Ponto {
  id: string;
  date: string;
  entrada: string | null;
  saida: string | null;
  status: string;
}

interface UserShift {
  id: string;
  shifts: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
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

export default function Ponto() {
  const { user, profile } = useAuth();
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [userShifts, setUserShifts] = useState<UserShift[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    const [pontoRes, shiftsRes] = await Promise.all([
      supabase
        .from('pontos')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('user_shifts')
        .select('id, shifts(*)')
        .eq('user_id', user.id),
    ]);

    if (pontoRes.data) setPonto(pontoRes.data);
    if (shiftsRes.data) setUserShifts(shiftsRes.data as unknown as UserShift[]);
    
    setIsLoading(false);
  };

  const handleRegistrarEntrada = async () => {
    if (!user) return;
    
    setIsSubmitting(true);

    // Verify device authorization
    const fingerprint = getDeviceFingerprint();
    const { data: deviceData } = await supabase
      .from('authorized_devices')
      .select('is_active')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    if (!deviceData || !deviceData.is_active) {
      toast.error('Dispositivo não autorizado para registrar ponto');
      setIsSubmitting(false);
      return;
    }

    const now = format(new Date(), 'HH:mm:ss');
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('pontos')
      .insert({
        user_id: user.id,
        date: today,
        entrada: now,
        status: 'trabalhando',
      })
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('Entrada já registrada hoje');
      } else {
        toast.error('Erro ao registrar entrada');
      }
      return;
    }

    setPonto(data);
    toast.success('Entrada registrada com sucesso!');
  };

  const handleRegistrarSaida = async () => {
    if (!user || !ponto) return;
    
    setIsSubmitting(true);

    // Verify device authorization again before registering
    const fingerprint = getDeviceFingerprint();
    const { data: deviceData } = await supabase
      .from('authorized_devices')
      .select('is_active')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    if (!deviceData || !deviceData.is_active) {
      toast.error('Dispositivo não autorizado');
      setIsSubmitting(false);
      return;
    }

    const now = format(new Date(), 'HH:mm:ss');

    const { data, error } = await supabase
      .from('pontos')
      .update({
        saida: now,
        status: 'finalizado',
      })
      .eq('id', ponto.id)
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error('Erro ao registrar saída');
      return;
    }

    setPonto(data);
    toast.success('Saída registrada com sucesso!');
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
        <h1 className="text-3xl font-bold">Meu Ponto</h1>
        <p className="mt-1 text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Current Time */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="text-6xl font-bold tabular-nums tracking-tight text-primary">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <p className="mt-2 text-muted-foreground">Horário atual</p>
        </CardContent>
      </Card>

      {/* User Shifts */}
      {userShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Meus Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {userShifts.map((us) => (
                <Badge key={us.id} variant="secondary" className="text-sm">
                  {us.shifts.name} ({us.shifts.start_time} - {us.shifts.end_time})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ponto Status */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Hoje</CardTitle>
          <CardDescription>
            {ponto
              ? `Status: ${statusLabels[ponto.status] || ponto.status}`
              : 'Nenhum registro ainda'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entrada/Saída Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LogIn className="h-4 w-4" />
                <span className="text-sm">Entrada</span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {ponto?.entrada || '--:--'}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Saída</span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {ponto?.saida || '--:--'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {!ponto && (
            <Button
              size="lg"
              className="w-full"
              onClick={handleRegistrarEntrada}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Registrar Entrada
            </Button>
          )}

          {ponto && ponto.status === 'trabalhando' && (
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={handleRegistrarSaida}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Registrar Saída
            </Button>
          )}

          {ponto && ponto.status === 'finalizado' && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-4 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Jornada finalizada</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
