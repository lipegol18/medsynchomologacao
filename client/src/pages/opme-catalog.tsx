import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { OpmeItemForm, OpmeItemFormValues } from "@/components/opme/opme-item-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Plus, Search, Edit, Trash, Check, X, ExternalLink, Pencil, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

// Definição dos tipos baseados no schema.ts
type OpmeItem = {
  id: number;
  anvisaRegistrationNumber: string | null;
  processNumber: string | null;
  technicalName: string;
  commercialName: string;
  riskClass: string | null;
  holderCnpj: string | null;
  registrationHolder: string | null;
  manufacturerName: string;
  countryOfManufacture: string | null;
  registrationDate: string | null;
  expirationDate: string | null;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
};

type Supplier = {
  id: number;
  companyName: string;
  tradeName: string;
  cnpj: string;
  municipalityId: number;
  active: boolean;
};

type OpmeSupplier = {
  id: number;
  opmeItemId: number;
  supplierId: number;
  registrationAnvisa: string | null;
  commercialDescription: string | null;
  isPreferred: boolean;
  active: boolean;
  unitPrice: number | null;
  lastPriceUpdate: string | null;
  deliveryTimeDays: number | null;
  minimumQuantity: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type OpmeWithSuppliers = {
  opmeItem: OpmeItem;
  suppliers: OpmeSupplier[];
};

// Esquemas de validação com Zod
const OpmeItemFormSchema = z.object({
  technicalName: z.string().min(1, "Nome técnico é obrigatório"),
  commercialName: z.string().min(1, "Nome comercial é obrigatório"),
  manufacturerName: z.string().min(1, "Fabricante é obrigatório"),
  anvisaRegistrationNumber: z.string().nullable().optional(),
  processNumber: z.string().nullable().optional(),
  riskClass: z.string().nullable().optional(),
  holderCnpj: z.string().nullable().optional(),
  registrationHolder: z.string().nullable().optional(),
  countryOfManufacture: z.string().nullable().optional(),
  registrationDate: z.string().nullable().optional(),
  expirationDate: z.string().nullable().optional(),
  isValid: z.boolean().default(true),
});

const OpmeSupplierFormSchema = z.object({
  opmeItemId: z.number().min(1, "Item OPME é obrigatório"),
  supplierId: z.number().min(1, "Fornecedor é obrigatório"),
  registrationAnvisa: z.string().nullable().optional(),
  commercialDescription: z.string().nullable().optional(),
  isPreferred: z.boolean().default(false),
  unitPrice: z.number().nullable().optional(),
  deliveryTimeDays: z.number().nullable().optional(),
  minimumQuantity: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

const formatCurrency = (value: number | null) => {
  if (value === null) return "-";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const OpmeItem = ({ item, onEdit, onViewSuppliers }: { 
  item: OpmeItem, 
  onEdit: (item: OpmeItem) => void,
  onViewSuppliers: (itemId: number) => void 
}) => {
  return (
    <Card className="mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{item.technicalName}</CardTitle>
            <CardDescription className="text-md">{item.commercialName}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onViewSuppliers(item.id)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Fornecedores
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Fabricante:</p>
            <p className="text-sm">{item.manufacturerName}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Origem:</p>
            <p className="text-sm">{item.countryOfManufacture || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Registro ANVISA:</p>
            <p className="text-sm">{item.anvisaRegistrationNumber || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Classe de Risco:</p>
            <p className="text-sm">{item.riskClass || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Validade do Registro:</p>
            <p className="text-sm">{item.expirationDate ? format(new Date(item.expirationDate), 'dd/MM/yyyy') : "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Status:</p>
            <Badge variant={item.isValid ? "default" : "destructive"}>
              {item.isValid ? "Válido" : "Inválido"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// removemos a definição do OpmeItemForm local, pois agora importamos de @/components/opme/opme-item-form

const SuppliersList = ({ suppliers, opmeItem, allSuppliers, onAddSupplier, onUpdateSupplier, onRemoveSupplier }: {
  suppliers: OpmeSupplier[],
  opmeItem: OpmeItem,
  allSuppliers: Supplier[],
  onAddSupplier: (data: z.infer<typeof OpmeSupplierFormSchema>) => void,
  onUpdateSupplier: (id: number, data: Partial<z.infer<typeof OpmeSupplierFormSchema>>) => void,
  onRemoveSupplier: (id: number) => void
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<OpmeSupplier | null>(null);
  const { toast } = useToast();

  // Mapeando o id do fornecedor para o nome comercial
  const supplierMap = allSuppliers.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<number, Supplier>);

  const handleAddSupplier = () => {
    setCurrentSupplier(null);
    setIsAddDialogOpen(true);
  };

  const handleEditSupplier = (supplier: OpmeSupplier) => {
    setCurrentSupplier(supplier);
    setIsAddDialogOpen(true);
  };

  const handlePreferredToggle = (supplier: OpmeSupplier) => {
    onUpdateSupplier(supplier.id, { isPreferred: !supplier.isPreferred });
  };

  const handleActiveToggle = (supplier: OpmeSupplier) => {
    onUpdateSupplier(supplier.id, { active: !supplier.active });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Fornecedores de {opmeItem.commercialName}</h2>
        <Button onClick={handleAddSupplier}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Fornecedor
        </Button>
      </div>
      {suppliers.length === 0 ? (
        <div className="py-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium mb-2">Nenhum fornecedor encontrado</p>
          <p className="text-muted-foreground mb-6">Este item OPME não tem fornecedores associados.</p>
          <Button onClick={handleAddSupplier}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Fornecedor
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Nome Comercial</TableHead>
              <TableHead>Registro ANVISA</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="text-center">Preferencial</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id} className={!supplier.active ? "opacity-50" : ""}>
                <TableCell>
                  {supplierMap[supplier.supplierId]?.tradeName || `Fornecedor #${supplier.supplierId}`}
                </TableCell>
                <TableCell>{supplier.commercialDescription || opmeItem.commercialName}</TableCell>
                <TableCell>{supplier.registrationAnvisa || "-"}</TableCell>
                <TableCell>{supplier.unitPrice ? formatCurrency(supplier.unitPrice) : "-"}</TableCell>
                <TableCell className="text-center">
                  <button 
                    onClick={() => handlePreferredToggle(supplier)}
                    className="mx-auto block"
                  >
                    {supplier.isPreferred ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={supplier.active ? "outline" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => handleActiveToggle(supplier)}
                  >
                    {supplier.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditSupplier(supplier)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (confirm("Tem certeza que deseja remover este fornecedor?")) {
                          onRemoveSupplier(supplier.id);
                        }
                      }}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <OpmeSupplierForm 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        initialData={currentSupplier || { opmeItemId: opmeItem.id }}
        opmeItem={opmeItem}
        suppliers={allSuppliers}
        onSave={(data) => {
          if (currentSupplier) {
            onUpdateSupplier(currentSupplier.id, data);
          } else {
            onAddSupplier(data);
          }
          setIsAddDialogOpen(false);
        }}
      />
    </div>
  );
};

const OpmeSupplierForm = ({ 
  isOpen, 
  onClose, 
  initialData, 
  opmeItem,
  suppliers,
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  initialData: Partial<OpmeSupplier> | undefined,
  opmeItem: OpmeItem,
  suppliers: Supplier[],
  onSave: (data: z.infer<typeof OpmeSupplierFormSchema>) => void
}) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof OpmeSupplierFormSchema>>({
    resolver: zodResolver(OpmeSupplierFormSchema),
    defaultValues: {
      opmeItemId: opmeItem.id,
      supplierId: initialData?.supplierId || 0,
      registrationAnvisa: initialData?.registrationAnvisa || "",
      commercialDescription: initialData?.commercialDescription || "",
      isPreferred: initialData?.isPreferred || false,
      unitPrice: initialData?.unitPrice || null,
      deliveryTimeDays: initialData?.deliveryTimeDays || null,
      minimumQuantity: initialData?.minimumQuantity || 1,
      notes: initialData?.notes || "",
      active: initialData?.active !== undefined ? initialData.active : true,
    },
  });

  function onSubmit(values: z.infer<typeof OpmeSupplierFormSchema>) {
    if (!values.supplierId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um fornecedor.",
      });
      return;
    }
    onSave({
      ...values,
      unitPrice: values.unitPrice === 0 ? null : values.unitPrice,
      deliveryTimeDays: values.deliveryTimeDays === 0 ? null : values.deliveryTimeDays,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? "Editar" : "Adicionar"} Fornecedor para {opmeItem.commercialName}</DialogTitle>
          <DialogDescription>
            {initialData?.id 
              ? "Atualize as informações do fornecedor para este item OPME." 
              : "Associe um fornecedor a este item OPME."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor*</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value ? String(field.value) : ""}
                    disabled={!!initialData?.id}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um fornecedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers
                        .filter(s => s.active)
                        .map((supplier) => (
                          <SelectItem 
                            key={supplier.id} 
                            value={String(supplier.id)}
                          >
                            {supplier.tradeName} ({supplier.companyName})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationAnvisa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registro ANVISA</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commercialDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Comercial</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder={opmeItem.commercialName} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Unitário</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        {...field} 
                        value={field.value === null ? "" : field.value}
                        onChange={(e) => {
                          const value = e.target.value === "" ? null : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryTimeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo de Entrega (dias)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field} 
                        value={field.value === null ? "" : field.value}
                        onChange={(e) => {
                          const value = e.target.value === "" ? null : parseInt(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minimumQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade Mínima</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field} 
                        value={field.value === null ? "1" : field.value}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="Observações sobre o fornecedor e este produto"
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex flex-col gap-4 sm:flex-row justify-between">
              <FormField
                control={form.control}
                name="isPreferred"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Fornecedor Preferencial</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Marque esta opção para indicar que este é o fornecedor preferencial para este item OPME.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Fornecedor Ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque esta opção para tornar o fornecedor inativo para este item OPME.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default function OpmeCatalog() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OpmeItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Queries com lazy loading (só carrega após busca)
  const { 
    data: opmeItems = [], 
    isLoading: isLoadingItems,
    refetch: refetchItems
  } = useQuery<OpmeItem[]>({
    queryKey: ["/api/opme-items", searchTerm],
    queryFn: async () => {
      try {
        let url = "/api/opme-items";
        if (searchTerm) {
          url += `?search=${encodeURIComponent(searchTerm)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch OPME items");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching OPME items:", error);
        return [];
      }
    },
    enabled: false, // Não carrega automaticamente
  });

  const { 
    data: suppliers = [], 
    isLoading: isLoadingSuppliers 
  } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/suppliers?active=true");
        if (!response.ok) {
          throw new Error("Failed to fetch suppliers");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    },
  });

  const { 
    data: selectedItemWithSuppliers,
    isLoading: isLoadingSupplierDetails,
    refetch: refetchSupplierDetails
  } = useQuery<OpmeWithSuppliers>({
    queryKey: ["/api/opme-items", selectedItemId, "suppliers"],
    queryFn: async () => {
      if (!selectedItemId) return null;
      const response = await fetch(`/api/opme-items/${selectedItemId}/suppliers`);
      if (!response.ok) {
        throw new Error("Failed to fetch OPME item with suppliers");
      }
      return response.json();
    },
    enabled: !!selectedItemId,
  });

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: async (data: OpmeItemFormValues) => {
      try {
        console.log("Tentando criar item OPME:", data);
        
        const response = await fetch("/api/opme-items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Erro ao criar item OPME:", errorData);
          throw new Error(errorData.message || "Falha ao criar item OPME");
        }

        const result = await response.json();
        console.log("Item OPME criado com sucesso:", result);
        return result;
      } catch (error) {
        console.error("Exceção ao criar item OPME:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Mutation concluída com sucesso:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/opme-items"] });
      toast({
        title: "Item OPME adicionado",
        description: "O item OPME foi adicionado com sucesso.",
      });
      setIsFormOpen(false);
    },
    onError: (error) => {
      console.error("Mutation falhou:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível adicionar o item OPME.",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: { id: number; updates: OpmeItemFormValues }) => {
      const response = await fetch(`/api/opme-items/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data.updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update OPME item");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opme-items"] });
      if (selectedItemId) {
        queryClient.invalidateQueries({ queryKey: ["/api/opme-items", selectedItemId, "suppliers"] });
      }
      toast({
        title: "Item OPME atualizado",
        description: "O item OPME foi atualizado com sucesso.",
      });
      setIsFormOpen(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar o item OPME.",
      });
    },
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (data: z.infer<typeof OpmeSupplierFormSchema>) => {
      const response = await fetch(`/api/opme-items/${data.opmeItemId}/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add supplier");
      }

      return await response.json();
    },
    onSuccess: () => {
      refetchSupplierDetails();
      toast({
        title: "Fornecedor adicionado",
        description: "O fornecedor foi associado ao item OPME com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível adicionar o fornecedor.",
      });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof OpmeSupplierFormSchema>> }) => {
      const response = await fetch(`/api/opme-suppliers/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update supplier");
      }

      return await response.json();
    },
    onSuccess: () => {
      refetchSupplierDetails();
      toast({
        title: "Fornecedor atualizado",
        description: "As informações do fornecedor foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar o fornecedor.",
      });
    },
  });

  const removeSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/opme-suppliers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove supplier");
      }

      return true;
    },
    onSuccess: () => {
      refetchSupplierDetails();
      toast({
        title: "Fornecedor removido",
        description: "O fornecedor foi desvinculado do item OPME com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível remover o fornecedor.",
      });
    },
  });

  // Estado para controlar se a busca já foi realizada
  const [hasSearched, setHasSearched] = useState(false);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    refetchItems();
  };

  const handleOpenForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: OpmeItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleViewSuppliers = (itemId: number) => {
    setSelectedItemId(itemId);
    setIsSupplierDialogOpen(true);
  };

  const handleSaveItem = (data: OpmeItemFormValues) => {
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, updates: data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const handleAddSupplier = (data: z.infer<typeof OpmeSupplierFormSchema>) => {
    addSupplierMutation.mutate(data);
  };

  const handleUpdateSupplier = (id: number, data: Partial<z.infer<typeof OpmeSupplierFormSchema>>) => {
    updateSupplierMutation.mutate({ id, data });
  };

  const handleRemoveSupplier = (id: number) => {
    removeSupplierMutation.mutate(id);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Catálogo OPME</h1>
        <Button onClick={handleOpenForm}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Buscar itens OPME..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </div>
      </form>

      {!hasSearched ? (
        <div className="py-16 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium mb-2">Busque no Catálogo OPME</h3>
          <p className="text-muted-foreground mb-6">
            Utilize a barra de busca acima para encontrar itens OPME no catálogo.
            Você pode pesquisar por nome técnico, nome comercial ou fabricante.
          </p>
          <p className="text-sm text-muted-foreground">
            Ou adicione um novo item ao catálogo clicando no botão "Adicionar Item".
          </p>
        </div>
      ) : isLoadingItems ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : opmeItems.length === 0 ? (
        <div className="py-16 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium mb-2">Nenhum item OPME encontrado</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm ? "Nenhum resultado para sua busca. Tente outros termos." : "Comece adicionando seu primeiro item OPME ao catálogo."}
          </p>
          <Button onClick={handleOpenForm}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Item
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Exibindo {opmeItems.length} {opmeItems.length === 1 ? 'item' : 'itens'} no catálogo
            {searchTerm ? ` para a busca "${searchTerm}"` : ''}
          </p>
          {opmeItems.map((item) => (
            <OpmeItem 
              key={item.id} 
              item={item} 
              onEdit={handleEditItem}
              onViewSuppliers={handleViewSuppliers}
            />
          ))}
        </div>
      )}

      {/* Formulário de item OPME usando o componente importado */}
      <OpmeItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingItem}
        onSave={handleSaveItem}
        isSubmitting={createItemMutation.isPending || updateItemMutation.isPending}
      />

      {/* Dialog de fornecedores */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {isLoadingSupplierDetails ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedItemWithSuppliers ? (
            <SuppliersList 
              suppliers={selectedItemWithSuppliers.suppliers}
              opmeItem={selectedItemWithSuppliers.opmeItem}
              allSuppliers={suppliers}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onRemoveSupplier={handleRemoveSupplier}
            />
          ) : (
            <div className="py-4 text-center">
              <p>Nenhum item selecionado</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}