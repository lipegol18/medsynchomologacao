import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, ShieldCheck, X } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableHeader, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Role as RoleType, RolePermission as RolePermissionType } from '@shared/schema';
import { format } from 'date-fns';
import { TranslatedText } from '@/components/ui/translated-text';

export default function RolesPage() {
  const { toast } = useToast();
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPermissionsSheetOpen, setIsPermissionsSheetOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  
  // Form states
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    isDefault: false,
  });
  
  const [editRole, setEditRole] = useState({
    name: '',
    description: '',
    isDefault: false,
  });
  
  // Fetch roles
  const { data: roles, isLoading } = useQuery<RoleType[]>({
    queryKey: ['/api/roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles');
      if (!res.ok) {
        throw new Error('Falha ao buscar papéis');
      }
      return res.json();
    },
  });
  
  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async (roleData: typeof newRole) => {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao criar função');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsAddRoleDialogOpen(false);
      setNewRole({
        name: '',
        description: '',
        isDefault: false,
      });
      toast({
        title: 'Função criada',
        description: 'A função foi criada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Edit role mutation
  const editRoleMutation = useMutation({
    mutationFn: async (roleData: typeof editRole & { id: number }) => {
      const { id, ...data } = roleData;
      const res = await fetch(`/api/roles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao atualizar função');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsEditRoleDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: 'Função atualizada',
        description: 'As informações da função foram atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao excluir função');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsDeleteConfirmOpen(false);
      setSelectedRole(null);
      toast({
        title: 'Função excluída',
        description: 'A função foi excluída com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handlers
  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, forneça um nome para o papel.',
        variant: 'destructive',
      });
      return;
    }
    
    addRoleMutation.mutate(newRole);
  };
  
  const handleEditRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !editRole.name) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, forneça um nome para o papel.',
        variant: 'destructive',
      });
      return;
    }
    
    editRoleMutation.mutate({
      ...editRole,
      id: selectedRole.id,
    });
  };
  
  const handleOpenEditDialog = (role: RoleType) => {
    setSelectedRole(role);
    setEditRole({
      name: role.name,
      description: role.description || '',
      isDefault: role.isDefault || false,
    });
    setIsEditRoleDialogOpen(true);
  };
  
  const handleOpenDeleteConfirm = (role: RoleType) => {
    setSelectedRole(role);
    setIsDeleteConfirmOpen(true);
  };
  
  // Função para obter todas as permissões disponíveis
  const fetchAllPermissions = async () => {
    try {
      const res = await fetch('/api/permissions');
      if (!res.ok) {
        throw new Error('Falha ao buscar permissões disponíveis');
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao buscar permissões disponíveis',
        variant: 'destructive',
      });
      return [];
    }
  };

  // Função para obter as permissões do perfil selecionado
  const fetchRolePermissions = async (roleId: number) => {
    try {
      // Tentar primeiro a rota pública que não requer permissões específicas
      const res = await fetch(`/api/public/roles/${roleId}/permissions`);
      if (!res.ok) {
        throw new Error('Falha ao buscar permissões do perfil');
      }
      const data = await res.json();
      return data.map((p: RolePermissionType) => p.permission);
    } catch (error) {
      console.error('Erro ao buscar permissões do perfil:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao buscar permissões do perfil',
        variant: 'destructive',
      });
      return [];
    }
  };

  const handleOpenPermissionsSheet = async (role: RoleType) => {
    setSelectedRole(role);
    setLoadingPermissions(true);
    setIsPermissionsSheetOpen(true);
    
    try {
      // Obter todas as permissões disponíveis
      const permissions = await fetchAllPermissions();
      setAllPermissions(permissions);
      
      // Obter as permissões do perfil selecionado
      const rolePermissions = await fetchRolePermissions(role.id);
      setSelectedRolePermissions(rolePermissions);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };
  
  const formatDate = (date: string | Date) => {
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return 'Data inválida';
    }
  };
  
  // Função para salvar as permissões selecionadas
  const handleSavePermissions = () => {
    if (!selectedRole) return;
    
    // Enviamos as permissões selecionadas para o servidor
    const savePermissions = async () => {
      try {
        setLoadingPermissions(true);
        
        // Limpar permissões existentes e adicionar as novas
        const existingPermissions = await fetchRolePermissions(selectedRole.id);
        
        // Permissões a serem removidas
        for (const permission of existingPermissions) {
          if (!selectedRolePermissions.includes(permission)) {
            await fetch(`/api/roles/${selectedRole.id}/permissions/${permission}`, {
              method: 'DELETE',
            });
          }
        }
        
        // Permissões a serem adicionadas
        for (const permission of selectedRolePermissions) {
          if (!existingPermissions.includes(permission)) {
            await fetch(`/api/roles/${selectedRole.id}/permissions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ permission }),
            });
          }
        }
        
        toast({
          title: 'Permissões atualizadas',
          description: 'As permissões da função foram atualizadas com sucesso.',
        });
        
        setIsPermissionsSheetOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      } catch (error) {
        console.error('Erro ao atualizar permissões:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao atualizar permissões. Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setLoadingPermissions(false);
      }
    };
    
    savePermissions();
  };
  
  // Render
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a2332]">
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold mb-6 text-white">
            <TranslatedText id="roles.title">Gerenciamento de Funções</TranslatedText>
          </h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#1a2332]">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            <TranslatedText id="roles.title">Gerenciamento de Funções</TranslatedText>
          </h1>
          <Button 
            onClick={() => setIsAddRoleDialogOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            <TranslatedText id="roles.addRole">Adicionar Função</TranslatedText>
          </Button>
        </div>
      
        <div className="bg-[#1a2332] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">
                    <TranslatedText id="roles.id">ID</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">
                    <TranslatedText id="roles.name">Nome</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">
                    <TranslatedText id="roles.description">Descrição</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">
                    <TranslatedText id="roles.default">Padrão</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">
                    <TranslatedText id="roles.createdAt">Criado em</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">
                    <TranslatedText id="roles.actions">Ações</TranslatedText>
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles && roles.map((role) => (
                  <tr key={role.id} className="border-b border-blue-800/40 hover:bg-blue-900/20">
                    <td className="py-3 px-4 text-white">{role.id}</td>
                    <td className="py-3 px-4 text-white">{role.name}</td>
                    <td className="py-3 px-4 text-white">{role.description || '-'}</td>
                    <td className="py-3 px-4">
                      {role.isDefault ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/60 text-blue-200 border border-blue-700">
                          <TranslatedText id="roles.isDefault">Sim</TranslatedText>
                        </span>
                      ) : <span className="text-blue-300/50">-</span>}
                    </td>
                    <td className="py-3 px-4 text-white">{formatDate(role.createdAt)}</td>
                    <td className="py-3 px-4 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenEditDialog(role)}
                        title="Editar"
                        className="border-blue-700 bg-blue-900/30 text-blue-200 hover:bg-blue-800/50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenPermissionsSheet(role)}
                        title="Permissões"
                        className="border-blue-700 bg-blue-900/30 text-blue-200 hover:bg-blue-800/50"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenDeleteConfirm(role)}
                        title="Excluir"
                        className="border-red-700 bg-red-900/20 text-red-300 hover:bg-red-800/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                
                {(!roles || roles.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-blue-300">
                      <TranslatedText id="roles.noRoles">Nenhuma função encontrada</TranslatedText>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      
        {/* Add Role Dialog */}
        <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            
            <DialogHeader>
              <DialogTitle>
                <TranslatedText id="roles.addRole">Adicionar Função</TranslatedText>
              </DialogTitle>
              <DialogDescription>
                <TranslatedText id="roles.addRoleDescription">
                  Crie uma nova função no sistema para agrupar permissões.
                </TranslatedText>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddRole} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  <TranslatedText id="roles.name">Nome</TranslatedText> *
                </Label>
                <Input
                  id="name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">
                  <TranslatedText id="roles.description">Descrição</TranslatedText>
                </Label>
                <Input
                  id="description"
                  value={newRole.description}
                  onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={newRole.isDefault}
                  onCheckedChange={(checked) => 
                    setNewRole({...newRole, isDefault: checked === true})
                  }
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  <TranslatedText id="roles.setDefault">Definir como função padrão</TranslatedText>
                </Label>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddRoleDialogOpen(false)}
                >
                  <TranslatedText id="common.cancel">Cancelar</TranslatedText>
                </Button>
                <Button 
                  type="submit" 
                  disabled={addRoleMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {addRoleMutation.isPending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <TranslatedText id="common.save">Salvar</TranslatedText>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Role Dialog */}
        <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            
            <DialogHeader>
              <DialogTitle>
                <TranslatedText id="roles.editRole">Editar Função</TranslatedText>
              </DialogTitle>
              <DialogDescription>
                <TranslatedText id="roles.editRoleDescription">
                  Atualize as informações da função selecionada.
                </TranslatedText>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleEditRole} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  <TranslatedText id="roles.name">Nome</TranslatedText> *
                </Label>
                <Input
                  id="edit-name"
                  value={editRole.name}
                  onChange={(e) => setEditRole({...editRole, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  <TranslatedText id="roles.description">Descrição</TranslatedText>
                </Label>
                <Input
                  id="edit-description"
                  value={editRole.description}
                  onChange={(e) => setEditRole({...editRole, description: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isDefault"
                  checked={editRole.isDefault}
                  onCheckedChange={(checked) => 
                    setEditRole({...editRole, isDefault: checked === true})
                  }
                />
                <Label htmlFor="edit-isDefault" className="cursor-pointer">
                  <TranslatedText id="roles.setDefault">Definir como função padrão</TranslatedText>
                </Label>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditRoleDialogOpen(false)}
                >
                  <TranslatedText id="common.cancel">Cancelar</TranslatedText>
                </Button>
                <Button 
                  type="submit" 
                  disabled={editRoleMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {editRoleMutation.isPending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <TranslatedText id="common.save">Salvar</TranslatedText>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-500">
                <TranslatedText id="roles.confirmDelete">Confirmar Exclusão</TranslatedText>
              </DialogTitle>
              <DialogDescription>
                <TranslatedText id="roles.confirmDeleteDescription">
                  Esta ação não pode ser desfeita. A função será permanentemente excluída do sistema.
                </TranslatedText>
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                <TranslatedText id="roles.confirmDeleteMessage">
                  Tem certeza que deseja excluir a função:
                </TranslatedText>{" "}
                <strong>{selectedRole?.name}</strong>?
              </p>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  <TranslatedText id="common.cancel">Cancelar</TranslatedText>
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => selectedRole && deleteRoleMutation.mutate(selectedRole.id)}
                  disabled={deleteRoleMutation.isPending}
                >
                  {deleteRoleMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                      <TranslatedText id="common.processing">Processando...</TranslatedText>
                    </div>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <TranslatedText id="common.delete">Excluir</TranslatedText>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Permissions Sheet */}
        <Sheet open={isPermissionsSheetOpen} onOpenChange={setIsPermissionsSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-3xl">
            <SheetHeader>
              <SheetTitle>
                <TranslatedText id="roles.rolePermissions">Permissões da Função</TranslatedText>
              </SheetTitle>
              <SheetDescription>
                <TranslatedText id="roles.rolePermissionsDescription">
                  Gerencie as permissões para a função {selectedRole?.name}.
                </TranslatedText>
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-medium mb-2 text-white">
                  <TranslatedText id="roles.availablePermissions">Permissões Disponíveis</TranslatedText>
                </h3>
                
                {loadingPermissions ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
                  </div>
                ) : (
                  <div>
                    {/* Agrupar permissões por módulos em três colunas */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Dashboard */}
                      <div className="rounded border border-blue-800 p-3 mb-3">
                        <h4 className="text-blue-300 font-medium mb-2">Dashboard</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p.startsWith('dashboard_'))
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  {permission.replace('dashboard_', '').replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Pacientes */}
                      <div className="rounded border border-blue-800 p-3 mb-3">
                        <h4 className="text-blue-300 font-medium mb-2">Pacientes</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p.startsWith('patients_'))
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  {permission.replace('patients_', '').replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Hospitais */}
                      <div className="space-y-2 border-b border-blue-800 pb-4">
                        <h4 className="text-blue-300 font-medium">Hospitais</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p.startsWith('hospitals_'))
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  {permission.replace('hospitals_', '').replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Pedidos */}
                      <div className="space-y-2 border-b border-blue-800 pb-4">
                        <h4 className="text-blue-300 font-medium">Pedidos</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p.startsWith('orders_'))
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  {permission.replace('orders_', '').replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Catálogo */}
                      <div className="space-y-2 border-b border-blue-800 pb-4">
                        <h4 className="text-blue-300 font-medium">Catálogo</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p.startsWith('catalog_'))
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  {permission.replace('catalog_', '').replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Relatórios */}
                      <div className="space-y-2 border-b border-blue-800 pb-4">
                        <h4 className="text-blue-300 font-medium">Relatórios</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p.startsWith('reports_'))
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  {permission.replace('reports_', '').replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Usuários */}
                      <div className="space-y-2 border-b border-blue-800 pb-4">
                        <h4 className="text-blue-300 font-medium">Usuários</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p.startsWith('users_'))
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  {permission.replace('users_', '').replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Funções */}
                      <div className="space-y-2 border-b border-blue-800 pb-4">
                        <h4 className="text-blue-300 font-medium">Funções</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p.startsWith('roles_'))
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  {permission.replace('roles_', '').replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Configurações do Sistema */}
                      <div className="space-y-2">
                        <h4 className="text-blue-300 font-medium">Configurações do Sistema</h4>
                        <div className="ml-2 space-y-2">
                          {allPermissions
                            .filter(p => p === 'system_settings')
                            .map(permission => (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={permission}
                                  checked={selectedRolePermissions.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRolePermissions([...selectedRolePermissions, permission]);
                                    } else {
                                      setSelectedRolePermissions(
                                        selectedRolePermissions.filter(p => p !== permission)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={permission} className="text-sm text-white">
                                  Configurações do sistema
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-between">
                <Button 
                  onClick={() => setIsPermissionsSheetOpen(false)}
                  variant="outline"
                  className="border-blue-700 bg-transparent text-white hover:bg-blue-900/50"
                >
                  <TranslatedText id="common.cancel">Cancelar</TranslatedText>
                </Button>
                
                <Button 
                  onClick={handleSavePermissions}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={loadingPermissions}
                >
                  {loadingPermissions ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <TranslatedText id="common.save">Salvar</TranslatedText>
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}