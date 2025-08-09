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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cnpjMask, phoneMask } from "@/lib/utils";
import { validations, formatters } from "@/lib/validations";

// Schema aprimorado para validação do formulário de fornecedor
const supplierFormSchema = z.object({
  companyName: z.string()
    .min(3, "Nome da empresa deve ter pelo menos 3 caracteres")
    .max(100, "Nome da empresa muito longo")
    .refine((name) => name.trim().length >= 3, "Nome da empresa não pode ser apenas espaços"),
  tradeName: z.string()
    .max(100, "Nome fantasia muito longo")
    .optional()
    .or(z.literal("")),
  cnpj: validations.cnpj,
  email: validations.email.optional().or(z.literal("")),
  phone: validations.phone.optional().or(z.literal("")),
  address: z.string()
    .max(200, "Endereço muito longo")
    .optional()
    .or(z.literal("")),
  neighborhood: z.string()
    .max(100, "Bairro muito longo")
    .optional()
    .or(z.literal("")),
  postalCode: validations.cep.optional().or(z.literal("")),
  website: z.string()
    .url("Website deve ser uma URL válida (ex: https://empresa.com.br)")
    .optional()
    .or(z.literal("")),
  anvisaCode: validations.anvisaCode,
  municipalityId: z.number()
    .min(1, "Município é obrigatório")
    .max(999999, "Município inválido"),
  active: z.boolean().default(true),
});

