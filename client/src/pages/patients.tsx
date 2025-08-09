import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Pencil, Trash2, CheckCircle, Circle, Loader2 } from "lucide-react";
import { type Patient } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FaWhatsapp } from "react-icons/fa";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [openPatientForm, setOpenPatientForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);
  const [processingPatientId, setProcessingPatientId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Tipo para armazenar os IDs dos pacientes associados
  type AssociatedPatient = {
    patientId: number;
    patientName: string;
    associatedAt: Date;
  };
  
  // Buscar dados dos pacientes diretamente da API
  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ["/api/patients"]
  });
  
  // Buscar pacientes associados ao médico atual (para médicos e administradores)
  const { data: associatedPatients, isLoading: isLoadingAssociations } = useQuery<AssociatedPatient[]>({
    queryKey: ['/api/doctors', user?.id, 'patients'],
    queryFn: async () => {
      // Permitir acesso para médicos e administradores
      if (!user?.id || (user?.roleId !== 2 && user?.roleId !== 1)) return []; 
      
      // Buscar dados reais da API
      try {
        const res = await fetch(`/api/doctors/${user.id}/patients`);
        if (!res.ok) {
          console.error(`Erro ao buscar pacientes associados: ${res.status}`);
          return [];
        }
        const data = await res.json();
        console.log(`Encontrados ${data.length} pacientes associados ao médico ID ${user.id}`);
        return data;
      } catch (error) {
        console.error("Erro ao buscar pacientes associados:", error);
        return [];
      }
    },
    // Habilitar a consulta para médicos e administradores
    enabled: !!user?.id && (user?.roleId === 2 || user?.roleId === 1),
  });

  // Verificar se o usuário é um médico
  const isMedico = user?.roleId === 2;
  
  useEffect(() => {
    if (!patients) return;
    
    // Filtrar a lista de pacientes com base no perfil e critérios de busca
    let filtered = [...patients];
    
    // Se o usuário for médico e não estiver buscando por termo
    if (isMedico && !searchTerm.trim()) {
      // Mostrar apenas pacientes associados
      const associatedIds = (associatedPatients || []).map(ap => ap.patientId);
      filtered = patients.filter(patient => associatedIds.includes(patient.id));
    } 
    // Se houver um termo de busca, aplicar o filtro independentemente do perfil
    else if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = patients.filter((patient) => 
        patient.fullName.toLowerCase().includes(term) ||
        patient.cpf.toLowerCase().includes(term)
      );
    }
    
    setFilteredPatients(filtered);
  }, [patients, searchTerm, associatedPatients, isMedico]);

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Função para calcular a idade com base na data de nascimento
  const calculateAge = (birthDate: string | Date): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Se ainda não fez aniversário este ano, diminui 1 da idade
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Função para abrir o formulário de edição com um paciente selecionado
  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setOpenPatientForm(true);
  };
  
  // Função para abrir o formulário de cadastro (novo paciente)
  const handleAddNew = () => {
    setSelectedPatient(undefined);
    setOpenPatientForm(true);
  };
  
  // Função para excluir um paciente
  const handleDelete = async (patient: Patient) => {
    if (confirm(`Tem certeza que deseja excluir o paciente ${patient.fullName}?`)) {
      try {
        // Definir estado de processamento
        setProcessingPatientId(patient.id);
        
        const response = await apiRequest("DELETE", `/api/patients/${patient.id}`);
        
        if (response.ok) {
          // Força atualização da lista de pacientes
          queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
          
          // Filtrar o paciente excluído da lista local enquanto aguarda recarregamento
          if (patients) {
            const updatedPatients = patients.filter(p => p.id !== patient.id);
            // Atualiza a lista filtrada manualmente
            setFilteredPatients(updatedPatients.filter(p => 
              p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
              p.cpf.includes(searchTerm)
            ));
          }
          
          toast({
            title: "Paciente excluído com sucesso",
            description: `${patient.fullName} foi removido(a) da sua lista de pacientes.`,
          });
        } else {
          const errorText = await response.text();
          console.error("Erro na resposta:", errorText);
          throw new Error(errorText || "Erro ao excluir paciente");
        }
      } catch (error) {
        console.error("Erro ao excluir paciente:", error);
        toast({
          title: "Erro ao excluir paciente",
          description: "Não foi possível excluir o paciente. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        // Remover estado de processamento
        setProcessingPatientId(null);
      }
    }
  };
  
  // Função para associar um paciente ao médico
  const handleAssociatePatient = async (patientId: number) => {
    if (!user?.id) return;
    
    setProcessingPatientId(patientId);
    
    try {
      const response = await fetch(`/api/doctor-patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ doctorId: user.id, patientId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      
      // Atualizar a lista de pacientes associados
      queryClient.invalidateQueries({ queryKey: ['/api/doctors', user.id, 'patients'] });
      
      toast({
        title: "Paciente associado com sucesso",
        description: "O paciente foi adicionado à sua lista.",
      });
    } catch (error) {
      console.error("Erro ao associar paciente:", error);
      toast({
        title: "Erro ao associar paciente",
        description: "Não foi possível associar o paciente. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setProcessingPatientId(null);
    }
  };
  
  // Função para desassociar um paciente do médico
  const handleDissociatePatient = async (patientId: number) => {
    if (!user?.id) return;
    
    if (!confirm("Tem certeza que deseja remover este paciente da sua lista?")) {
      return;
    }
    
    setProcessingPatientId(patientId);
    
    try {
      const patient = patients?.find(p => p.id === patientId);
      const patientName = patient?.fullName || "paciente";
      
      // Usar um endpoint mais direto que aceita doctorId e patientId
      const response = await fetch(`/api/doctors/${user.id}/patients/${patientId}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      
      // Atualizar a lista de pacientes associados
      queryClient.invalidateQueries({ queryKey: ['/api/doctors', user.id, 'patients'] });
      
      toast({
        title: "Paciente desassociado com sucesso",
        description: `${patientName} foi removido(a) da sua lista.`,
      });
    } catch (error) {
      console.error("Erro ao desassociar paciente:", error);
      toast({
        title: "Erro ao desassociar paciente",
        description: "Não foi possível remover o paciente da sua lista. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setProcessingPatientId(null);
    }
  };
  
  // Função para enviar mensagem de WhatsApp
  const handleWhatsAppMessage = (phone: string) => {
    // Remover caracteres não numéricos do telefone
    const formattedPhone = phone?.replace(/\D/g, "");
    
    if (!formattedPhone) {
      toast({
        title: "Telefone não disponível",
        description: "Este paciente não possui um número de telefone registrado.",
        variant: "destructive",
      });
      return;
    }
    
    // Se o telefone não começar com o código do país, adicionar o código do Brasil
    const phoneWithCountryCode = formattedPhone.startsWith("55") 
      ? formattedPhone 
      : `55${formattedPhone}`;
    
    // Abrir o WhatsApp Web ou App com o número do paciente
    window.open(`https://wa.me/${phoneWithCountryCode}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1a2332]">
      <main className="flex-grow overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-300 hover:text-white hover:bg-blue-800/50 p-2"
                onClick={() => window.history.back()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-white">Meus Pacientes</h2>
                <p className="text-blue-300">
                  Gerenciamento de pacientes e histórico médico
                </p>
              </div>
            </div>
            <Button onClick={handleAddNew} className="bg-blue-500 hover:bg-blue-600 text-white">
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Paciente
            </Button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-2">Pacientes Cadastrados</h3>
            <p className="text-sm text-blue-300 mb-4">
              Visualize e gerencia seus pacientes
            </p>
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-300" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                className="pl-10 bg-[#1f2b42] border-blue-800 text-white placeholder:text-blue-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Indicador de busca ativa */}
            {searchTerm.trim() && (
              <div className="mb-3 text-sm text-blue-400 flex items-center gap-2">
                <span className="bg-blue-800/50 px-2 py-1 rounded-md">
                  Resultados filtrados pela sua busca: "{searchTerm}"
                </span>
              </div>
            )}
              
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full bg-blue-900/20" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-red-300 mb-2">Erro ao carregar pacientes</p>
                <p className="text-sm text-blue-300">
                  Tente novamente mais tarde
                </p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-blue-300 mb-2">Nenhum paciente encontrado</p>
                <p className="text-sm text-blue-300/70">
                  {searchTerm ? "Clique em Novo Paciente no canto superior direito" : "Adicione seu primeiro paciente"}
                </p>
              </div>
            ) : (
              <div className="rounded-md">
                <div className="bg-[#1a2332] text-white overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {(user?.roleId === 2 || user?.roleId === 1) && (
                          <th className="text-center py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">Associado</th>
                        )}
                        <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">Nome</th>
                        <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">CPF</th>
                        <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">Data de Nascimento</th>
                        <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">Idade</th>
                        <th className="text-left py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">Convênio</th>
                        <th className="text-right py-3 px-4 border-b border-blue-800 text-blue-200 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => {
                        // Verificar se o paciente está associado ao médico atual
                        const isAssociated = associatedPatients?.some(ap => ap.patientId === patient.id) || false;
                        
                        // Removi os logs de diagnóstico que não são mais necessários
                        
                        return (
                          <tr key={patient.id} className="border-b border-blue-800/40 hover:bg-blue-900/20">
                            {(user?.roleId === 2 || user?.roleId === 1) && (
                              <td className="py-3 px-4 text-center">
                                {isLoadingAssociations ? (
                                  <div className="flex justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                                  </div>
                                ) : isAssociated ? (
                                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-500 mx-auto" />
                                )}
                              </td>
                            )}
                            <td className="py-3 px-4 text-white">{patient.fullName}</td>
                            <td className="py-3 px-4 text-white">{patient.cpf}</td>
                            <td className="py-3 px-4 text-white">{formatDate(patient.birthDate)}</td>
                            <td className="py-3 px-4 text-white">{calculateAge(patient.birthDate)} anos</td>
                            <td className="py-3 px-4 text-white">{patient.insurance || "Não informado"}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                {(user?.roleId === 2 || user?.roleId === 1) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={isAssociated 
                                      ? "text-red-400 hover:bg-red-900/20" 
                                      : "text-green-500 hover:bg-green-900/20"
                                    }
                                    onClick={() => isAssociated 
                                      ? handleDissociatePatient(patient.id) 
                                      : handleAssociatePatient(patient.id)
                                    }
                                    disabled={isLoadingAssociations || processingPatientId !== null}
                                  >
                                    {processingPatientId === patient.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : isAssociated ? (
                                      <>
                                        <Circle className="mr-2 h-4 w-4" />
                                        Desassociar
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Associar
                                      </>
                                    )}
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="hover:bg-green-500/20 text-green-500"
                                  onClick={() => handleWhatsAppMessage(patient.phone || "")}
                                  title="Enviar mensagem no WhatsApp"
                                >
                                  <FaWhatsapp className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-blue-200 hover:bg-blue-800/50"
                                  onClick={() => handleEdit(patient)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-400 hover:bg-red-900/20"
                                  onClick={() => handleDelete(patient)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Modal de cadastro/edição de paciente */}
      <PatientFormDialog 
        open={openPatientForm} 
        onOpenChange={setOpenPatientForm}
        patient={selectedPatient}
      />
    </div>
  );
}