import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Edit, Trash2, FileText, Stethoscope } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCidCodeSchema, type InsertCidCode, type CidCode } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { handleCID10CodeInput } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";

// Categorias disponíveis para CID-10
const CID_CATEGORIES = [
  // Categorias ortopédicas específicas
  "Joelho", 
  "Coluna", 
  "Ombro", 
  "Quadril", 
  "Pé e tornozelo",
  
  // Categorias CID-10 oficiais completas
  "Doenças Infecciosas e Parasitárias",
  "Neoplasias",
  "Doenças do Sangue e Órgãos Hematopoéticos",
  "Doenças Endócrinas e Metabólicas",
  "Transtornos Mentais e Comportamentais",
  "Doenças do Sistema Nervoso",
  "Doenças do Olho e Anexos",
  "Doenças do Ouvido",
  "Doenças do Aparelho Circulatório",
  "Doenças do Aparelho Respiratório",
  "Doenças do Aparelho Digestivo",
  "Doenças da Pele e Tecido Subcutâneo",
  "Doenças do Sistema Osteomuscular",
  "Doenças do Aparelho Geniturinário",
  "Gravidez, Parto e Puerpério",
  "Afecções Período Perinatal",
  "Malformações Congênitas",
  "Sintomas e Sinais Anormais",
  "Lesões e Envenenamentos",
  "Causas Externas",
  "Fatores que Influenciam o Estado de Saúde",
  "Outros"
];

export default function CidCodesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CidCode | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar códigos CID-10
  const { data: cidCodes = [], isLoading } = useQuery<CidCode[]>({
    queryKey: ["/api/cid-codes", { search: searchTerm, category: categoryFilter }],
  });

  // Filtrar códigos baseado na busca e categoria
  const filteredCodes = useMemo(() => {
    return cidCodes.filter((code) => {
      const matchesSearch = !searchTerm || 
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !categoryFilter || categoryFilter === "all" || code.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [cidCodes, searchTerm, categoryFilter]);

  // Formulário
  const form = useForm<InsertCidCode>({
    resolver: zodResolver(insertCidCodeSchema),
    defaultValues: {
      code: "",
      description: "",
      category: "Outros",
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: InsertCidCode) => apiRequest("/api/cid-codes", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cid-codes"] });
      toast({ title: "CID-10 criado com sucesso!" });
      handleCloseForm();
    },
    onError: () => {
      toast({ title: "Erro ao criar CID-10", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InsertCidCode }) =>
      apiRequest(`/api/cid-codes/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cid-codes"] });
      toast({ title: "CID-10 atualizado com sucesso!" });
      handleCloseForm();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar CID-10", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/cid-codes/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cid-codes"] });
      toast({ title: "CID-10 excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir CID-10", variant: "destructive" });
    },
  });

  // Handlers
  const handleOpenForm = () => {
    setEditingItem(null);
    form.reset({
      code: "",
      description: "",
      category: "Outros",
    });
    setIsFormOpen(true);
  };

  const handleEditItem = (item: CidCode) => {
    setEditingItem(item);
    form.reset({
      code: item.code,
      description: item.description,
      category: item.category,
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    form.reset();
  };

  const handleSubmit = (data: InsertCidCode) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Variante do badge baseada na categoria
  const getCategoryBadgeVariant = (category: string) => {
    const orthopedicCategories = ["Joelho", "Coluna", "Ombro", "Quadril", "Pé e tornozelo"];
    if (orthopedicCategories.includes(category)) return "default";
    if (category === "Neoplasias") return "destructive";
    if (category.includes("Doenças da Pele")) return "secondary";
    return "outline";
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Códigos CID-10</h2>
          <p className="text-muted-foreground">
            Gerencie os códigos CID-10 do sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cadastro CID-10
          </CardTitle>
          <CardDescription>
            Consulte, crie, edite e remova códigos CID-10
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros e botão de adicionar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código CID-10 (M75) ou descrição..."
                  value={searchTerm}
                  onChange={(e) => handleCID10CodeInput(e.target.value, setSearchTerm)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CID_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleOpenForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo CID-10
            </Button>
          </div>

          {/* Tabela de códigos CID-10 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Carregando códigos CID-10...
                    </TableCell>
                  </TableRow>
                ) : filteredCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      {searchTerm || categoryFilter 
                        ? "Nenhum código CID-10 encontrado com os filtros aplicados"
                        : "Nenhum código CID-10 cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCodes.map((cidCode) => (
                    <TableRow key={cidCode.id}>
                      <TableCell className="font-mono font-medium">
                        {cidCode.code}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={cidCode.description}>
                          {cidCode.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCategoryBadgeVariant(cidCode.category)}>
                          {cidCode.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditItem(cidCode)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o código CID-10 "{cidCode.code} - {cidCode.description}"?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(cidCode.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog do formulário */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar CID-10" : "Novo CID-10"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Edite as informações do código CID-10"
                : "Adicione um novo código CID-10 ao sistema"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: M75 ou M75.1" 
                        {...field}
                        onChange={(e) => handleCID10CodeInput(e.target.value, field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição do código CID-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CID_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvando..."
                    : editingItem
                    ? "Atualizar"
                    : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}