// Tipo para o formulário de fornecedor
type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function SuppliersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  // Consulta para obter todos os fornecedores
  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ["/api/suppliers/search", showInactive],
    queryFn: async () => {
      const response = await fetch(`/api/suppliers/search${showInactive ? "?showAll=true" : ""}`);
      if (!response.ok) {
        throw new Error("Falha ao buscar fornecedores");
      }
      return response.json();
    },
  });

  // Formulário para adicionar fornecedor
  const addForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      companyName: "",
      tradeName: "",
      cnpj: "",
      email: "",
      phone: "",
      address: "",
      neighborhood: "",
      postalCode: "",
      website: "",
      anvisaCode: "",
      municipalityId: 1, // Valor padrão
      active: true,
    },
  });

  // Formulário para editar fornecedor
  const editForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      companyName: "",
      tradeName: "",
      cnpj: "",
      email: "",
      phone: "",
      address: "",
      neighborhood: "",
      postalCode: "",
      website: "",
      anvisaCode: "",
      municipalityId: 1,
      active: true,
    },
  });

  // Mutação para adicionar fornecedor
  const addSupplierMutation = useMutation({
    mutationFn: async (data: SupplierFormValues) => {
      return await apiRequest("/api/suppliers", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Fornecedor adicionado",
        description: "O fornecedor foi adicionado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/search"] });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar fornecedor
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SupplierFormValues }) => {
      return await apiRequest(`/api/suppliers/${id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Fornecedor atualizado",
        description: "As informações do fornecedor foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/search"] });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir fornecedor
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/suppliers/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Fornecedor removido",
        description: "O fornecedor foi removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/search"] });
      setIsDeleteDialogOpen(false);
      setSelectedSupplier(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para abrir o diálogo de edição com os dados do fornecedor
  const handleEditSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    editForm.reset({
      companyName: supplier.companyName || "",
      tradeName: supplier.tradeName || "",
      cnpj: supplier.cnpj || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      neighborhood: supplier.neighborhood || "",
      postalCode: supplier.postalCode || "",
      website: supplier.website || "",
      anvisaCode: supplier.anvisaCode || "",
      municipalityId: supplier.municipalityId || 1,
      active: supplier.active !== undefined ? supplier.active : true,
    });
    setIsEditDialogOpen(true);
  };

  // Função para abrir o diálogo de exclusão
  const handleDeleteSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };

  // Função para filtrar fornecedores com base no termo de pesquisa
  const filteredSuppliers = suppliers.filter((supplier: any) => {
    const term = searchTerm.toLowerCase();
    return (
      supplier.companyName?.toLowerCase().includes(term) ||
      supplier.tradeName?.toLowerCase().includes(term) ||
      supplier.cnpj?.toLowerCase().includes(term) ||
      supplier.email?.toLowerCase().includes(term)
    );
  });

  // Formulário para adicionar fornecedor
  const onAddSubmit = (data: SupplierFormValues) => {
    addSupplierMutation.mutate(data);
  };

  // Formulário para editar fornecedor
  const onEditSubmit = (data: SupplierFormValues) => {
    if (selectedSupplier) {
      updateSupplierMutation.mutate({ id: selectedSupplier.id, data });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">Gerenciar fornecedores de OPME</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="relative w-1/2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar fornecedores..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
            id="show-inactive"
          />
          <label htmlFor="show-inactive" className="text-sm">
            Mostrar inativos
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando fornecedores...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Houve um problema ao carregar os fornecedores. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      ) : filteredSuppliers.length === 0 ? (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nenhum fornecedor encontrado</AlertTitle>
          <AlertDescription>
            Não encontramos fornecedores com os critérios especificados.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier: any) => (
            <Card key={supplier.id} className={!supplier.active ? "opacity-70" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">{supplier.companyName}</CardTitle>
                  {!supplier.active && (
                    <Badge variant="outline" className="bg-muted">
                      Inativo
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {supplier.tradeName && supplier.tradeName !== supplier.companyName && (
                    <div>Nome Fantasia: {supplier.tradeName}</div>
                  )}
                  <div>CNPJ: {cnpjMask(supplier.cnpj)}</div>
                  {supplier.anvisaCode && (
                    <div>Código ANVISA: {supplier.anvisaCode}</div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <p className="text-sm font-medium">Telefone:</p>
                      <p className="text-sm">{supplier.phone ? phoneMask(supplier.phone) : "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email:</p>
                      <p className="text-sm">{supplier.email || "Não informado"}</p>
                    </div>
                  </div>
                  {supplier.address && (
                    <div>
                      <p className="text-sm font-medium">Endereço:</p>
                      <p className="text-sm">{supplier.address}</p>
                      {supplier.neighborhood && (
                        <p className="text-sm">{supplier.neighborhood}</p>
                      )}
                      {supplier.postalCode && (
                        <p className="text-sm">CEP: {supplier.postalCode}</p>
                      )}
                    </div>
                  )}
                  {supplier.website && (
                    <div>
                      <p className="text-sm font-medium">Website:</p>
                      <p className="text-sm">{supplier.website}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditSupplier(supplier)}>
                    <Edit2 className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteSupplier(supplier)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remover
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo para adicionar fornecedor */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Fornecedor</DialogTitle>
            <DialogDescription>
              Preencha as informações para adicionar um novo fornecedor ao sistema.
            </DialogDescription>
          </DialogHeader>

          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Fornecedor*</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="00.000.000/0000-00" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(cnpjMask(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome fantasia da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(00) 00000-0000" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(phoneMask(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email*</FormLabel>
                      <FormControl>
                        <Input placeholder="email@fornecedor.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço*</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, complemento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://empresa.com.br" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Fornecedor ativo
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addForm.control}
                name="anvisaCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código ANVISA</FormLabel>
                    <FormControl>
                      <Input placeholder="Código ANVISA" {...field} />
                    </FormControl>
                    <FormMessage />
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
                <Button type="submit" disabled={addSupplierMutation.isPending}>
                  {addSupplierMutation.isPending ? "Adicionando..." : "Adicionar Fornecedor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar fornecedor */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
            <DialogDescription>
              Atualize as informações do fornecedor.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Fornecedor*</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="00.000.000/0000-00" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(cnpjMask(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome fantasia da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(00) 00000-0000" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(phoneMask(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email*</FormLabel>
                      <FormControl>
                        <Input placeholder="email@fornecedor.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço*</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, complemento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://empresa.com.br" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Fornecedor ativo
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="anvisaCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código ANVISA</FormLabel>
                    <FormControl>
                      <Input placeholder="Código ANVISA" {...field} />
                    </FormControl>
                    <FormMessage />
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
                <Button type="submit" disabled={updateSupplierMutation.isPending}>
                  {updateSupplierMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para confirmar exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Você está prestes a remover o fornecedor{" "}
              <span className="font-semibold">{selectedSupplier?.name}</span>.
              Esta ação apenas marcará o fornecedor como inativo, permitindo que você o restaure posteriormente se necessário.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted p-3 rounded-md mt-2">
            <p className="text-sm">
              <span className="font-semibold">CNPJ:</span> {selectedSupplier?.cnpj}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Contato:</span> {selectedSupplier?.contactName}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => selectedSupplier && deleteSupplierMutation.mutate(selectedSupplier.id)}
              disabled={deleteSupplierMutation.isPending}
            >
              {deleteSupplierMutation.isPending ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}