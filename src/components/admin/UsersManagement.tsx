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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Search, UserPlus, Shield, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'user';
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface UserShift {
  id: string;
  user_id: string;
  shift_id: string;
  shifts: Shift;
}

export function UsersManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, 'admin' | 'user'>>({});
  const [userShifts, setUserShifts] = useState<Record<string, UserShift[]>>({});
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch all in parallel
    const [profilesRes, rolesRes, shiftsRes, userShiftsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('shifts').select('*').eq('is_active', true).order('start_time'),
      supabase.from('user_shifts').select('*, shifts(*)'),
    ]);

    if (profilesRes.data) setUsers(profilesRes.data);
    
    if (rolesRes.data) {
      const roles: Record<string, 'admin' | 'user'> = {};
      rolesRes.data.forEach((r) => {
        roles[r.user_id] = r.role as 'admin' | 'user';
      });
      setUserRoles(roles);
    }
    
    if (shiftsRes.data) setShifts(shiftsRes.data);
    
    if (userShiftsRes.data) {
      const grouped: Record<string, UserShift[]> = {};
      userShiftsRes.data.forEach((us) => {
        if (!grouped[us.user_id]) grouped[us.user_id] = [];
        grouped[us.user_id].push(us as UserShift);
      });
      setUserShifts(grouped);
    }

    setIsLoading(false);
  };

  const handleToggleAdmin = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast.error('Erro ao alterar permissão');
      return;
    }

    setUserRoles((prev) => ({ ...prev, [userId]: newRole }));
    toast.success(`Usuário agora é ${newRole === 'admin' ? 'administrador' : 'usuário comum'}`);
  };

  const handleAddShift = async () => {
    if (!selectedUser || !selectedShiftId) return;

    const { error } = await supabase
      .from('user_shifts')
      .insert({ user_id: selectedUser.id, shift_id: selectedShiftId });

    if (error) {
      if (error.code === '23505') {
        toast.error('Turno já atribuído a este usuário');
      } else {
        toast.error('Erro ao adicionar turno');
      }
      return;
    }

    toast.success('Turno adicionado com sucesso');
    setIsShiftDialogOpen(false);
    setSelectedShiftId('');
    fetchData();
  };

  const handleRemoveShift = async (userShiftId: string) => {
    const { error } = await supabase
      .from('user_shifts')
      .delete()
      .eq('id', userShiftId);

    if (error) {
      toast.error('Erro ao remover turno');
      return;
    }

    toast.success('Turno removido');
    fetchData();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="mt-1 text-muted-foreground">
            {users.length} usuários cadastrados
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Turnos</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {userShifts[user.id]?.map((us) => (
                        <Badge
                          key={us.id}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRemoveShift(us.id)}
                        >
                          {us.shifts.name}
                          <span className="ml-1 text-xs">×</span>
                        </Badge>
                      )) || <span className="text-muted-foreground">Nenhum</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={userRoles[user.id] === 'admin' ? 'default' : 'outline'}>
                      {userRoles[user.id] === 'admin' ? (
                        <><Shield className="mr-1 h-3 w-3" /> Admin</>
                      ) : (
                        'Usuário'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog
                        open={isShiftDialogOpen && selectedUser?.id === user.id}
                        onOpenChange={(open) => {
                          setIsShiftDialogOpen(open);
                          if (open) setSelectedUser(user);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Clock className="mr-1 h-3 w-3" />
                            Turno
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Turno</DialogTitle>
                            <DialogDescription>
                              Selecione um turno para {user.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Turno</Label>
                              <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um turno" />
                                </SelectTrigger>
                                <SelectContent>
                                  {shifts.map((shift) => (
                                    <SelectItem key={shift.id} value={shift.id}>
                                      {shift.name} ({shift.start_time} - {shift.end_time})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleAddShift} className="w-full">
                              Adicionar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Admin</span>
                        <Switch
                          checked={userRoles[user.id] === 'admin'}
                          onCheckedChange={() => handleToggleAdmin(user.id, userRoles[user.id] || 'user')}
                        />
                      </div>
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
