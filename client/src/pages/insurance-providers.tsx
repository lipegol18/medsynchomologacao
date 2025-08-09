import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { HealthInsuranceProvider } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2, Check, X, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { InsuranceProviderFormDialog } from "@/components/insurance-providers/insurance-provider-form-dialog";

export default function InsuranceProvidersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<HealthInsuranceProvider | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  // Definir título da página
  useEffect(() => {
    document.title = "Operadoras de Saúde | MedSync";
  }, []);

  // Verificar se o usuário tem permissão para acessar esta página
  const isAdmin = user?.roleId === 1;
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="mt-4">
          Você não tem permissão para acessar esta página. Esta funcionalidade é exclusiva para administradores.
        </p>
      </div>
    );
  }

  const { data: providers = [], isLoading } = useQuery<HealthInsuranceProvider[]>({
    queryKey: ["/api/health-insurance-providers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/health-insurance-providers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurance-providers"] });
      toast({
        title: "Operadora excluída com sucesso",
        description: "A operadora de saúde foi removida do sistema.",
        variant: "default",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir operadora",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateProvider = () => {
    setSelectedProvider(null);
    setFormMode("create");
    setIsFormOpen(true);
  };

  const handleEditProvider = (provider: HealthInsuranceProvider) => {
    setSelectedProvider(provider);
    setFormMode("edit");
    setIsFormOpen(true);
  };

  const handleDeleteProvider = (provider: HealthInsuranceProvider) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProvider) {
      deleteProviderMutation.mutate(selectedProvider.id);
    }
  };

  // Filtrar operadoras com base no termo de busca
  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.cnpj.includes(searchTerm) ||
      provider.ansCode.includes(searchTerm)
  );

  return (
    <>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Operadoras de Saúde</h1>
          <Button onClick={handleCreateProvider}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Operadora
          </Button>
        </div>

        <div className="flex items-center mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou código ANS..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p>Carregando operadoras de saúde...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <p>Nenhuma operadora de saúde encontrada.</p>
            {searchTerm && (
              <p className="text-muted-foreground mt-2">
                Tente ajustar os termos da busca ou adicione uma nova operadora.
              </p>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Código ANS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>{provider.cnpj}</TableCell>
                    <TableCell>{provider.ansCode}</TableCell>
                    <TableCell>
                      {provider.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="mr-1 h-3 w-3" />
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <X className="mr-1 h-3 w-3" />
                          Inativa
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProvider(provider)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProvider(provider)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <InsuranceProviderFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        provider={selectedProvider || undefined}
        mode={formMode}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir a operadora "{selectedProvider?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {deleteProviderMutation.isPending && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}