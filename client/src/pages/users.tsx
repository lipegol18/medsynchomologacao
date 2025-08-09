import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Pencil, Trash2, UserPlus, Check, X, Shield, XCircle, Building2 as BuildingHospital } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { User as UserType } from '@shared/schema';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { TranslatedText } from '@/components/ui/translated-text';


type UserWithoutPassword = Omit<UserType, 'password'>;

export default function UsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPermissionsSheetOpen, setIsPermissionsSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithoutPassword | null>(null);
  
  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    name: '', // Alterado de fullName para name para corresponder ao schema
    password: '',
    roleId: 0,
    crm: undefined as number | undefined,
    isCrmValidated: false,
    active: false, // Campo para status ativo/inativo (padrão: inativo)
  });
  
  // Estado para hospitais selecionados
  const [selectedHospitals, setSelectedHospitals] = useState<Array<{id: number, name: string, selected: boolean}>>([]);
  const [showHospitalSelection, setShowHospitalSelection] = useState(false);
  
  const [editUser, setEditUser] = useState({
    username: '',
    email: '',
    name: '', // Alterado de fullName para name para corresponder ao schema
    password: '', // Campo opcional para alteração de senha
    roleId: 0,
    crm: undefined as number | undefined,
    isCrmValidated: false,
    active: true, // Campo para status ativo/inativo
  });
  
  // Estado para hospitais associados ao usuário em edição
  const [editUserHospitals, setEditUserHospitals] = useState<Array<{id: number, name: string, selected: boolean}>>([]);
  const [showEditHospitalSelection, setShowEditHospitalSelection] = useState(false);
  
  // Estado para armazenar os dados do médico quando CRM for validado
  const [validatedDoctorName, setValidatedDoctorName] = useState('');
  const [validatedDoctorLocation, setValidatedDoctorLocation] = useState('');
  const [isValidatingCrm, setIsValidatingCrm] = useState(false);
  
  // Fetch users
  const { data: users, isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) {
        throw new Error('Falha ao buscar usuários');
      }
      return res.json();
    },
  });
  
  // Fetch roles for dropdown
  const { data: roles } = useQuery({
    queryKey: ['/api/roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles');
      if (!res.ok) {
        throw new Error('Falha ao buscar papéis');
      }
      return res.json();
    },
  });
  
  // Fetch hospitals for dropdown
  const { data: hospitals } = useQuery({
    queryKey: ['/api/hospitals'],
    queryFn: async () => {
      const res = await fetch('/api/hospitals');
      if (!res.ok) {
        throw new Error('Falha ao buscar hospitais');
      }
      return res.json();
    }
  });

  // Inicializar selectedHospitals quando hospitals são carregados
  useEffect(() => {
    if (hospitals && selectedHospitals.length === 0) {
      setSelectedHospitals(
        hospitals.map((hospital: any) => ({
          id: hospital.id,
          name: hospital.name,
          selected: false
        }))
      );
    }
  }, [hospitals, selectedHospitals.length]);
  
  // Mutation para associar hospitais ao médico
  const addDoctorHospitalsMutation = useMutation({
    mutationFn: async ({ userId, hospitalIds }: { userId: number, hospitalIds: number[] }) => {
      const res = await fetch(`/api/users/${userId}/hospitals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hospitalIds }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao associar hospitais ao médico');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Hospitais associados',
        description: 'Hospitais foram associados ao médico com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message + " (Os hospitais não foram associados, mas o usuário foi criado)",
        variant: 'destructive',
      });
    },
  });
  
  // Mutation para buscar hospitais associados a um médico
  const fetchDoctorHospitalsMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/users/${userId}/hospitals`);
      
      if (!res.ok) {
        if (res.status === 404) {
          return []; // Sem hospitais associados
        }
        const error = await res.json();
        throw new Error(error.message || 'Falha ao buscar hospitais do médico');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Mapear hospitais existentes com os associados ao médico
      if (data && Array.isArray(data) && hospitals) {
        const hospitalIds = data.map((h: any) => h.hospitalId);
        
        // Criar lista de hospitais com base no estado atual, marcando os associados
        const mappedHospitals = hospitals.map((h: any) => ({
          id: h.id,
          name: h.name,
          selected: hospitalIds.includes(h.id)
        }));
        
        setEditUserHospitals(mappedHospitals);
      }
    },
    onError: (error: Error) => {
      console.error("Erro ao buscar hospitais do médico:", error);
      toast({
        title: 'Aviso',
        description: 'Não foi possível buscar os hospitais associados ao médico.',
        variant: 'destructive',
      });
    }
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao criar usuário');
      }
      
      return res.json();
    },
    onSuccess: (user) => {
      // Se for médico ativo, verificar se precisa associar hospitais
      const isMedico = roles?.find(r => r.id === newUser.roleId)?.name === "Médico";
      const selectedHospitalIds = selectedHospitals
        .filter(h => h.selected)
        .map(h => h.id);
        
      if (isMedico && newUser.active && selectedHospitalIds.length > 0) {
        // Associar hospitais ao médico
        addDoctorHospitalsMutation.mutate({
          userId: user.id,
          hospitalIds: selectedHospitalIds
        });
      }
    
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddUserDialogOpen(false);
      setShowHospitalSelection(false);
      setSelectedHospitals(selectedHospitals.map(h => ({ ...h, selected: false })));
      setNewUser({
        username: '',
        email: '',
        name: '', // Alterado de fullName para name
        password: '',
        roleId: 0,
        crm: undefined,
        isCrmValidated: false,
        active: false,
      });
      toast({
        title: 'Usuário criado',
        description: 'Usuário foi criado com sucesso.',
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
  
  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async (userData: typeof editUser & { id: number }) => {
      const { id, ...data } = userData;
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao atualizar usuário');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: 'Usuário atualizado',
        description: 'As informações do usuário foram atualizadas com sucesso.',
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
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      // Verifica se a resposta foi bem-sucedida
      if (!res.ok) {
        // Em caso de erro, verifica o tipo de conteúdo antes de tentar parsear como JSON
        const contentType = res.headers.get('content-type');
        
        // Se for JSON, tenta parsear o erro
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await res.json();
            throw new Error(error.message || 'Falha ao excluir usuário');
          } catch (jsonError) {
            // Se falhar ao parsear JSON, usa mensagem genérica
            throw new Error(`Falha ao excluir usuário: ${res.status} ${res.statusText}`);
          }
        } else {
          // Se não for JSON (pode ser HTML de erro), usa apenas o status
          throw new Error(`Falha ao excluir usuário: ${res.status} ${res.statusText}`);
        }
      }
      
      // Para respostas bem-sucedidas, apenas retorna um objeto vazio
      // Não tenta ler o corpo da resposta para evitar erros de parsing
      return {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi excluído com sucesso.',
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
  
  // Funções auxiliares para verificar tipo de papel selecionado
  const checkIfMedicoSelected = (roleId: number) => {
    return roles?.find(r => r.id === roleId)?.name === "Médico";
  };
  
  // Função para verificar se o papel selecionado é Administrador
  const checkIfAdminRole = (roleId: number) => {
    return roles?.find(r => r.id === roleId)?.name === "Administrador";
  };
  
  // Verificar mudanças no formulário que podem exigir seleção de hospital
  useEffect(() => {
    const isMedico = checkIfMedicoSelected(newUser.roleId);
    const isAtivo = newUser.active;
    
    if (isMedico && isAtivo) {
      setShowHospitalSelection(true);
    } else {
      setShowHospitalSelection(false);
    }
  }, [newUser.roleId, newUser.active]);
  
  // Handler para o toggle de seleção de hospital
  const handleHospitalToggle = useCallback((hospitalId: number) => {
    setSelectedHospitals(prev => 
      prev.map(h => 
        h.id === hospitalId ? { ...h, selected: !h.selected } : h
      )
    );
  }, []);
  
  // Handlers
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.roleId) {
      toast({
        title: 'Dados incompletos',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    
    // Se for médico ativo e nenhum hospital selecionado, apenas mostrar informação
    // Médicos podem ser criados sem hospitais associados inicialmente
    const isMedico = checkIfMedicoSelected(newUser.roleId);
    const selectedHospitalCount = selectedHospitals.filter(h => h.selected).length;
    
    addUserMutation.mutate(newUser);
  };
  
  // Função para manipular toggle de hospitais na edição
  const handleEditHospitalToggle = useCallback((hospitalId: number) => {
    setEditUserHospitals(prev => 
      prev.map(h => 
        h.id === hospitalId ? { ...h, selected: !h.selected } : h
      )
    );
  }, []);

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editUser.username || !editUser.email || !editUser.roleId) {
      toast({
        title: 'Dados incompletos',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    
    // Se for médico ativo, verificar se tem pelo menos um hospital selecionado
    // Nota: Permitir médicos sem hospitais associados, pois podem estar sendo cadastrados
    const isMedico = roles?.find(r => r.id === editUser.roleId)?.name === "Médico";
    const selectedHospitalCount = editUserHospitals.filter(h => h.selected).length;
    
    // Removida a validação obrigatória de hospital para médicos
    // Médicos podem existir sem hospitais associados inicialmente
    
    // Primeiro atualizar o usuário
    editUserMutation.mutate({
      ...editUser,
      id: selectedUser.id,
    });
    
    // Se for médico ativo, atualizar os hospitais vinculados
    if (isMedico && editUser.active && showEditHospitalSelection) {
      const selectedHospitalIds = editUserHospitals
        .filter(h => h.selected)
        .map(h => h.id);
      
      addDoctorHospitalsMutation.mutate({
        userId: selectedUser.id,
        hospitalIds: selectedHospitalIds
      });
    }
  };
  
  const handleOpenEditDialog = (user: UserWithoutPassword) => {
    setSelectedUser(user);
    setEditUser({
      username: user.username,
      email: user.email,
      name: user.name || '',
      password: '', // Campo vazio para senha, só será enviado se preenchido
      roleId: user.roleId,
      crm: user.crm,
      isCrmValidated: false,
      active: user.active !== undefined ? user.active : true, // Usa o valor existente ou true como padrão
    });
    
    // Se for médico ativo, buscar hospitais associados
    const isMedico = roles?.find(r => r.id === user.roleId)?.name === "Médico";
    if (isMedico && user.active) {
      fetchDoctorHospitalsMutation.mutate(user.id);
      setShowEditHospitalSelection(true);
    } else {
      setEditUserHospitals([]);
      setShowEditHospitalSelection(false);
    }
    
    setIsEditUserDialogOpen(true);
  };
  
  const handleOpenDeleteConfirm = (user: UserWithoutPassword) => {
    // Verificar se o usuário é administrador
    if (currentUser?.roleId !== 1) {
      toast({
        title: 'Acesso negado',
        description: 'Somente administradores podem excluir usuários.',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedUser(user);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleOpenPermissionsSheet = (user: UserWithoutPassword) => {
    setSelectedUser(user);
    setIsPermissionsSheetOpen(true);
  };
  
  const getRoleName = (roleId: number) => {
    if (!roles) return 'Carregando...';
    const role = roles.find((r: any) => r.id === roleId);
    return role ? role.name : 'Não atribuído';
  };
  
  // Função para verificar se o CRM é válido
  const validateCRM = async (crm: number | string) => {
    setIsValidatingCrm(true);
    try {
      // Aqui faríamos uma consulta a uma API externa do CFM
      // Para fins de demonstração, vamos simular uma validação
      const response = await fetch(`/api/validate-crm?crm=${crm}`);
      
      if (!response.ok) {
        throw new Error('Falha ao validar CRM');
      }
      
      const data = await response.json();
      if (data.valid) {
        setValidatedDoctorName(data.name);
        setValidatedDoctorLocation(`${data.city}/${data.state}`);
        return true;
      } else {
        setValidatedDoctorName('');
        setValidatedDoctorLocation('');
        toast({
          title: 'CRM inválido',
          description: 'O número de CRM informado não foi encontrado.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Erro ao validar CRM:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível validar o CRM no momento.',
        variant: 'destructive',
      });
      setValidatedDoctorName('');
      setValidatedDoctorLocation('');
      return false;
    } finally {
      setIsValidatingCrm(false);
    }
  };
  
  // Render
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#1a2332]">
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold mb-6 text-white">
            <TranslatedText id="users.title">Gerenciamento de Usuários</TranslatedText>
          </h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-[#1a2332]">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-blue-800/30" aria-label="Fechar">
                <X className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">
              <TranslatedText id="users.title">Gerenciamento de Usuários</TranslatedText>
            </h1>
          </div>
          <Button 
            onClick={() => setIsAddUserDialogOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <TranslatedText id="users.addUser">Adicionar Usuário</TranslatedText>
          </Button>
        </div>
        
        <div className="bg-[#1a2332] rounded-lg overflow-hidden">
          <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
            <table className="min-w-full table-fixed">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[5%]">
                    <TranslatedText id="users.id">ID</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[15%]">
                    <TranslatedText id="users.name">Nome</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[12%]">
                    <TranslatedText id="users.username">Usuário</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[15%]">
                    <TranslatedText id="users.email">E-mail</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[12%]">
                    <TranslatedText id="users.role">Função</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[8%]">
                    <TranslatedText id="users.crm">CRM</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[8%]">
                    <TranslatedText id="users.active">Ativo</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[15%]">
                    <TranslatedText id="users.consent">Consentimento</TranslatedText>
                  </th>
                  <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium w-[15%]">
                    <TranslatedText id="users.actions">Ações</TranslatedText>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users && users.map((user) => (
                  <tr key={user.id} className="border-b border-blue-800/40 hover:bg-blue-900/20">
                    <td className="py-3 px-4 text-white">{user.id}</td>
                    <td className="py-3 px-4 text-white">{user.name || '-'}</td>
                    <td className="py-3 px-4 text-white">{user.username}</td>
                    <td className="py-3 px-4 text-white">{user.email}</td>
                    <td className="py-3 px-4 text-white">{user.roleName || getRoleName(user.roleId)}</td>
                    <td className="py-3 px-4">
                      {user.crm ? (
                        <span className="bg-blue-900/60 text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full border border-blue-700">
                          {user.crm}
                        </span>
                      ) : (
                        <span className="text-blue-300/50">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.active ? (
                        <span className="bg-green-900/60 text-green-200 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-700">
                          Sim
                        </span>
                      ) : (
                        <span className="bg-red-900/60 text-red-200 text-xs font-medium px-2.5 py-0.5 rounded-full border border-red-700">
                          Não
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.consentAccepted ? (
                        <div className="flex flex-col">
                          <span className="bg-green-900/60 text-green-200 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-700 mb-1">
                            Aceito
                          </span>
                          <span className="text-xs text-gray-300">
                            {new Date(user.consentAccepted).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      ) : (
                        <span className="bg-yellow-900/60 text-yellow-200 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-700">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-1 flex-nowrap">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleOpenEditDialog(user)}
                          title="Editar"
                          className="h-7 w-7 border-blue-700 bg-blue-900/30 text-blue-200 hover:bg-blue-800/50"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleOpenPermissionsSheet(user)}
                          title="Permissões"
                          className="h-7 w-7 border-blue-700 bg-blue-900/30 text-blue-200 hover:bg-blue-800/50"
                        >
                          <Shield className="h-3 w-3" />
                        </Button>
                        
                        {/* Somente mostrar botão de exclusão para administradores */}
                        {currentUser?.roleId === 1 && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleOpenDeleteConfirm(user)}
                            title="Excluir"
                            className="h-7 w-7 border-red-700 bg-red-900/20 text-red-300 hover:bg-red-800/40"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {(!users || users.length === 0) && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-blue-300">
                      <TranslatedText id="users.noUsers">Nenhum usuário encontrado</TranslatedText>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      
        {/* Add User Dialog */}
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            
            <DialogHeader>
              <DialogTitle>
                <TranslatedText id="users.addUser">Adicionar Usuário</TranslatedText>
              </DialogTitle>
              <DialogDescription>
                <TranslatedText id="users.addUserDescription">
                  Preencha os detalhes para criar um novo usuário no sistema.
                </TranslatedText>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  <TranslatedText id="users.username">Usuário</TranslatedText> *
                </Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">
                  <TranslatedText id="users.name">Nome</TranslatedText>
                </Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">
                  <TranslatedText id="users.email">E-mail</TranslatedText> *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">
                  <TranslatedText id="users.password">Senha</TranslatedText> *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">
                  <TranslatedText id="users.role">Função</TranslatedText> *
                </Label>
                <Select 
                  value={newUser.roleId.toString()} 
                  onValueChange={(value) => {
                    const roleId = parseInt(value, 10);
                    setNewUser({
                      ...newUser, 
                      roleId,
                      // Se for administrador, sempre ativo
                      active: checkIfAdminRole(roleId) ? true : newUser.active,
                      // Se não for role de médico, limpa o campo de CRM
                      crm: roleId === 2 ? newUser.crm : undefined,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {roles && roles.map((role: any) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Campo CRM somente para médicos (roleId = 2) */}
              {newUser.roleId === 2 && (
                <div className="space-y-2">
                  <Label htmlFor="crm">CRM (para médicos)</Label>
                  <Input
                    id="crm"
                    type="number"
                    placeholder="Digite o número do CRM"
                    value={newUser.crm || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewUser({
                        ...newUser,
                        crm: value ? parseInt(value) : undefined,
                      });
                    }}
                  />
                </div>
              )}
              
              {/* Campo Ativo (Sim/Não) */}
              {/* Campo "Ativo" - não deve aparecer para administradores */}
              {!checkIfAdminRole(newUser.roleId) && (
                <div className="space-y-2">
                  <Label htmlFor="active">
                    <TranslatedText id="users.active">Ativo</TranslatedText>
                  </Label>
                  <Select 
                    value={newUser.active ? "true" : "false"} 
                    onValueChange={(value) => {
                      setNewUser({
                        ...newUser, 
                        active: value === "true"
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="true">Sim</SelectItem>
                        <SelectItem value="false">Não</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Seleção de hospitais para médicos ativos */}
              {showHospitalSelection && (
                <div className="space-y-3 border p-3 rounded-md bg-slate-900/40 mt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">
                      <TranslatedText id="users.hospitalAssociation">Hospitais associados</TranslatedText>
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      <TranslatedText id="users.optionalForDoctor">Opcional</TranslatedText>
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-slate-400">
                    <TranslatedText id="users.selectHospitalsInfo">
                      Selecione os hospitais onde este médico trabalha
                    </TranslatedText>
                  </p>
                  
                  {selectedHospitals.length === 0 && (
                    <div className="text-center py-3 text-slate-400 text-sm">
                      <BuildingHospital className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <TranslatedText id="users.noHospitals">
                        Nenhum hospital cadastrado no sistema
                      </TranslatedText>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                    {selectedHospitals.map(hospital => (
                      <div 
                        key={hospital.id}
                        className={`flex items-center justify-between p-2 rounded-md border ${
                          hospital.selected 
                            ? 'border-blue-500 bg-blue-950/50' 
                            : 'border-transparent bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={hospital.selected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleHospitalToggle(hospital.id);
                            }}
                            className="mr-2 h-4 w-4 rounded border-gray-300"
                          />
                          <span 
                            className="text-sm cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHospitalToggle(hospital.id);
                            }}
                          >
                            {hospital.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={addUserMutation.isPending}
                >
                  {addUserMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                      <TranslatedText id="common.processing">Processando...</TranslatedText>
                    </div>
                  ) : (
                    <TranslatedText id="common.create">Criar</TranslatedText>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit User Dialog */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            
            <DialogHeader>
              <DialogTitle>
                <TranslatedText id="users.editUser">Editar Usuário</TranslatedText>
              </DialogTitle>
              <DialogDescription>
                <TranslatedText id="users.editUserDescription">
                  Atualize as informações do usuário.
                </TranslatedText>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleEditUser} className="space-y-3 py-3">
              {/* Primeira linha: Usuário e Nome lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-username">
                    <TranslatedText id="users.username">Usuário</TranslatedText> *
                  </Label>
                  <Input
                    id="edit-username"
                    value={editUser.username}
                    onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="edit-name">
                    <TranslatedText id="users.name">Nome</TranslatedText>
                  </Label>
                  <Input
                    id="edit-name"
                    value={editUser.name}
                    onChange={(e) => setEditUser({...editUser, name: e.target.value})}
                  />
                </div>
              </div>
              
              {/* Segunda linha: E-mail e Senha lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-email">
                    <TranslatedText id="users.email">E-mail</TranslatedText> *
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="edit-password">
                    <TranslatedText id="users.newPassword">Nova Senha (opcional)</TranslatedText>
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editUser.password}
                    onChange={(e) => setEditUser({...editUser, password: e.target.value})}
                    placeholder="Deixe em branco para manter a senha atual"
                  />
                </div>
              </div>
              
              {/* Terceira linha: Função e Status (Ativo/Inativo) lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-role">
                    <TranslatedText id="users.role">Função</TranslatedText> *
                  </Label>
                  <Select 
                    value={editUser.roleId.toString()} 
                    onValueChange={(value) => {
                      const roleId = parseInt(value, 10);
                      setEditUser({
                        ...editUser, 
                        roleId,
                        // Se for administrador, sempre ativo
                        active: checkIfAdminRole(roleId) ? true : editUser.active,
                        // Se não for role de médico, limpa o campo de CRM
                        crm: roleId === 2 ? editUser.crm : undefined,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {roles && roles.map((role: any) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Campo Ativo (Sim/Não) - ao lado da Função (se não for admin) */}
                {!checkIfAdminRole(editUser.roleId) ? (
                  <div className="space-y-1">
                    <Label htmlFor="edit-active">
                      <TranslatedText id="users.active">Ativo</TranslatedText>
                    </Label>
                    <Select 
                      value={editUser.active ? "true" : "false"} 
                      onValueChange={(value) => {
                        setEditUser({
                          ...editUser, 
                          active: value === "true"
                        });
                      }}
                    >
                      <SelectTrigger id="edit-active">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="true">Sim</SelectItem>
                          <SelectItem value="false">Não</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">
                      <TranslatedText id="users.active">Ativo</TranslatedText>
                    </Label>
                    <div className="h-10 px-3 py-2 flex items-center rounded-md border border-input bg-background text-sm text-muted-foreground">
                      <span>Sempre ativo (Administrador)</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Campo CRM apenas para médicos - ocupa toda a largura */}
              {editUser.roleId === 2 && (
                <div className="space-y-1 mt-1">
                  <Label htmlFor="edit-crm">CRM (para médicos)</Label>
                  <Input
                    id="edit-crm"
                    type="number"
                    placeholder="Digite o número do CRM"
                    value={editUser.crm || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditUser({
                        ...editUser,
                        crm: value ? parseInt(value) : undefined,
                      });
                    }}
                  />
                </div>
              )}
              
              {/* Seleção de hospitais para médicos ativos em edição - Layout compacto */}
              {showEditHospitalSelection && (
                <div className="border p-2 rounded-md bg-slate-900/40 mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <BuildingHospital className="w-4 h-4 text-blue-400" />
                      <h3 className="font-medium text-sm">
                        <TranslatedText id="users.hospitalAssociation">Hospitais associados</TranslatedText>
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-xs py-0 h-5">
                      <TranslatedText id="users.optionalForDoctor">Opcional</TranslatedText>
                    </Badge>
                  </div>
                  
                  {editUserHospitals.length === 0 ? (
                    <div className="text-center py-1 text-slate-400 text-xs">
                      <TranslatedText id="users.noHospitals">
                        Nenhum hospital cadastrado no sistema
                      </TranslatedText>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto pr-1">
                      {editUserHospitals.map(hospital => (
                        <div 
                          key={hospital.id}
                          className={`flex items-center p-1 rounded-md border text-xs ${
                            hospital.selected 
                              ? 'border-blue-500 bg-blue-950/50' 
                              : 'border-transparent bg-slate-800/50'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={hospital.selected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleEditHospitalToggle(hospital.id);
                            }}
                            className="mr-1 h-3 w-3"
                          />
                          <span 
                            className="text-xs truncate cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditHospitalToggle(hospital.id);
                            }}
                          >
                            {hospital.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={editUserMutation.isPending}
                >
                  {editUserMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                      <TranslatedText id="common.processing">Processando...</TranslatedText>
                    </div>
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
                <TranslatedText id="users.confirmDelete">Confirmar Exclusão</TranslatedText>
              </DialogTitle>
              <DialogDescription>
                <TranslatedText id="users.confirmDeleteDescription">
                  Esta ação não pode ser desfeita. O usuário será permanentemente excluído do sistema.
                </TranslatedText>
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                <TranslatedText id="users.confirmDeleteMessage">
                  Tem certeza que deseja excluir o usuário:
                </TranslatedText>{" "}
                <strong>{selectedUser?.username}</strong> ({selectedUser?.email})?
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
                  onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? (
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
        
        {/* Permissions Management Sheet */}
        <Sheet open={isPermissionsSheetOpen} onOpenChange={setIsPermissionsSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>
                <TranslatedText id="users.userPermissions">Permissões do Usuário</TranslatedText>
              </SheetTitle>
              <SheetDescription>
                <TranslatedText id="users.userPermissionsDescription">
                  Gerencie as permissões individuais para o usuário {selectedUser?.username}.
                </TranslatedText>
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6">
              <div className="flex items-center mb-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">
                    <TranslatedText id="users.rolePermissions">Permissões da Função</TranslatedText>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    <TranslatedText id="users.assignedRole">Função atribuída</TranslatedText>: {selectedUser && (selectedUser.roleName || getRoleName(selectedUser.roleId))}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">
                  <TranslatedText id="users.addIndividualPermission">Adicionar Permissão Individual</TranslatedText>
                </h4>
                
                {/* Implementar funcionalidade de adicionar/remover permissão individual aqui */}
                <p className="text-sm text-muted-foreground">
                  Funcionalidade de gerenciamento de permissões individuais será implementada em breve.
                </p>
              </div>
              
              <SheetFooter className="mt-6">
                <Button 
                  onClick={() => setIsPermissionsSheetOpen(false)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Check className="mr-2 h-4 w-4" />
                  <TranslatedText id="common.done">Concluído</TranslatedText>
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}