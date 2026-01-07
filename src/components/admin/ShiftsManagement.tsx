import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Clock, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export function ShiftsManagement() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time');

    if (error) {
      toast.error('Erro ao carregar turnos');
      return;
    }

    setShifts(data || []);
    setIsLoading(false);
  };

  const handleOpenDialog = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
      });
    } else {
      setEditingShift(null);
      setFormData({ name: '', start_time: '', end_time: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.start_time || !formData.end_time) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (editingShift) {
      const { error } = await supabase
        .from('shifts')
        .update({
          name: formData.name,
          start_time: formData.start_time,
          end_time: formData.end_time,
        })
        .eq('id', editingShift.id);

      if (error) {
        toast.error('Erro ao atualizar turno');
        return;
      }
      toast.success('Turno atualizado');
    } else {
      const { error } = await supabase
        .from('shifts')
        .insert({
          name: formData.name,
          start_time: formData.start_time,
          end_time: formData.end_time,
        });

      if (error) {
        toast.error('Erro ao criar turno');
        return;
      }
      toast.success('Turno criado');
    }

    setIsDialogOpen(false);
    fetchShifts();
  };

  const handleToggleActive = async (shift: Shift) => {
    const { error } = await supabase
      .from('shifts')
      .update({ is_active: !shift.is_active })
      .eq('id', shift.id);

    if (error) {
      toast.error('Erro ao alterar status');
      return;
    }

    toast.success(shift.is_active ? 'Turno desativado' : 'Turno ativado');
    fetchShifts();
  };

  const handleDelete = async (shiftId: string) => {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId);

    if (error) {
      if (error.code === '23503') {
        toast.error('Turno está em uso e não pode ser excluído');
      } else {
        toast.error('Erro ao excluir turno');
      }
      return;
    }

    toast.success('Turno excluído');
    fetchShifts();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Turnos</h1>
          <p className="mt-1 text-muted-foreground">
            {shifts.filter((s) => s.is_active).length} turnos ativos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Turno
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingShift ? 'Editar Turno' : 'Novo Turno'}
              </DialogTitle>
              <DialogDescription>
                {editingShift
                  ? 'Altere as informações do turno'
                  : 'Preencha os dados do novo turno'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do turno</Label>
                <Input
                  id="name"
                  placeholder="Ex: Manhã (07:30-12:00)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Hora início</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Hora fim</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingShift ? 'Salvar alterações' : 'Criar turno'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lista de Turnos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Horário Início</TableHead>
                <TableHead>Horário Fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.start_time}</TableCell>
                  <TableCell>{shift.end_time}</TableCell>
                  <TableCell>
                    <Badge variant={shift.is_active ? 'default' : 'secondary'}>
                      {shift.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={shift.is_active}
                        onCheckedChange={() => handleToggleActive(shift)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(shift)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(shift.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
