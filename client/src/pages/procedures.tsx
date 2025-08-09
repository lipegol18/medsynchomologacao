import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Search, Plus, Edit2, Trash2, X, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { handleCBHPMCodeInput } from "@/lib/formatters";

// Schema para validação do formulário de procedimento
const procedureFormSchema = z.object({
  code: z.string()
    .min(1, "Código é obrigatório")
    .max(20, "Código muito longo")
    .refine((code) => code.trim().length >= 1, "Código não pode ser apenas espaços"),
  name: z.string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(200, "Nome muito longo")
    .refine((name) => name.trim().length >= 3, "Nome não pode ser apenas espaços"),
  porte: z.string()
    .max(10, "Porte muito longo")
    .optional()
    .or(z.literal("")),
  numeroAuxiliares: z.number()
    .min(0, "Número de auxiliares deve ser positivo")
    .max(10, "Número de auxiliares muito alto")
    .optional(),
  porteAnestesista: z.string()
    .max(10, "Porte anestesista muito longo")
    .optional()
    .or(z.literal("")),
  custoOperacional: z.string()
    .max(50, "Custo operacional muito longo")
    .optional()
    .or(z.literal("")),
  description: z.string()
    .max(500, "Descrição muito longa")
    .optional()
    .or(z.literal("")),
  active: z.boolean().default(true),
});

// Tipo para o formulário de procedimento
type ProcedureFormValues = z.infer<typeof procedureFormSchema>;

export default function ProceduresPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Função para lidar com a mudança no campo de busca usando utilitário
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleCBHPMCodeInput(e.target.value, setSearchTerm);
  };
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);

  // Consulta para obter todos os procedimentos
  const { data: procedures = [], isLoading, error } = useQuery({
    queryKey: ["/api/procedures", showInactive],
    queryFn: async () => {
      const response = await fetch("/api/procedures");
      if (!response.ok) {
        throw new Error("Falha ao buscar procedimentos");
      }
      const data = await response.json();
      return showInactive ? data : data.filter((proc: any) => proc.active);
    },
  });

  // Formulário para adicionar procedimento
  const addForm = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureFormSchema),
    defaultValues: {
      code: "",
      name: "",
      porte: "",
      numeroAuxiliares: undefined,
      porteAnestesista: "",
      custoOperacional: "",
      description: "",
      active: true,
    },
  });

  // Formulário para editar procedimento
  const editForm = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureFormSchema),
    defaultValues: {
      code: "",
      name: "",
      porte: "",
      numeroAuxiliares: undefined,
      porteAnestesista: "",
      custoOperacional: "",
      description: "",
      active: true,
    },
  });

  // Mutação para criar procedimento
  const createMutation = useMutation({
    mutationFn: async (data: ProcedureFormValues) => {
      return apiRequest("/api/procedures", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Procedimento criado com sucesso",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar procedimento",
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar procedimento
  const updateMutation = useMutation({
    mutationFn: async (data: ProcedureFormValues) => {
      return apiRequest(`/api/procedures/${selectedProcedure.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Procedimento atualizado com sucesso",
      });
      setIsEditDialogOpen(false);
      setSelectedProcedure(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar procedimento",
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir procedimento
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/procedures/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Procedimento excluído com sucesso",
      });
      setIsDeleteDialogOpen(false);
      setSelectedProcedure(null);
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir procedimento",
        variant: "destructive",
      });
    },
  });

  // Filtrar procedimentos baseado no termo de busca
  const filteredProcedures = procedures.filter((procedure: any) =>
    procedure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    procedure.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (procedure.category && procedure.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Função para abrir o diálogo de edição
  const handleEdit = (procedure: any) => {
    setSelectedProcedure(procedure);
    editForm.reset({
      code: procedure.code,
      name: procedure.name,
      porte: procedure.porte || "",
      numeroAuxiliares: procedure.numeroAuxiliares,
      porteAnestesista: procedure.porteAnestesista || "",
      custoOperacional: procedure.custoOperacional || "",
      description: procedure.description || "",
      active: procedure.active,
    });
    setIsEditDialogOpen(true);
  };

  // Função para abrir o diálogo de exclusão
  const handleDelete = (procedure: any) => {
    setSelectedProcedure(procedure);
    setIsDeleteDialogOpen(true);
  };

  // Função para submeter o formulário de criação
  const onAddSubmit = (data: ProcedureFormValues) => {
    createMutation.mutate(data);
  };

  // Função para submeter o formulário de edição
  const onEditSubmit = (data: ProcedureFormValues) => {
    updateMutation.mutate(data);
  };

  // Função para confirmar exclusão
  const onDeleteConfirm = () => {
    if (selectedProcedure) {
      deleteMutation.mutate(selectedProcedure.id);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procedimentos CBHPM</h1>
          <p className="text-muted-foreground">
            Gerencie os procedimentos médicos do sistema
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo Procedimento
        </Button>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou categoria..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <label htmlFor="show-inactive" className="text-sm font-medium">
            Mostrar inativos
          </label>
        </div>
      </div>

      {/* Lista de procedimentos */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Falha ao carregar procedimentos. Tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProcedures.map((procedure: any) => (
            <Card key={procedure.id} className={!procedure.active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{procedure.name}</CardTitle>
                    <CardDescription>Código: {procedure.code}</CardDescription>
                  </div>
                  <Badge variant={procedure.active ? "default" : "secondary"}>
                    {procedure.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {procedure.porte && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Porte:</span> {procedure.porte}
                    </p>
                  )}
                  {procedure.numeroAuxiliares !== null && procedure.numeroAuxiliares !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Nº Auxiliares:</span> {procedure.numeroAuxiliares}
                    </p>
                  )}
                  {procedure.porteAnestesista && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Porte Anestesia:</span> {procedure.porteAnestesista}
                    </p>
                  )}
                  {procedure.custoOperacional && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Custo Oper.:</span> {procedure.custoOperacional}
                    </p>
                  )}
                </div>
                {procedure.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {procedure.description}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(procedure)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(procedure)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {filteredProcedures.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum procedimento encontrado</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm
                ? `Não encontramos procedimentos para "${searchTerm}"`
                : "Nenhum procedimento cadastrado ainda"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para adicionar procedimento */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Procedimento</DialogTitle>
            <DialogDescription>
              Adicione um novo procedimento CBHPM ao sistema
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 31603017 → 3.16.03.01-7" 
                          {...field}
                          onChange={(e) => {
                            handleCBHPMCodeInput(e.target.value, field.onChange);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="porte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porte</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 4A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do procedimento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="numeroAuxiliares"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Auxiliares</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="porteAnestesista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porte Anestesia</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="custoOperacional"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Operacional</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: R$ 1.500,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição detalhada do procedimento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativo</FormLabel>
                      <FormDescription>
                        Procedimento disponível para uso no sistema
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar Procedimento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar procedimento */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Procedimento</DialogTitle>
            <DialogDescription>
              Edite as informações do procedimento
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 31603017 → 3.16.03.01-7" 
                          {...field}
                          onChange={(e) => {
                            handleCBHPMCodeInput(e.target.value, field.onChange);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="porte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porte</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 4A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do procedimento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="numeroAuxiliares"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Auxiliares</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="porteAnestesista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porte Anestesia</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="custoOperacional"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Operacional</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: R$ 1.500,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição detalhada do procedimento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativo</FormLabel>
                      <FormDescription>
                        Procedimento disponível para uso no sistema
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o procedimento "{selectedProcedure?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}