import { useState } from 'react';
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Ponto } from '@/types';
import { formatDate, formatTime, calculateWorkedHours, getStatusLabel } from '@/services/businessRules';
import { pontos as mockPontos } from '@/services/mockData';
import { toast } from 'sonner';

interface UserDashboardProps {
  user: User;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const today = new Date();
  const [todayPonto, setTodayPonto] = useState<Ponto | null>(() => {
    const existing = mockPontos.find(
      p => p.userId === user.id && new Date(p.date).toDateString() === today.toDateString()
    );
    return existing || null;
  });

  const currentTime = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleEntrada = () => {
    const newPonto: Ponto = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      date: today,
      entrada: currentTime,
      saida: null,
      status: 'trabalhando',
      observacoes: null,
      shiftId: user.shifts[0]?.id || null,
    };
    setTodayPonto(newPonto);
    toast.success(`Entrada registrada às ${currentTime}`);
  };

  const handleSaida = () => {
    if (!todayPonto) return;
    
    const updatedPonto: Ponto = {
      ...todayPonto,
      saida: currentTime,
      status: 'finalizado',
    };
    setTodayPonto(updatedPonto);
    toast.success(`Saída registrada às ${currentTime}`);
  };

  const canRegisterEntrada = !todayPonto || !todayPonto.entrada;
  const canRegisterSaida = todayPonto && todayPonto.entrada && !todayPonto.saida;

  // Histórico recente
  const recentPontos = mockPontos
    .filter(p => p.userId === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Ponto</h1>
        <p className="mt-1 text-muted-foreground">
          {formatDate(today)} • {user.name}
        </p>
      </div>

      {/* Turnos do usuário */}
      {user.shifts.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Seus turnos: {user.shifts.map(s => `${s.startTime} - ${s.endTime}`).join(' | ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Card Principal */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-5xl font-bold tracking-tight">
            {today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </CardTitle>
          <CardDescription className="text-lg">
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status atual */}
          {todayPonto && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Status atual</p>
              <Badge 
                variant={
                  todayPonto.status === 'trabalhando' ? 'working' :
                  todayPonto.status === 'finalizado' ? 'finished' : 'waiting'
                }
                className="mt-2 text-base px-4 py-1"
              >
                {getStatusLabel(todayPonto.status)}
              </Badge>
              <div className="mt-4 flex justify-center gap-8 text-sm">
                <div>
                  <p className="text-muted-foreground">Entrada</p>
                  <p className="font-mono text-lg font-semibold">{formatTime(todayPonto.entrada)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Saída</p>
                  <p className="font-mono text-lg font-semibold">{formatTime(todayPonto.saida)}</p>
                </div>
                {todayPonto.saida && (
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-mono text-lg font-semibold text-primary">
                      {calculateWorkedHours(todayPonto.entrada, todayPonto.saida)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-4">
            <Button
              size="lg"
              className="flex-1 h-14 text-lg"
              onClick={handleEntrada}
              disabled={!canRegisterEntrada}
            >
              <LogIn className="mr-2 h-5 w-5" />
              Registrar Entrada
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 h-14 text-lg"
              onClick={handleSaida}
              disabled={!canRegisterSaida}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Registrar Saída
            </Button>
          </div>

          {todayPonto?.status === 'finalizado' && (
            <Alert className="bg-status-finished/10 border-status-finished/30">
              <CheckCircle className="h-4 w-4 text-status-finished" />
              <AlertDescription className="text-status-finished">
                Expediente concluído! Você trabalhou {calculateWorkedHours(todayPonto.entrada, todayPonto.saida)} hoje.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Histórico recente */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Histórico Recente</h2>
        <div className="space-y-3">
          {recentPontos.map((ponto) => (
            <Card key={ponto.id} className="overflow-hidden">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{formatDate(new Date(ponto.date))}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(ponto.entrada)} - {formatTime(ponto.saida)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-semibold">
                    {calculateWorkedHours(ponto.entrada, ponto.saida)}
                  </span>
                  <Badge 
                    variant={
                      ponto.status === 'trabalhando' ? 'working' :
                      ponto.status === 'finalizado' ? 'finished' :
                      ponto.status === 'faltou' ? 'absent' : 'waiting'
                    }
                  >
                    {getStatusLabel(ponto.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
