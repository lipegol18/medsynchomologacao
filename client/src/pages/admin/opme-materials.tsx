import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Search, Package, Building2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function OpmeMaterials() {
  const { toast } = useToast();
  const [opmeItems, setOpmeItems] = useState<OpmeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState<OpmeItem | null>(null);

  // Form states usando a estrutura padrão
  const [formTechnicalName, setFormTechnicalName] = useState("");
  const [formCommercialName, setFormCommercialName] = useState("");
  const [formManufacturerName, setFormManufacturerName] = useState("");
  const [formAnvisaRegistrationNumber, setFormAnvisaRegistrationNumber] = useState("");
  const [formProcessNumber, setFormProcessNumber] = useState("");
  const [formRiskClass, setFormRiskClass] = useState("");
  const [formHolderCnpj, setFormHolderCnpj] = useState("");
  const [formRegistrationHolder, setFormRegistrationHolder] = useState("");
  const [formCountryOfManufacture, setFormCountryOfManufacture] = useState("");
  const [formRegistrationDate, setFormRegistrationDate] = useState("");
  const [formExpirationDate, setFormExpirationDate] = useState("");
  const [formIsValid, setFormIsValid] = useState(true);

  useEffect(() => {
    fetchOpmeItems();
  }, []);

  const fetchOpmeItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/opme-items", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Materiais OPME carregados:", data);
      setOpmeItems(data);
    } catch (err) {
      setError("Erro ao carregar materiais OPME. Tente novamente mais tarde.");
      console.error("Erro ao buscar materiais OPME:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = opmeItems.filter((item: OpmeItem) =>
    item.technicalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.commercialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.manufacturerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.anvisaRegistrationNumber && item.anvisaRegistrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setFormTechnicalName("");
    setFormCommercialName("");
    setFormManufacturerName("");
    setFormAnvisaRegistrationNumber("");
    setFormProcessNumber("");
    setFormRiskClass("");
    setFormHolderCnpj("");
    setFormRegistrationHolder("");
    setFormCountryOfManufacture("");
    setFormRegistrationDate("");
    setFormExpirationDate("");
    setFormIsValid(true);
    setOpenCreateDialog(true);
  };

  const handleOpenEdit = (item: OpmeItem) => {
    setCurrentItem(item);
    setFormTechnicalName(item.technicalName);
    setFormCommercialName(item.commercialName);
    setFormManufacturerName(item.manufacturerName);
    setFormAnvisaRegistrationNumber(item.anvisaRegistrationNumber || "");
    setFormProcessNumber(item.processNumber || "");
    setFormRiskClass(item.riskClass || "");
    setFormHolderCnpj(item.holderCnpj || "");
    setFormRegistrationHolder(item.registrationHolder || "");
    setFormCountryOfManufacture(item.countryOfManufacture || "");
    setFormRegistrationDate(item.registrationDate || "");
    setFormExpirationDate(item.expirationDate || "");
    setFormIsValid(item.isValid);
    setOpenEditDialog(true);
  };

  const handleCreate = async () => {
    if (!formTechnicalName || !formCommercialName || !formManufacturerName) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome técnico, nome comercial e fabricante são obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch("/api/opme-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          technicalName: formTechnicalName,
          commercialName: formCommercialName,
          manufacturerName: formManufacturerName,
          anvisaRegistrationNumber: formAnvisaRegistrationNumber || null,
          processNumber: formProcessNumber || null,
          riskClass: formRiskClass || null,
          holderCnpj: formHolderCnpj || null,
          registrationHolder: formRegistrationHolder || null,
          countryOfManufacture: formCountryOfManufacture || null,
          registrationDate: formRegistrationDate || null,
          expirationDate: formExpirationDate || null,
          isValid: formIsValid,
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      
      const newItem = await response.json();
      console.log("Material OPME criado:", newItem);
      
      setOpmeItems(prev => [...prev, newItem]);
      setOpenCreateDialog(false);
      
      toast({
        title: "Material criado",
        description: "Material OPME criado com sucesso!",
      });
      
    } catch (error: any) {
      console.error("Erro ao criar material OPME:", error);
      toast({
        title: "Erro ao criar material",
        description: error.message || "Ocorreu um erro ao criar o material OPME.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!currentItem) return;
    
    if (!formTechnicalName || !formCommercialName || !formManufacturerName) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome técnico, nome comercial e fabricante são obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/opme-items/${currentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          technicalName: formTechnicalName,
          commercialName: formCommercialName,
          manufacturerName: formManufacturerName,
          anvisaRegistrationNumber: formAnvisaRegistrationNumber || null,
          processNumber: formProcessNumber || null,
          riskClass: formRiskClass || null,
          holderCnpj: formHolderCnpj || null,
          registrationHolder: formRegistrationHolder || null,
          countryOfManufacture: formCountryOfManufacture || null,
          registrationDate: formRegistrationDate || null,
          expirationDate: formExpirationDate || null,
          isValid: formIsValid,
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      
      const updatedItem = await response.json();
      console.log("Material OPME atualizado:", updatedItem);
      
      setOpmeItems(prev => prev.map(item => 
        item.id === currentItem.id ? updatedItem : item
      ));
      setOpenEditDialog(false);
      setCurrentItem(null);
      
      toast({
        title: "Material atualizado",
        description: "Material OPME atualizado com sucesso!",
      });
      
    } catch (error: any) {
      console.error("Erro ao atualizar material OPME:", error);
      toast({
        title: "Erro ao atualizar material",
        description: error.message || "Ocorreu um erro ao atualizar o material OPME.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: OpmeItem) => {
    if (!confirm(`Tem certeza que deseja excluir o material "${item.technicalName}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/opme-items/${item.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      
      setOpmeItems(prev => prev.filter(i => i.id !== item.id));
      
      toast({
        title: "Material excluído",
        description: "Material OPME excluído com sucesso!",
      });
      
    } catch (error: any) {
      console.error("Erro ao excluir material OPME:", error);
      toast({
        title: "Erro ao excluir material",
        description: error.message || "Ocorreu um erro ao excluir o material OPME.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não informado";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Materiais OPME</h1>
          <p className="text-muted-foreground">
            Gerencie os materiais OPME disponíveis no sistema
          </p>
        </div>
        
        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Material OPME</DialogTitle>
              <DialogDescription>
                Preencha as informações do material OPME
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="technicalName">Nome Técnico *</Label>
                  <Input
                    id="technicalName"
                    value={formTechnicalName}
                    onChange={(e) => setFormTechnicalName(e.target.value)}
                    placeholder="Ex: Placa bloqueada de titânio"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="commercialName">Nome Comercial *</Label>
                  <Input
                    id="commercialName"
                    value={formCommercialName}
                    onChange={(e) => setFormCommercialName(e.target.value)}
                    placeholder="Ex: TARGON - Sistema de haste"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="manufacturerName">Fabricante *</Label>
                  <Input
                    id="manufacturerName"
                    value={formManufacturerName}
                    onChange={(e) => setFormManufacturerName(e.target.value)}
                    placeholder="Ex: AESCULAP AG"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="anvisaRegistrationNumber">Registro ANVISA</Label>
                  <Input
                    id="anvisaRegistrationNumber"
                    value={formAnvisaRegistrationNumber}
                    onChange={(e) => setFormAnvisaRegistrationNumber(e.target.value)}
                    placeholder="Ex: 10380700077"
                  />
                </div>
                
                <div>
                  <Label htmlFor="processNumber">Número do Processo</Label>
                  <Input
                    id="processNumber"
                    value={formProcessNumber}
                    onChange={(e) => setFormProcessNumber(e.target.value)}
                    placeholder="Ex: 25351.144193/2020-28"
                  />
                </div>
                
                <div>
                  <Label htmlFor="riskClass">Classe de Risco</Label>
                  <Select value={formRiskClass} onValueChange={setFormRiskClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classe de risco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">Classe I</SelectItem>
                      <SelectItem value="II">Classe II</SelectItem>
                      <SelectItem value="III">Classe III</SelectItem>
                      <SelectItem value="IV">Classe IV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="holderCnpj">CNPJ do Detentor</Label>
                  <Input
                    id="holderCnpj"
                    value={formHolderCnpj}
                    onChange={(e) => setFormHolderCnpj(e.target.value)}
                    placeholder="Ex: 01.234.567/0001-89"
                  />
                </div>
                
                <div>
                  <Label htmlFor="registrationHolder">Detentor do Registro</Label>
                  <Input
                    id="registrationHolder"
                    value={formRegistrationHolder}
                    onChange={(e) => setFormRegistrationHolder(e.target.value)}
                    placeholder="Ex: AESCULAP DO BRASIL LTDA"
                  />
                </div>
                
                <div>
                  <Label htmlFor="countryOfManufacture">País de Origem</Label>
                  <Input
                    id="countryOfManufacture"
                    value={formCountryOfManufacture}
                    onChange={(e) => setFormCountryOfManufacture(e.target.value)}
                    placeholder="Ex: Alemanha"
                  />
                </div>
                
                <div>
                  <Label htmlFor="registrationDate">Data de Registro</Label>
                  <Input
                    id="registrationDate"
                    type="date"
                    value={formRegistrationDate}
                    onChange={(e) => setFormRegistrationDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expirationDate">Data de Validade</Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={formExpirationDate}
                    onChange={(e) => setFormExpirationDate(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isValid"
                    checked={formIsValid}
                    onCheckedChange={setFormIsValid}
                  />
                  <Label htmlFor="isValid">Material Válido</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenCreateDialog(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Criar Material
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome técnico, comercial, fabricante ou registro ANVISA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Lista de Materiais OPME
          </CardTitle>
          <CardDescription>
            {filteredItems.length} material(is) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando materiais...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <Button 
                onClick={fetchOpmeItems} 
                variant="outline" 
                className="mt-4"
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Técnico</TableHead>
                  <TableHead>Nome Comercial</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Registro ANVISA</TableHead>
                  <TableHead>Classe de Risco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: OpmeItem) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.technicalName}
                    </TableCell>
                    <TableCell>
                      {item.commercialName}
                    </TableCell>
                    <TableCell>
                      {item.manufacturerName}
                    </TableCell>
                    <TableCell>
                      {item.anvisaRegistrationNumber || "Não informado"}
                    </TableCell>
                    <TableCell>
                      {item.riskClass || "Não informado"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isValid ? "default" : "destructive"}>
                        {item.isValid ? "Válido" : "Inválido"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum material OPME encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Material OPME</DialogTitle>
            <DialogDescription>
              Altere as informações do material OPME
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editTechnicalName">Nome Técnico *</Label>
                <Input
                  id="editTechnicalName"
                  value={formTechnicalName}
                  onChange={(e) => setFormTechnicalName(e.target.value)}
                  placeholder="Ex: Placa bloqueada de titânio"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="editCommercialName">Nome Comercial *</Label>
                <Input
                  id="editCommercialName"
                  value={formCommercialName}
                  onChange={(e) => setFormCommercialName(e.target.value)}
                  placeholder="Ex: TARGON - Sistema de haste"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="editManufacturerName">Fabricante *</Label>
                <Input
                  id="editManufacturerName"
                  value={formManufacturerName}
                  onChange={(e) => setFormManufacturerName(e.target.value)}
                  placeholder="Ex: AESCULAP AG"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="editAnvisaRegistrationNumber">Registro ANVISA</Label>
                <Input
                  id="editAnvisaRegistrationNumber"
                  value={formAnvisaRegistrationNumber}
                  onChange={(e) => setFormAnvisaRegistrationNumber(e.target.value)}
                  placeholder="Ex: 10380700077"
                />
              </div>
              
              <div>
                <Label htmlFor="editProcessNumber">Número do Processo</Label>
                <Input
                  id="editProcessNumber"
                  value={formProcessNumber}
                  onChange={(e) => setFormProcessNumber(e.target.value)}
                  placeholder="Ex: 25351.144193/2020-28"
                />
              </div>
              
              <div>
                <Label htmlFor="editRiskClass">Classe de Risco</Label>
                <Select value={formRiskClass} onValueChange={setFormRiskClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a classe de risco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">Classe I</SelectItem>
                    <SelectItem value="II">Classe II</SelectItem>
                    <SelectItem value="III">Classe III</SelectItem>
                    <SelectItem value="IV">Classe IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="editHolderCnpj">CNPJ do Detentor</Label>
                <Input
                  id="editHolderCnpj"
                  value={formHolderCnpj}
                  onChange={(e) => setFormHolderCnpj(e.target.value)}
                  placeholder="Ex: 01.234.567/0001-89"
                />
              </div>
              
              <div>
                <Label htmlFor="editRegistrationHolder">Detentor do Registro</Label>
                <Input
                  id="editRegistrationHolder"
                  value={formRegistrationHolder}
                  onChange={(e) => setFormRegistrationHolder(e.target.value)}
                  placeholder="Ex: AESCULAP DO BRASIL LTDA"
                />
              </div>
              
              <div>
                <Label htmlFor="editCountryOfManufacture">País de Origem</Label>
                <Input
                  id="editCountryOfManufacture"
                  value={formCountryOfManufacture}
                  onChange={(e) => setFormCountryOfManufacture(e.target.value)}
                  placeholder="Ex: Alemanha"
                />
              </div>
              
              <div>
                <Label htmlFor="editRegistrationDate">Data de Registro</Label>
                <Input
                  id="editRegistrationDate"
                  type="date"
                  value={formRegistrationDate}
                  onChange={(e) => setFormRegistrationDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="editExpirationDate">Data de Validade</Label>
                <Input
                  id="editExpirationDate"
                  type="date"
                  value={formExpirationDate}
                  onChange={(e) => setFormExpirationDate(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsValid"
                  checked={formIsValid}
                  onCheckedChange={setFormIsValid}
                />
                <Label htmlFor="editIsValid">Material Válido</Label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpenEditDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleEdit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}