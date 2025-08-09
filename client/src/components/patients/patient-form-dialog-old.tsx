import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Patient, HealthInsuranceProvider } from "@shared/schema";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { validateCPF, checkCPFExists, formatCPF } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Scan, 
  CreditCard, 
  User, 
  FileText, 
  Camera,
  Calendar as CalendarIcon,
  X
} from "lucide-react";

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
  initialData?: { cpf?: string };
  onSuccess?: (patient: Patient) => void;
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  initialData = {},
  onSuccess
}: PatientFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDocScanner, setShowDocScanner] = useState(false);
  const [showCardScanner, setShowCardScanner] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = !!patient;
  
  // Buscar lista de operadoras de saúde
  const { data: healthInsuranceProviders = [] } = useQuery<HealthInsuranceProvider[]>({
    queryKey: ['/api/health-insurance-providers'],
    queryFn: async () => {
      const res = await fetch('/api/health-insurance-providers?active=true');
      if (!res.ok) {
        throw new Error('Erro ao buscar operadoras de saúde');
      }
      return res.json();
    }
  });
  
  // Referências para os inputs de arquivo
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const insuranceCardFileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    fullName: patient?.fullName || "",
    cpf: patient?.cpf || initialData.cpf || "",
    birthDate: patient?.birthDate ? new Date(patient.birthDate) : undefined,
    gender: patient?.gender || "",
    email: patient?.email || "",
    phone: patient?.phone || "",
    phone2: patient?.phone2 || "",
    insurance: patient?.insurance || "",
    insuranceNumber: patient?.insuranceNumber || "",
    plan: patient?.plan || "",
    notes: patient?.notes || "",
    isActive: patient?.isActive || false
  });

  // Estado para informações extraídas dos documentos
  const [extractedInfo, setExtractedInfo] = useState<{
    documentType: string;
    extractedData: any;
  } | null>(null);

  // Função para iniciar digitalização de documento
  const handleScanDocument = () => {
    if (!documentFileInputRef.current) return;
    documentFileInputRef.current.click();
  };

  // Função para lidar com a seleção de arquivos para documento
  const handleDocumentFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    processDocumentWithOCR(file);
    
    // Limpar o input
    e.target.value = '';
  };

  // Função para processar documento com OCR
  const processDocumentWithOCR = async (file: File) => {
    try {
      setShowDocScanner(true);
      
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', 'identity');
      
      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Erro ao processar documento');
      }
      
      const result = await response.json();
      
      // Atualizar campos do formulário com dados extraídos
      if (result.extractedData) {
        setFormData(prev => ({
          ...prev,
          ...result.extractedData
        }));
        
        setExtractedInfo({
          documentType: result.documentType,
          extractedData: result.extractedData
        });
      }
      
      toast({
        title: "Documento processado",
        description: "Dados extraídos com sucesso do documento."
      });
      
    } catch (error) {
      console.error('Erro no OCR:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar o documento.",
        variant: "destructive"
      });
    } finally {
      setShowDocScanner(false);
    }
  };

  // Função para processar carteirinha com OCR
  const processInsuranceCardWithOCR = async (file: File) => {
    try {
      setShowCardScanner(true);
      
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', 'insurance');
      
      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Erro ao processar carteirinha');
      }
      
      const result = await response.json();
      
      // Atualizar campos do formulário com dados da carteirinha
      if (result.extractedData) {
        setFormData(prev => ({
          ...prev,
          insurance: result.extractedData.insurance || prev.insurance,
          insuranceNumber: result.extractedData.insuranceNumber || prev.insuranceNumber,
          plan: result.extractedData.plan || prev.plan
        }));
        
        setExtractedInfo({
          documentType: 'Carteirinha de Plano de Saúde',
          extractedData: result.extractedData
        });
      }
      
      toast({
        title: "Carteirinha processada",
        description: "Dados da carteirinha extraídos com sucesso."
      });
      
    } catch (error) {
      console.error('Erro no OCR da carteirinha:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar a carteirinha.",
        variant: "destructive"
      });
    } finally {
      setShowCardScanner(false);
    }
  };

  // Função para lidar com mudanças nos campos
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'birthDate' ? (value ? new Date(value) : undefined) : value
    }));
  };
  
  // Atualizar o formulário quando o paciente mudar
  useEffect(() => {
    if (patient) {
      setFormData({
        fullName: patient.fullName || "",
        cpf: patient.cpf || "",
        birthDate: patient.birthDate ? new Date(patient.birthDate) : undefined,
        gender: patient.gender || "",
        email: patient.email || "",
        phone: patient.phone || "",
        phone2: patient.phone2 || "",
        insurance: patient.insurance || "",
        insuranceNumber: patient.insuranceNumber || "",
        plan: patient.plan || "",
        notes: patient.notes || "",
        isActive: patient.isActive || false
      });
    }
  }, [patient]);

  // Função para validar CPF
  const validateCPFInput = (cpf: string) => {
    if (!cpf) return '';
    
    // Validar formato do CPF
    if (!validateCPF(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
        variant: "destructive"
      });
      return 'CPF inválido';
    }
    
    return '';
  };

  // Função para validar data de nascimento
  const validateBirthDate = (date: string) => {
    if (!date) return '';
    
    const birthDate = new Date(date);
    const today = new Date();
    
    if (birthDate > today) {
      toast({
        title: "Data inválida",
        description: "A data de nascimento não pode ser no futuro.",
        variant: "destructive"
      });
      return 'Data inválida';
    }
    
    return '';
  };

  // Função para submeter o formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validar CPF
      const cpfError = validateCPFInput(formData.cpf);
      if (cpfError) {
        setIsSubmitting(false);
        return;
      }
      
      const birthDateError = validateBirthDate(formData.birthDate ? format(formData.birthDate, 'yyyy-MM-dd') : '');
      if (birthDateError) {
        setIsSubmitting(false);
        return;
      }
      
      // Preparar dados para envio
      const dataToSend = {
        ...formData,
        cpf: formatCPF(formData.cpf),
        birthDate: formData.birthDate ? format(formData.birthDate, 'yyyy-MM-dd') : '',
        gender: formData.gender
      };
      
      // Determinar URL e método baseado no modo de edição
      const url = isEditMode && patient ? `/api/patients/${patient.id}` : '/api/patients';
      const method = isEditMode && patient ? 'PUT' : 'POST';
      
      // Enviar dados
      const result = await apiRequest(url, method, dataToSend);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      toast({
        title: isEditMode ? "Paciente atualizado" : "Paciente cadastrado",
        description: `${formData.fullName} foi ${isEditMode ? 'atualizado' : 'cadastrado'} com sucesso.`,
      });
      
      if (onOpenChange) {
        onOpenChange(false);
      }
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o paciente. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar Paciente" : "Novo Paciente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção de Digitalização de Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5" />
                Digitalização de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Documento de Identidade */}
                <div className="space-y-2">
                  <h3 className="font-medium">Documento de Identidade</h3>
                  <div className="flex flex-col space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleScanDocument}
                      disabled={showDocScanner}
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {showDocScanner ? "Processando..." : "Digitalizar RG/CNH"}
                    </Button>
                    
                    <input
                      ref={documentFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleDocumentFileSelected}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Carteirinha do Plano */}
                <div className="space-y-2">
                  <h3 className="font-medium">Carteirinha do Plano de Saúde</h3>
                  <div className="flex flex-col space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleScanDocument}
                      disabled={showCardScanner}
                      className="w-full"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {showCardScanner ? "Processando..." : "Digitalizar Carteirinha"}
                    </Button>
                    
                    <input
                      ref={insuranceCardFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleDocumentFileSelected}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Informações Extraídas */}
              {extractedInfo && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">
                    Dados extraídos de: {extractedInfo.documentType}
                  </h4>
                  <div className="text-sm text-green-700">
                    <p>✓ Informações preenchidas automaticamente nos campos abaixo</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => handleFieldChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate ? format(formData.birthDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleFieldChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plano de Saúde */}
          <Card>
            <CardHeader>
              <CardTitle>Plano de Saúde</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insurance">Operadora</Label>
                  <Input
                    id="insurance"
                    value={formData.insurance}
                    onChange={(e) => handleFieldChange('insurance', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insuranceNumber">Número da Carteirinha</Label>
                  <Input
                    id="insuranceNumber"
                    value={formData.insuranceNumber}
                    onChange={(e) => handleFieldChange('insuranceNumber', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Plano</Label>
                  <Input
                    id="plan"
                    value={formData.plan}
                    onChange={(e) => handleFieldChange('plan', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : (isEditMode ? "Atualizar" : "Cadastrar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}