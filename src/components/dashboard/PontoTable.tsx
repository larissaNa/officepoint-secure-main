import { Ponto, PontoStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateWorkedHours, formatDate, formatTime, getStatusLabel } from '@/services/businessRules';

interface PontoTableProps {
  pontos: Ponto[];
}

function getStatusVariant(status: PontoStatus) {
  const variants: Record<PontoStatus, 'working' | 'finished' | 'absent' | 'waiting' | 'pendingExit'> = {
    aguardando_entrada: 'waiting',
    trabalhando: 'working',
    aguardando_saida: 'pendingExit',
    finalizado: 'finished',
    faltou: 'absent',
    saida_nao_registrada: 'pendingExit',
  };
  return variants[status];
}

export function PontoTable({ pontos }: PontoTableProps) {
  if (pontos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Nenhum ponto encontrado com os filtros atuais
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tente ajustar os filtros para ver mais resultados
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Funcionário</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Saída</TableHead>
            <TableHead>Horas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="max-w-[200px]">Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pontos.map((ponto, index) => (
            <TableRow key={ponto.id} className="animate-fade-in">
              <TableCell className="font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">{ponto.userName}</TableCell>
              <TableCell>{formatDate(ponto.date as Date)}</TableCell>
              <TableCell className="font-mono">{formatTime(ponto.entrada)}</TableCell>
              <TableCell className="font-mono">{formatTime(ponto.saida)}</TableCell>
              <TableCell className="font-mono font-medium">
                {calculateWorkedHours(ponto.entrada, ponto.saida)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(ponto.status)}>
                  {getStatusLabel(ponto.status)}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {ponto.observacoes || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
