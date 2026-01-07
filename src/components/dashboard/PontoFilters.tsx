import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PontoStatus, PontoFilter } from '@/types';

interface PontoFiltersProps {
  filters: PontoFilter;
  onFiltersChange: (filters: PontoFilter) => void;
}

const statusOptions: { value: PontoStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos os Status' },
  { value: 'aguardando_entrada', label: 'Aguardando Entrada' },
  { value: 'trabalhando', label: 'Trabalhando' },
  { value: 'aguardando_saida', label: 'Aguardando Saída' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'faltou', label: 'Faltou' },
  { value: 'saida_nao_registrada', label: 'Saída não registrada' },
];

export function PontoFilters({ filters, onFiltersChange }: PontoFiltersProps) {
  const clearFilters = () => {
    onFiltersChange({ search: '', status: 'todos', date: null });
  };

  const hasActiveFilters = filters.search || filters.status !== 'todos' || filters.date;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar funcionário..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value as PontoStatus | 'todos' })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[200px] justify-start text-left font-normal',
              !filters.date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.date ? format(filters.date, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.date || undefined}
            onSelect={(date) => onFiltersChange({ ...filters, date: date || null })}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <X className="mr-1 h-4 w-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
