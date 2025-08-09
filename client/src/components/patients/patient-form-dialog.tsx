import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Patient } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { validateCPF, checkCPFExists, formatCPF, applyCPFMask, applyPhoneMask } from "@/lib/utils";
import { DragDropZone } from "@/components/ui/drag-drop-zone";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { HealthInsuranceSearch } from "@/components/health-insurance/health-insurance-search";
import { HealthInsurancePlanSearch } from "@/components/health-insurance/health-insurance-plan-search";
import { HealthInsuranceProvider, HealthInsurancePlan } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, CreditCard, User, Heart, Scan } from "lucide-react";

// Schema de validação
const patientFormSchema = z.object({
  fullName: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().refine(validateCPF, "CPF inválido"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  gender: z.enum(["M", "F"], { required_error: "Sexo é obrigatório" }),
  email: z.string().email("Email inválido").or(z.literal("")),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  insurance: z.string().optional(),
  insuranceNumber: z.string().optional(),
  plan: z.string().optional(),
  notes: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

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
  initialData,
  onSuccess,
}: PatientFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showDocScanner, setShowDocScanner] = useState(false);
  const [showInsuranceCardScanner, setShowInsuranceCardScanner] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<HealthInsuranceProvider | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<HealthInsurancePlan | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<{
    type: 'identity' | 'insurance';
    data: any;
  } | null>(null);
  
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const insuranceCardFileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!patient;

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      fullName: "",
      cpf: "",
      birthDate: "",
      gender: undefined,
      email: "",
      phone: "",
      phone2: "",
      insurance: "",
      insuranceNumber: "",
      plan: "",
      notes: "",
    },
  });

  const { data: healthInsuranceProviders = [] } = useQuery({
    queryKey: ["/api/health-insurance-providers"],
    enabled: open,
  });

  // Função para verificar CPF existente e preencher dados automaticamente
  const checkExistingPatientAndFill = async (cpf: string) => {
    if (cpf && validateCPF(cpf)) {
      try {
        const cleanCPF = cpf.replace(/\D/g, '');
        const response = await fetch(`/api/patients/cpf/${cleanCPF}/exists`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.exists && data.patient) {
            // Preencher automaticamente todos os campos com os dados do paciente existente
            form.setValue('fullName', data.patient.fullName || '');
            form.setValue('birthDate', data.patient.birthDate || '');
            form.setValue('gender', data.patient.gender as 'M' | 'F');
            form.setValue('email', data.patient.email || '');
            form.setValue('phone', data.patient.phone || '');
            form.setValue('phone2', data.patient.phone2 || '');
            form.setValue('insurance', data.patient.insurance || '');
            form.setValue('insuranceNumber', data.patient.insuranceNumber || '');
            form.setValue('plan', data.patient.plan || '');
            form.setValue('notes', data.patient.notes || '');
            
            toast({
              title: "Paciente encontrado",
              description: "Dados preenchidos automaticamente da base de dados.",
            });
          }
        }
      } catch (error) {
        console.error('Erro ao verificar CPF:', error);
      }
    }
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        fullName: patient?.fullName || "",
        cpf: patient?.cpf || initialData?.cpf || "",
        birthDate: patient?.birthDate || "",
        gender: (patient?.gender as "M" | "F") || undefined,
        email: patient?.email || "",
        phone: patient?.phone || "",
        phone2: patient?.phone2 || "",
        insurance: patient?.insurance || "",
        insuranceNumber: patient?.insuranceNumber || "",
        plan: patient?.plan || "",
        notes: patient?.notes || "",
      });
      
      // Se está em modo de edição e tem uma seguradora, buscar e definir o provider selecionado
      if (isEditMode && patient?.insurance && healthInsuranceProviders.length > 0) {
        const matchingProvider = healthInsuranceProviders.find(
          provider => provider.name === patient.insurance
        );
        if (matchingProvider) {
          setSelectedProvider(matchingProvider);
          
          // Se também tem um plano, buscar e selecionar automaticamente
          if (patient?.plan && matchingProvider.ansCode) {
            const loadPlanForEdit = async () => {
              try {
                const response = await fetch(`/api/health-insurance-plans/provider/${matchingProvider.ansCode}`, {
                  credentials: 'include'
                });
                
                if (response.ok) {
                  const plans = await response.json();
                  // Buscar o plano que corresponde ao nome salvo
                  const matchingPlan = plans.find((plan: any) => 
                    plan.nmPlano === patient.plan || 
                    (plan.nmPlano && plan.nmPlano.toLowerCase().includes(patient.plan.toLowerCase())) ||
                    (patient.plan.toLowerCase().includes(plan.nmPlano?.toLowerCase()))
                  );
                  
                  if (matchingPlan) {
                    setSelectedPlan(matchingPlan);
                  }
                }
              } catch (error) {
                console.error('Erro ao carregar plano para edição:', error);
              }
            };
            
            loadPlanForEdit();
          }
        } else {
          setSelectedProvider(null);
        }
      } else {
        // Resetar provider selecionado apenas se não estiver em modo de edição
        setSelectedProvider(null);
      }
      
      // Só limpar extractedInfo se não for modo de edição
      if (!isEditMode) {
        setExtractedInfo(null);
      }
    } else {
      // Limpar informações extraídas quando o dialog fechar
      setExtractedInfo(null);
      setSelectedProvider(null);
    }
  }, [open, patient, initialData, isEditMode, form, healthInsuranceProviders]);

  // Função para processar documento com OCR
  const processDocumentWithOCR = async (file: File) => {
    try {
      setShowDocScanner(true);
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', 'identity');

      const result = await apiRequest("/api/process-document", "POST", formData);
      
      if (result.success && result.data) {
        // Preencher campos automaticamente
        if (result.data.nomeCompleto || result.data.fullName) {
          form.setValue('fullName', result.data.nomeCompleto || result.data.fullName);
        }
        if (result.data.cpf || result.data.idNumber) {
          const cpfValue = result.data.cpf || result.data.idNumber;
          form.setValue('cpf', cpfValue);
          // Verificar se CPF existe e preencher dados automaticamente
          await checkExistingPatientAndFill(cpfValue);
        }
        if (result.data.dataNascimento || result.data.birthDate) {
          form.setValue('birthDate', result.data.dataNascimento || result.data.birthDate);
        }
        if (result.data.gender) {
          form.setValue('gender', result.data.gender as "M" | "F");
        }
        
        setExtractedInfo({
          type: 'identity',
          data: result.data
        });
        
        console.log('Estado extractedInfo definido:', {
          type: 'identity',
          data: result.data
        });
        
        toast({
          title: "Documento processado",
          description: "Dados extraídos e preenchidos automaticamente.",
        });
      }
    } catch (error) {
      console.error('Erro ao processar documento:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar o documento.",
        variant: "destructive",
      });
    } finally {
      setShowDocScanner(false);
    }
  };

  // Função para processar carteirinha de plano de saúde
  const processInsuranceCardWithOCR = async (file: File) => {
    try {
      setShowInsuranceCardScanner(true);
      
      // Limpar estados anteriores para evitar interferência
      setSelectedProvider(null);
      setSelectedPlan(null);
      
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', 'insurance');

      const result = await apiRequest("/api/process-document", "POST", formData);
      
      if (result.success && result.data) {
        // Se encontrou uma operadora normalizada, buscar no banco e selecionar
        if (result.data.normalizedOperadora) {
          try {
            console.log('Buscando operadora normalizada:', result.data.normalizedOperadora);
            
            // Usar o parâmetro correto da API (q em vez de query)
            const searchUrl = `/api/health-insurance-providers/search?q=${encodeURIComponent(result.data.normalizedOperadora)}`;
            console.log('URL de busca:', searchUrl);
            
            const response = await fetch(searchUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              credentials: 'include'
            });
            
            if (!response.ok) {
              throw new Error(`Erro na busca: ${response.status}`);
            }
            
            const providersResult = await response.json();
            console.log('Resultado da busca de operadora:', providersResult);
            
            if (providersResult && providersResult.length > 0) {
              const provider = providersResult[0];
              console.log('Operadora encontrada:', provider);
              
              // Selecionar automaticamente a operadora encontrada
              setSelectedProvider(provider);
              form.setValue('insurance', provider.name);
              
              console.log('Operadora selecionada automaticamente:', provider.name);
              
              toast({
                title: "Operadora identificada",
                description: `${provider.name} foi selecionada automaticamente.`,
              });

              // Buscar e selecionar plano automaticamente se plano foi detectado
              if (result.data.plano && provider.ansCode) {
                try {
                  console.log('Buscando plano detectado:', result.data.plano, 'para operadora:', provider.ansCode);
                  
                  // Usar a nova API de busca por similaridade
                  const searchUrl = `/api/health-insurance-plans/provider/${provider.ansCode}/search?q=${encodeURIComponent(result.data.plano)}`;
                  
                  const plansResponse = await fetch(searchUrl, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    },
                    credentials: 'include'
                  });
                  
                  if (plansResponse.ok) {
                    const matchingPlans = await plansResponse.json();
                    console.log('Planos encontrados por similaridade:', matchingPlans.length);
                    
                    // Apenas selecionar se houver match com score alto suficiente (> 0.5)
                    if (matchingPlans.length > 0) {
                      const bestMatch = matchingPlans[0];
                      console.log('Melhor match encontrado:', bestMatch.nmPlano || bestMatch.cdPlano, 'Score:', bestMatch.matchScore, 'Tipo:', bestMatch.matchType);
                      console.log('Plano OCR:', result.data.plano, 'vs Plano DB:', bestMatch.nmPlano);
                      
                      // Critério adaptativo baseado no tipo de match e conteúdo
                      const isExactMatch = bestMatch.matchType === 'exact_name' || bestMatch.matchType === 'partial_name';
                      
                      // Verificar se há correspondência de palavras-chave importantes
                      const ocrWords = result.data.plano.toUpperCase().split(/\s+/).filter((w: string) => w.length > 2);
                      const planWords = (bestMatch.nmPlano || '').toUpperCase().split(/\s+/).filter((w: string) => w.length > 2);
                      
                      const commonWords = ocrWords.filter((word: string) => 
                        planWords.some((planWord: string) => planWord.includes(word) || word.includes(planWord))
                      );
                      
                      const hasKeywordMatch = bestMatch.matchType === 'keyword_match' || 
                                            commonWords.length > 0 ||
                                            (bestMatch.nmPlano && result.data.plano && 
                                             bestMatch.nmPlano.toUpperCase().includes(result.data.plano.split(' ')[0].toUpperCase()));
                      
                      console.log('Análise de match - isExactMatch:', isExactMatch, 'hasKeywordMatch:', hasKeywordMatch);
                      console.log('Palavras OCR:', ocrWords, 'Palavras Plano:', planWords, 'Palavras comuns:', commonWords);
                      
                      let scoreThreshold = 0.45; // padrão
                      if (isExactMatch) {
                        scoreThreshold = 0.25; // mais permissivo para matches exatos
                      } else if (hasKeywordMatch && commonWords.length > 0) {
                        scoreThreshold = 0.25; // muito permissivo para matches com palavras importantes
                      } else if (hasKeywordMatch) {
                        scoreThreshold = 0.3; // permissivo para matches com palavras-chave
                      }
                      
                      console.log('Threshold calculado:', scoreThreshold, 'Score atual:', bestMatch.matchScore);
                      
                      if (bestMatch.matchScore >= scoreThreshold) {
                        console.log(`✅ PLANO SELECIONADO AUTOMATICAMENTE: ${bestMatch.nmPlano || bestMatch.cdPlano} (Score: ${bestMatch.matchScore}, Threshold: ${scoreThreshold})`);
                        setSelectedPlan(bestMatch);
                        form.setValue('plan', bestMatch.nmPlano || `Plano ${bestMatch.cdPlano}`);
                        
                        toast({
                          title: "Plano identificado",
                          description: `${bestMatch.nmPlano || bestMatch.cdPlano} foi selecionado automaticamente (${Math.round(bestMatch.matchScore * 100)}% de similaridade).`,
                        });
                      } else {
                        console.log(`❌ Score insuficiente para seleção automática: ${bestMatch.matchScore} < ${scoreThreshold}`);
                        console.log('Plano detectado no OCR preenchido no campo, mas não selecionado automaticamente');
                        // Apenas preenche o campo de texto, sem selecionar plano específico
                        form.setValue('plan', result.data.plano);
                        
                        toast({
                          title: "Plano detectado",
                          description: `"${result.data.plano}" foi detectado mas não foi possível identificar o plano específico automaticamente.`,
                          variant: "default",
                        });
                      }
                    } else {
                      console.log('Nenhum plano encontrado com similaridade suficiente para:', result.data.plano);
                      // Apenas preenche o campo de texto sem selecionar plano específico
                      form.setValue('plan', result.data.plano);
                      
                      toast({
                        title: "Plano detectado",
                        description: `"${result.data.plano}" foi detectado mas não foi possível identificar o plano específico automaticamente.`,
                        variant: "default",
                      });
                    }
                  } else {
                    console.log('Erro ao buscar planos da operadora, preenchendo apenas o campo de texto');
                    form.setValue('plan', result.data.plano);
                  }
                } catch (error) {
                  console.error('Erro ao buscar plano automaticamente:', error);
                  form.setValue('plan', result.data.plano);
                }
              }
            } else {
              console.log('Nenhuma operadora encontrada na busca');
              toast({
                title: "Operadora não encontrada",
                description: "Não foi possível localizar a operadora no banco de dados.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('Erro ao buscar operadora no banco:', error);
            toast({
              title: "Erro na busca",
              description: "Erro ao buscar operadora no banco de dados.",
              variant: "destructive",
            });
          }
        }
        
        // Preencher outros campos automaticamente
        if (result.data.numeroCarteirinha) {
          form.setValue('insuranceNumber', result.data.numeroCarteirinha);
        }
        
        // Se plano foi detectado mas operadora não foi identificada, apenas preencher o campo de texto
        if (result.data.plano && !result.data.normalizedOperadora) {
          form.setValue('plan', result.data.plano);
        }
        
        setExtractedInfo({
          type: 'insurance',
          data: result.data
        });
        
        toast({
          title: "Carteirinha processada",
          description: "Dados do plano extraídos automaticamente.",
        });
      }
    } catch (error) {
      console.error('Erro ao processar carteirinha:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar a carteirinha.",
        variant: "destructive",
      });
    } finally {
      setShowInsuranceCardScanner(false);
    }
  };

  const handleDocumentFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processDocumentWithOCR(file);
    }
  };

  const handleInsuranceCardFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processInsuranceCardWithOCR(file);
    }
  };

  const onSubmit = async (data: PatientFormValues) => {
    try {
      // Formatar dados para envio
      const patientData = {
        ...data,
        cpf: formatCPF(data.cpf),
      };

      let result;
      if (isEditMode && patient) {
        result = await apiRequest(`/api/patients/${patient.id}`, "PUT", patientData);
      } else {
        result = await apiRequest("/api/patients", "POST", patientData);
      }

      // Tratar diferentes tipos de resposta do servidor
      if (result.action === "already_associated") {
        toast({
          title: "Paciente já associado",
          description: "Este paciente já está na sua lista.",
        });
      } else if (result.action === "associated_existing") {
        toast({
          title: "Paciente associado",
          description: `${result.patient.fullName} foi associado à sua lista.`,
        });
      } else {
        toast({
          title: isEditMode ? "Paciente atualizado" : "Paciente criado",
          description: `${result.fullName} foi ${isEditMode ? "atualizado" : "cadastrado"} com sucesso.`,
        });
      }

      // Invalidar cache para atualizar a lista de pacientes automaticamente
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });

      onSuccess?.(result.patient || result);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar paciente",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] max-h-[95vh] w-[95vw] sm:w-full bg-slate-900 border-slate-700 text-white overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white text-lg font-medium">
            {isEditMode ? "Editar Paciente" : "Novo Paciente"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEditMode 
              ? "Atualize as informações do paciente selecionado." 
              : "Adicione um novo paciente ao sistema."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
            {/* Layout em duas colunas principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Coluna Esquerda - Dados Pessoais */}
              <div className="space-y-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white text-sm">
                      <User className="w-4 h-4" />
                      Dados Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Nome Completo *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">CPF *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="000.000.000-00" 
                                value={field.value}
                                onChange={(e) => {
                                  const maskedValue = applyCPFMask(e.target.value);
                                  field.onChange(maskedValue);
                                }}
                                onBlur={async (e) => {
                                  await checkExistingPatientAndFill(e.target.value);
                                }}
                                maxLength={14} // CPF formatado tem 14 caracteres
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="birthDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Data de Nascimento *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Sexo *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  <SelectItem value="M" className="text-white hover:bg-slate-600">Masculino</SelectItem>
                                  <SelectItem value="F" className="text-white hover:bg-slate-600">Feminino</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">E-mail</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  {...field} 
                                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Telefone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="(00) 00000-0000" 
                                  value={field.value}
                                  onChange={(e) => {
                                    const maskedValue = applyPhoneMask(e.target.value);
                                    field.onChange(maskedValue);
                                  }}
                                  maxLength={15} // Telefone formatado máximo: (99) 99999-9999
                                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="phone2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Telefone 2</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(00) 00000-0000" 
                                value={field.value}
                                onChange={(e) => {
                                  const maskedValue = applyPhoneMask(e.target.value);
                                  field.onChange(maskedValue);
                                }}
                                maxLength={15} // Telefone formatado máximo: (99) 99999-9999
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita - Plano de Saúde e Digitalização */}
              <div className="space-y-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-4">
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Documento de Identidade */}
                      <div className="space-y-2">
                        <DragDropZone
                          onFileDrop={async (file) => {
                            const event = { target: { files: [file] } } as any;
                            await handleDocumentFileSelected(event);
                          }}
                          accept="image/*"
                          disabled={showDocScanner}
                          className="w-full"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full h-20 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs flex flex-col justify-center items-center border-dashed px-2 py-3"
                            onClick={() => docFileInputRef.current?.click()}
                            disabled={showDocScanner}
                          >
                            <FileText className="w-5 h-5 mb-2" />
                            <span className="font-medium text-center leading-tight">
                              {showDocScanner ? "Processando..." : "RG/CNH"}
                            </span>
                            <span className="text-xs text-slate-400 mt-1 text-center leading-tight">
                              Clique ou arraste aqui
                            </span>
                          </Button>
                        </DragDropZone>
                        
                        <input
                          ref={docFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDocumentFileSelected}
                          className="hidden"
                        />
                      </div>

                      {/* Carteirinha do Plano */}
                      <div className="space-y-2">
                        <DragDropZone
                          onFileDrop={async (file) => {
                            const event = { target: { files: [file] } } as any;
                            await handleInsuranceCardFileSelected(event);
                          }}
                          accept="image/*"
                          disabled={showInsuranceCardScanner}
                          className="w-full"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full h-20 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs flex flex-col justify-center items-center border-dashed px-2 py-3"
                            onClick={() => insuranceCardFileInputRef.current?.click()}
                            disabled={showInsuranceCardScanner}
                          >
                            <CreditCard className="w-5 h-5 mb-2" />
                            <span className="font-medium text-center leading-tight">
                              {showInsuranceCardScanner ? "Processando..." : "Carteirinha"}
                            </span>
                            <span className="text-xs text-slate-400 mt-1 text-center leading-tight">
                              Clique ou arraste aqui
                            </span>
                          </Button>
                        </DragDropZone>
                        
                        <input
                          ref={insuranceCardFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleInsuranceCardFileSelected}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Informações extraídas */}
                    {extractedInfo && (
                      <div className="mt-3 p-2 bg-gray-800 rounded text-white text-sm">
                        <div className="font-medium mb-1">Dados extraídos:</div>
                        {extractedInfo.type === 'identity' && (
                          <>
                            {extractedInfo.data.fullName && (
                              <div>Nome: {extractedInfo.data.fullName}</div>
                            )}
                            {extractedInfo.data.idNumber && (
                              <div>CPF: {extractedInfo.data.idNumber}</div>
                            )}
                            {extractedInfo.data.birthDate && (
                              <div>Data de Nascimento: {extractedInfo.data.birthDate}</div>
                            )}
                          </>
                        )}
                        {extractedInfo.type === 'insurance' && (
                          <>
                            {extractedInfo.data.operadora && (
                              <div>Seguradora: {extractedInfo.data.operadora}</div>
                            )}
                            {extractedInfo.data.numeroCarteirinha && (
                              <div>Número da Carteirinha: {extractedInfo.data.numeroCarteirinha}</div>
                            )}
                            {extractedInfo.data.nomeTitular && (
                              <div>Nome do Titular: {extractedInfo.data.nomeTitular}</div>
                            )}
                            {extractedInfo.data.plano && (
                              <div>Plano: {extractedInfo.data.plano}</div>
                            )}
                            {extractedInfo.data.cpf && (
                              <div>CPF: {extractedInfo.data.cpf}</div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Plano de Saúde */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white text-sm">
                      <Heart className="w-4 h-4" />
                      Plano de Saúde
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="insurance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-sm">Seguradora</FormLabel>
                            <FormControl>
                              <HealthInsuranceSearch
                                selectedProvider={selectedProvider}
                                setSelectedProvider={(provider) => {
                                  setSelectedProvider(provider);
                                  field.onChange(provider?.name || "");
                                }}
                                className="h-8"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="plan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-sm">Plano</FormLabel>
                            <FormControl>
                              <HealthInsurancePlanSearch
                                selectedPlan={selectedPlan}
                                setSelectedPlan={(plan) => {
                                  setSelectedPlan(plan);
                                  field.onChange(plan ? plan.nmPlano || `Plano ${plan.cdPlano}` : "");
                                }}
                                providerId={selectedProvider?.ansCode}
                                className="h-8"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="insuranceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white text-sm">Número da Carteirinha</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>


              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {form.formState.isSubmitting ? "Salvando..." : (isEditMode ? "Atualizar" : "Salvar")}
              </Button>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}