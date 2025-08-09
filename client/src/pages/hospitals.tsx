import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash, 
  Save,
  X
} from "lucide-react";
import type { Hospital } from "@shared/schema";
import { HospitalLogoCropUpload } from "@/components/hospital-logo-crop-upload";
import { uploadHospitalLogo } from "@/lib/hospital-utils";

type BrazilianState = {
  id: number;
  stateCode: string;
  name: string;
  ibgeCode: number;
  region: string;
};

type Municipality = {
  id: number;
  name: string;
  ibgeCode: number;
  stateId: number;
  createdAt: string;
};

export default function Hospitals() {
  const { toast } = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [brazilianStates, setBrazilianStates] = useState<BrazilianState[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentHospital, setCurrentHospital] = useState<Hospital | null>(null);
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formBusinessName, setFormBusinessName] = useState("");
  const [formCNPJ, setFormCNPJ] = useState("");
  const [formCNES, setFormCNES] = useState("");
  const [formIbgeStateCode, setFormIbgeStateCode] = useState<number>(33); // Rio de Janeiro
  const [formIbgeCityCode, setFormIbgeCityCode] = useState<number | null>(null);
  const [formCEP, setFormCEP] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formLogoFile, setFormLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  useEffect(() => {
    fetchHospitals();
    fetchBrazilianStates();
  }, []);

  // Fetch municipalities when state changes
  useEffect(() => {
    if (formIbgeStateCode) {
      fetchMunicipalities(formIbgeStateCode);
    }
  }, [formIbgeStateCode]);

  // Helper function to get city name from IBGE code
  const getCityNameFromIbgeCode = (ibgeCityCode: number | null): string => {
    if (!ibgeCityCode) return "Não informado";
    const city = municipalities.find(m => m.ibgeCode === ibgeCityCode);
    return city ? city.name : "Cidade não encontrada";
  };

  // Helper function to get state name from IBGE code
  const getStateNameFromIbgeCode = (ibgeStateCode: number): string => {
    const state = brazilianStates.find(s => s.ibgeCode === ibgeStateCode);
    return state ? state.name : "Estado não encontrado";
  };

  const fetchBrazilianStates = async () => {
    try {
      const response = await fetch("/api/brazilian-states", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar estados: ${response.status}`);
      }
      
      const states = await response.json();
      setBrazilianStates(states);
    } catch (error) {
      console.error("Erro ao carregar estados brasileiros:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de estados",
        variant: "destructive",
      });
    }
  };

  const fetchMunicipalities = async (stateIbgeCode: number, preserveCity = false) => {
    try {
      const response = await fetch(`/api/municipalities/by-state/${stateIbgeCode}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Falha ao carregar municípios");
      }

      const data = await response.json();
      setMunicipalities(data);
      
      // Only reset city selection when creating new hospitals, not when editing
      if (!preserveCity) {
        setFormIbgeCityCode(null);
      }
    } catch (error) {
      console.error("Erro ao carregar municípios:", error);
      setMunicipalities([]);
      if (!preserveCity) {
        setFormIbgeCityCode(null);
      }
    }
  };
  
  const fetchHospitals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/hospitals", {
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
      console.log("Hospitais carregados:", data);
      
      // Ordenar hospitais por nome em ordem alfabética, limpando espaços extras
      const sortedHospitals = [...data].sort((a, b) => {
        // Limpar espaços no início e fim, e remover caracteres de tabulação
        const nameA = a.name.trim().replace(/\t/g, '');
        const nameB = b.name.trim().replace(/\t/g, '');
        
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      });
      
      console.log("Hospitais ordenados alfabeticamente:", sortedHospitals);
      setHospitals(sortedHospitals);
    } catch (err) {
      setError("Erro ao carregar hospitais. Tente novamente mais tarde.");
      console.error("Error fetching hospitals:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenCreate = () => {
    setFormName("");
    setFormBusinessName("");
    setFormCNPJ("");
    setFormCNES("");
    setFormIbgeStateCode(33); // Rio de Janeiro default
    setFormIbgeCityCode(null);
    setFormCEP("");
    setFormAddress("");
    setFormNumber("");
    setFormLogoUrl("");
    setFormLogoFile(null);
    setOpenCreateDialog(true);
  };
  
  const handleOpenEdit = async (hospital: Hospital) => {
    setCurrentHospital(hospital);
    setFormName(hospital.name);
    setFormBusinessName(hospital.businessName || "");
    setFormCNPJ(hospital.cnpj);
    setFormCNES(hospital.cnes || "");
    setFormCEP(hospital.cep || "");
    setFormAddress(hospital.address || "");
    setFormNumber(hospital.number?.toString() || "");
    setFormLogoUrl(hospital.logoUrl || "");
    setFormLogoFile(null);
    
    // Set state and load municipalities while preserving the city
    const stateCode = hospital.ibgeStateCode || 33;
    setFormIbgeStateCode(stateCode);
    
    // Load municipalities for the state while preserving the city selection
    if (stateCode) {
      await fetchMunicipalities(stateCode, true); // true = preserve city selection
    }
    
    // Set city after municipalities are loaded
    setFormIbgeCityCode(hospital.ibgeCityCode || null);
    
    setOpenEditDialog(true);
  };
  
  const handleCreate = async () => {
    // Validar CNPJ antes de enviar ao servidor
    if (formCNPJ.length > 0 && !validateCNPJ(formCNPJ)) {
      toast({
        title: "CNPJ inválido",
        description: "Por favor, verifique se o CNPJ está correto.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Primeiro, criamos o registro do hospital
      const hospital = await apiRequest("/api/hospitals", "POST", {
        name: formName,
        businessName: formBusinessName || null,
        cnpj: formCNPJ,
        cnes: formCNES || null,

        ibgeStateCode: formIbgeStateCode,
        ibgeCityCode: formIbgeCityCode,
        cep: formCEP || null,
        address: formAddress || null,
        number: formNumber ? parseInt(formNumber) : null,
        logoUrl: null // Inicialmente sem logo
      });
      
      // Se temos um arquivo de logo para upload, fazemos isso agora
      if (formLogoFile) {
        setUploadingLogo(true);
        // Upload do logo
        const logoUrl = await uploadHospitalLogo(hospital.id, formLogoFile);
        setUploadingLogo(false);
        
        if (logoUrl) {
          // Atualiza o registro do hospital com a URL do logo
          try {
            await apiRequest(`/api/hospitals/${hospital.id}`, "PUT", {
              logoUrl: logoUrl
            });
          } catch (error) {
            console.error("Falha ao atualizar hospital com logoUrl:", error);
          }
        }
      }
      
      setOpenCreateDialog(false);
      toast({
        title: "Hospital criado",
        description: "O hospital foi adicionado com sucesso."
      });
      
      // Refresh data
      fetchHospitals();
    } catch (error) {
      console.error("Error creating hospital:", error);
      toast({
        title: "Erro ao criar hospital",
        description: "Não foi possível adicionar o hospital. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const handleUpdate = async () => {
    if (!currentHospital) return;
    
    // Validar CNPJ antes de enviar ao servidor
    if (formCNPJ.length > 0 && !validateCNPJ(formCNPJ)) {
      toast({
        title: "CNPJ inválido",
        description: "Por favor, verifique se o CNPJ está correto.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Se temos um arquivo de logo para upload, fazemos isso primeiro
      let logoUrlToUse = formLogoUrl;
      
      if (formLogoFile) {
        setUploadingLogo(true);
        // Upload do logo
        const uploadedLogoUrl = await uploadHospitalLogo(
          currentHospital.id, 
          formLogoFile,
          formLogoUrl
        );
        setUploadingLogo(false);
        
        if (uploadedLogoUrl) {
          logoUrlToUse = uploadedLogoUrl;
        }
      }
      
      // Agora atualizamos o hospital com todos os dados, incluindo a URL do logo
      // Usando fetch diretamente e adaptando os nomes dos campos para o formato do banco (snake_case)
      const response = await fetch(`/api/hospitals/${currentHospital.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formName,
          businessName: formBusinessName || null,
          cnpj: formCNPJ,
          cnes: formCNES || null,
          ibgeStateCode: formIbgeStateCode,
          ibgeCityCode: formIbgeCityCode,
          cep: formCEP || null,
          address: formAddress || null,
          number: formNumber ? parseInt(formNumber) : null,
          logoUrl: logoUrlToUse || null
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      // Obter o hospital atualizado da resposta
      const updatedHospital = await response.json();
      
      // Atualizar diretamente o estado dos hospitais
      setHospitals(prevHospitals => 
        prevHospitals.map(h => 
          h.id === updatedHospital.id ? updatedHospital : h
        )
      );
      
      setOpenEditDialog(false);
      toast({
        title: "Hospital atualizado",
        description: "As informações do hospital foram atualizadas com sucesso."
      });
      
      // Buscar todos os hospitais novamente para garantir dados atualizados
      fetchHospitals();
    } catch (error) {
      console.error("Error updating hospital:", error);
      toast({
        title: "Erro ao atualizar hospital",
        description: "Não foi possível atualizar as informações do hospital. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este hospital?")) return;
    
    try {
      await apiRequest(`/api/hospitals/${id}`, "DELETE");
      
      toast({
        title: "Hospital excluído",
        description: "O hospital foi removido com sucesso."
      });
      
      // Refresh data
      fetchHospitals();
    } catch (error) {
      console.error("Error deleting hospital:", error);
      toast({
        title: "Erro ao excluir hospital",
        description: "Não foi possível excluir o hospital. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // Valida CNPJ usando o algoritmo oficial brasileiro
  const validateCNPJ = (cnpj: string): boolean => {
    try {
      // Remover caracteres não numéricos
      cnpj = cnpj.replace(/\D/g, '');
      
      // Debug
      console.log("CNPJ para validação:", cnpj);
      
      // CNPJ deve ter 14 dígitos
      if (cnpj.length !== 14) {
        console.log("CNPJ não tem 14 dígitos");
        return false;
      }
      
      // Verificar se todos os dígitos são iguais (ex: 00000000000000)
      if (/^(\d)\1+$/.test(cnpj)) {
        console.log("CNPJ com dígitos repetidos");
        return false;
      }
      
      // Tabela de multiplicadores para verificação
      const tableFirstDigit = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const tableSecondDigit = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      
      // Cálculo do primeiro dígito verificador
      let sum = 0;
      
      for (let i = 0; i < 12; i++) {
        sum += parseInt(cnpj.charAt(i)) * tableFirstDigit[i];
      }
      
      let firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      console.log("Primeiro dígito calculado:", firstDigit);
      console.log("Primeiro dígito no CNPJ:", parseInt(cnpj.charAt(12)));
      
      if (firstDigit !== parseInt(cnpj.charAt(12))) {
        console.log("Primeiro dígito verificador inválido");
        return false;
      }
      
      // Cálculo do segundo dígito verificador
      sum = 0;
      
      for (let i = 0; i < 13; i++) {
        sum += parseInt(cnpj.charAt(i)) * tableSecondDigit[i];
      }
      
      let secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      console.log("Segundo dígito calculado:", secondDigit);
      console.log("Segundo dígito no CNPJ:", parseInt(cnpj.charAt(13)));
      
      if (secondDigit !== parseInt(cnpj.charAt(13))) {
        console.log("Segundo dígito verificador inválido");
        return false;
      }
      
      console.log("CNPJ válido!");
      return true;
    } catch (error) {
      console.error("Erro na validação do CNPJ:", error);
      return false;
    }
  };

  // Format CNPJ in the format XX.XXX.XXX/XXXX-XX
  const formatCNPJ = (cnpj: string) => {
    const numericCNPJ = cnpj.replace(/\D/g, '');
    if (numericCNPJ.length !== 14) return cnpj;
    return numericCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };
  
  // Handle CNPJ input with formatting
  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters
    const numericValue = e.target.value.replace(/\D/g, '');
    
    // Limit to 14 digits
    if (numericValue.length > 14) return;
    
    setFormCNPJ(numericValue);
  };
  
  // Handle CNES input (limit to 7 digits)
  const handleCNESChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters
    const numericValue = e.target.value.replace(/\D/g, '');
    
    // Limit to 7 digits
    if (numericValue.length > 7) return;
    
    setFormCNES(numericValue);
  };
  
  // Format CEP in the format XXXXX-XXX
  const formatCEP = (cep: string) => {
    const numericCEP = cep.replace(/\D/g, '');
    if (numericCEP.length !== 8) return cep;
    return numericCEP.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  };
  
  // Handle CEP input with formatting
  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters
    const numericValue = e.target.value.replace(/\D/g, '');
    
    // Limit to 8 digits
    if (numericValue.length > 8) return;
    
    setFormCEP(numericValue);
  };
  
  // Handle number input (ensure it's numeric)
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters
    const numericValue = e.target.value.replace(/\D/g, '');
    setFormNumber(numericValue);
  };
  
  // Manipula o arquivo de logo selecionado
  const handleLogoFileChange = (file: File | null) => {
    setFormLogoFile(file);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[#1a2332]">
      <main className="flex-grow overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Gestão de Hospitais</h2>
              <p className="text-blue-300">
                Cadastre e gerencie os hospitais onde os procedimentos são realizados
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Novo Hospital
            </Button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-2">Hospitais Cadastrados</h3>
            <p className="text-sm text-blue-300 mb-4">
              Visualize e gerencie os hospitais no sistema
            </p>
              
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="h-12 w-full bg-blue-900/20 animate-pulse rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-red-300 mb-2">{error}</p>
                <p className="text-sm text-blue-300">
                  Tente novamente mais tarde
                </p>
              </div>
            ) : hospitals.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-blue-300 mb-2">Nenhum hospital encontrado</p>
                <p className="text-sm text-blue-300/70">
                  Clique em "Novo Hospital" para adicionar um registro ao sistema
                </p>
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-slate-800/50 border-slate-700">
                        <TableHead className="text-blue-300">Hospital</TableHead>
                        <TableHead className="text-blue-300">CNPJ</TableHead>
                        <TableHead className="text-blue-300">Localização</TableHead>
                        <TableHead className="text-blue-300 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hospitals.map((hospital) => (
                        <TableRow key={hospital.id} className="hover:bg-slate-800/50 border-slate-700">
                          <TableCell className="text-white font-medium">
                            <div className="flex items-center gap-3">
                              {hospital.logoUrl ? (
                                <div className="w-10 h-10 rounded bg-white flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={hospital.logoUrl} 
                                    alt={hospital.name} 
                                    className="max-w-full max-h-full object-contain" 
                                    onError={(e) => {
                                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%230a558c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='12' y1='8' x2='12' y2='16'%3E%3C/line%3E%3Cline x1='8' y1='12' x2='16' y2='12'%3E%3C/line%3E%3C/svg%3E";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded bg-blue-900/30 flex items-center justify-center">
                                  <Building2 className="h-5 w-5 text-blue-300" />
                                </div>
                              )}
                              <div>
                                <div>{hospital.name}</div>
                                <div className="text-xs text-blue-300/70">
                                  {hospital.businessName || ""}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {formatCNPJ(hospital.cnpj)}
                            <div className="text-xs text-blue-300/70">
                              CNES: {hospital.cnes || "Não informado"}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {getCityNameFromIbgeCode(hospital.ibgeCityCode)}
                            <div className="text-xs text-blue-300/70">
                              {getStateNameFromIbgeCode(hospital.ibgeStateCode)}
                            </div>
                            <div className="text-xs text-blue-300/70">
                              {hospital.address ? `${hospital.address}, ${hospital.number || "S/N"}` : ""}
                              {hospital.cep ? ` - CEP ${formatCEP(hospital.cep)}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 px-2 text-blue-300 border-blue-800"
                                onClick={() => handleOpenEdit(hospital)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only md:not-sr-only md:ml-2">Editar</span>
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-red-300 border-red-900/50 hover:bg-red-900/20 hover:text-red-200"
                                onClick={() => handleDelete(hospital.id)}
                              >
                                <Trash className="h-4 w-4" />
                                <span className="sr-only md:not-sr-only md:ml-2">Excluir</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      {/* Create Hospital Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          
          <DialogHeader>
            <DialogTitle>Adicionar Novo Hospital</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo hospital no sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Seção de upload de logo */}
            <HospitalLogoCropUpload 
              logoUrl={formLogoUrl} 
              onLogoChange={(url) => setFormLogoUrl(url || "")}
              inputId="create-logo"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primeira coluna */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Hospital</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Hospital São Lucas"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="businessName">Nome Empresarial</Label>
                  <Input
                    id="businessName"
                    value={formBusinessName}
                    onChange={(e) => setFormBusinessName(e.target.value)}
                    placeholder="Ex: Hospital São Lucas LTDA"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formCNPJ}
                    onChange={handleCNPJChange}
                    placeholder="Ex: 12345678000110"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formCNPJ.length > 0 ? `Formatado: ${formatCNPJ(formCNPJ)}` : ""}
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="cnes">CNES (Código Nacional de Estabelecimento de Saúde)</Label>
                  <Input
                    id="cnes"
                    value={formCNES}
                    onChange={handleCNESChange}
                    placeholder="Ex: 1234567"
                  />
                </div>
              </div>
              
              {/* Segunda coluna */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="uf">Estado</Label>
                  <Select 
                    value={formIbgeStateCode.toString()} 
                    onValueChange={(value) => {
                      const selectedState = brazilianStates.find(state => state.ibgeCode.toString() === value);
                      if (selectedState) {
                        setFormIbgeStateCode(selectedState.ibgeCode);
                      }
                    }}
                  >
                    <SelectTrigger id="uf">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map((state) => (
                        <SelectItem key={state.id} value={state.ibgeCode.toString()}>
                          {state.name} ({state.stateCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Select 
                    value={formIbgeCityCode?.toString() || ""} 
                    onValueChange={(value) => setFormIbgeCityCode(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger id="city">
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {municipalities.length > 0 ? (
                        municipalities.map((municipality) => (
                          <SelectItem key={municipality.id} value={municipality.ibgeCode.toString()}>
                            {municipality.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-cities" disabled>
                          Nenhuma cidade disponível para este estado
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formCEP}
                    onChange={handleCEPChange}
                    placeholder="Ex: 20000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formCEP.length > 0 ? `Formatado: ${formatCEP(formCEP)}` : ""}
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Ex: Rua das Flores"
                    />
                  </div>
                  <div>
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={formNumber}
                      onChange={handleNumberChange}
                      placeholder="Ex: 123"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenCreateDialog(false)}
              className="mr-2"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={uploadingLogo}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {uploadingLogo ? "Enviando..." : "Salvar Hospital"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Hospital Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          
          <DialogHeader>
            <DialogTitle>Editar Hospital</DialogTitle>
            <DialogDescription>
              Atualize as informações do hospital.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Seção de upload de logo */}
            <HospitalLogoCropUpload 
              logoUrl={formLogoUrl} 
              onLogoChange={(url) => setFormLogoUrl(url || "")}
              inputId="edit-logo"
              hospitalId={currentHospital?.id}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primeira coluna */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nome do Hospital</Label>
                  <Input
                    id="edit-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-businessName">Nome Empresarial</Label>
                  <Input
                    id="edit-businessName"
                    value={formBusinessName}
                    onChange={(e) => setFormBusinessName(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-cnpj">CNPJ</Label>
                  <Input
                    id="edit-cnpj"
                    value={formCNPJ}
                    onChange={handleCNPJChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formCNPJ.length > 0 ? `Formatado: ${formatCNPJ(formCNPJ)}` : ""}
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-cnes">CNES</Label>
                  <Input
                    id="edit-cnes"
                    value={formCNES}
                    onChange={handleCNESChange}
                  />
                </div>
              </div>
              
              {/* Segunda coluna */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-uf">Estado</Label>
                  <Select 
                    value={formIbgeStateCode.toString()} 
                    onValueChange={(value) => {
                      const selectedState = brazilianStates.find(state => state.ibgeCode.toString() === value);
                      if (selectedState) {
                        setFormIbgeStateCode(selectedState.ibgeCode);
                      }
                    }}
                  >
                    <SelectTrigger id="edit-uf">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map((state) => (
                        <SelectItem key={state.id} value={state.ibgeCode.toString()}>
                          {state.name} ({state.stateCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-city">Cidade</Label>
                  <Select 
                    value={formIbgeCityCode?.toString() || ""} 
                    onValueChange={(value) => setFormIbgeCityCode(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger id="edit-city">
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {municipalities.length > 0 ? (
                        municipalities.map((municipality) => (
                          <SelectItem key={municipality.id} value={municipality.ibgeCode.toString()}>
                            {municipality.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-cities-edit" disabled>
                          Nenhuma cidade disponível para este estado
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-cep">CEP</Label>
                  <Input
                    id="edit-cep"
                    value={formCEP}
                    onChange={handleCEPChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formCEP.length > 0 ? `Formatado: ${formatCEP(formCEP)}` : ""}
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor="edit-address">Endereço</Label>
                    <Input
                      id="edit-address"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-number">Número</Label>
                    <Input
                      id="edit-number"
                      value={formNumber}
                      onChange={handleNumberChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenEditDialog(false)}
              className="mr-2"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={uploadingLogo}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {uploadingLogo ? "Enviando..." : "Atualizar Hospital"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}