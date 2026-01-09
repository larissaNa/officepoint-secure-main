import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Smartphone, Plus, Search, Trash2, Loader2, Shield, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { getDeviceFingerprint } from '@/utils/fingerprint';
import { ptBR } from 'date-fns/locale';

interface Device {
  id: string;
  fingerprint: string;
  name: string;
  approved_by: string | null;
  is_active: boolean;
  created_at: string;
  approver?: { full_name: string } | null;
}

export function DevicesManagement() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    fingerprint: '',
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setIsLoading(true);
    
    // Fetch devices
    const { data: devicesData, error } = await supabase
      .from('authorized_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar dispositivos');
      setIsLoading(false);
      return;
    }

    // Fetch approvers separately
    const approverIds = devicesData?.filter(d => d.approved_by).map(d => d.approved_by) || [];
    let approvers: Record<string, string> = {};
    
    if (approverIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', approverIds);
      
      if (profilesData) {
        profilesData.forEach(p => {
          approvers[p.id] = p.full_name;
        });
      }
    }

    const devicesWithApprovers: Device[] = (devicesData || []).map(d => ({
      ...d,
      approver: d.approved_by ? { full_name: approvers[d.approved_by] || 'Desconhecido' } : null
    }));

    setDevices(devicesWithApprovers);
    setIsLoading(false);
  };

  const handleAddDevice = async () => {
    if (!formData.name || !formData.fingerprint) {
      toast.error('Preencha todos os campos');
      return;
    }

    const { error } = await supabase.from('authorized_devices').insert({
      name: formData.name,
      fingerprint: formData.fingerprint,
      approved_by: user?.id,
      is_active: true,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Este fingerprint já está cadastrado');
      } else {
        toast.error('Erro ao adicionar dispositivo');
      }
      return;
    }

    toast.success('Dispositivo autorizado com sucesso');
    setIsDialogOpen(false);
    setFormData({ name: '', fingerprint: '' });
    fetchDevices();
  };

  const handleToggleActive = async (device: Device) => {
    const { error } = await supabase
      .from('authorized_devices')
      .update({ is_active: !device.is_active })
      .eq('id', device.id);

    if (error) {
      toast.error('Erro ao alterar status');
      return;
    }

    toast.success(device.is_active ? 'Dispositivo desativado' : 'Dispositivo ativado');
    fetchDevices();
  };

  const handleDelete = async (deviceId: string) => {
    const { error } = await supabase
      .from('authorized_devices')
      .delete()
      .eq('id', deviceId);

    if (error) {
      toast.error('Erro ao excluir dispositivo');
      return;
    }

    toast.success('Dispositivo removido');
    fetchDevices();
  };

  const handleCopyFingerprint = (fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint);
    toast.success('Fingerprint copiado');
  };

  const generateFingerprint = () => {
    let fp;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      fp = crypto.randomUUID();
    } else {
      fp = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    setFormData({ ...formData, fingerprint: fp });
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.fingerprint.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Dispositivos Autorizados</h1>
          <p className="mt-1 text-muted-foreground">
            {devices.filter((d) => d.is_active).length} dispositivos ativos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Dispositivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Autorizar Dispositivo</DialogTitle>
              <DialogDescription>
                Adicione um novo dispositivo autorizado para registrar ponto
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Nome do dispositivo</Label>
                <Input
                  id="device-name"
                  placeholder="Ex: Computador Recepção"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fingerprint">Fingerprint</Label>
                <div className="flex gap-2">
                  <Input
                    id="fingerprint"
                    placeholder="Identificador único do dispositivo"
                    value={formData.fingerprint}
                    onChange={(e) => setFormData({ ...formData, fingerprint: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateFingerprint}
                  >
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O fingerprint identifica unicamente este dispositivo
                </p>
              </div>
              <Button onClick={handleAddDevice} className="w-full">
                Autorizar Dispositivo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Device Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Este Dispositivo
          </CardTitle>
          <CardDescription>
            Informações do dispositivo atual para autorização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-background p-3">
            <code className="text-sm">
              {getDeviceFingerprint()}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                handleCopyFingerprint(getDeviceFingerprint())
              }
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou fingerprint..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Lista de Dispositivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Fingerprint</TableHead>
                <TableHead>Aprovado por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {device.fingerprint.substring(0, 16)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    {device.approver?.full_name || 'Sistema'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(device.created_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={device.is_active ? 'default' : 'secondary'}>
                      {device.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={device.is_active}
                        onCheckedChange={() => handleToggleActive(device)}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover dispositivo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O dispositivo não poderá mais
                              registrar pontos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(device.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
