import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, Search, UserPlus } from "lucide-react";
import { Patient } from "@shared/schema";
import { cn, formatCPF } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";

interface PatientSearchProps {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  onPatientSelected?: (patient: Patient) => void;
  className?: string;
}

export function PatientSearch({ 
  selectedPatient, 
  setSelectedPatient, 
  onPatientSelected,
  className 
}: PatientSearchProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [initialPatientData, setInitialPatientData] = useState<{ cpf?: string }>({});
  
  const searchTimeoutRef = useRef<number | null>(null);

  // Carregar pacientes recentes automaticamente (abordagem híbrida)
  const { data: recentPatients, isLoading: isLoadingRecent } = useQuery<Patient[]>({
    queryKey: ["/api/patients/recent"],
    queryFn: async () => {
      const response = await fetch("/api/patients/recent?limit=25", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar pacientes recentes: ${response.status}`);
      }
      
      return response.json();
    }
  });
  
  // Realizar busca quando o termo mudar
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchQuery.length >= 2) {
      setIsLoadingSearch(true);
      
      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          // Buscar pacientes associados ao médico através da API
          const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Erro ao buscar pacientes: ${response.status}`);
          }
          
          const patients = await response.json();
          console.log(`Encontrados ${patients.length} pacientes para a consulta "${searchQuery}"`);
          
          // Definir os resultados da busca
          setSearchResults(patients);
          setIsLoadingSearch(false);
          
        } catch (error) {
          console.error("Erro ao buscar pacientes:", error);
          setSearchResults([]);
          setIsLoadingSearch(false);
          
          toast({
            title: "Erro na busca",
            description: "Erro ao buscar pacientes. Tente novamente.",
            variant: "destructive",
          });
        }
      }, 300);
    } else {
      setSearchResults([]);
      setIsLoadingSearch(false);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, toast]);

  // Determinar quais pacientes mostrar (híbrido: recentes + busca)
  const displayPatients = searchQuery.length >= 2 ? searchResults : (recentPatients || []);
  const isLoading = searchQuery.length >= 2 ? isLoadingSearch : isLoadingRecent;
  
  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setOpen(false);
    
    if (onPatientSelected) {
      onPatientSelected(patient);
    }
  };
  
  // Função para mostrar diálogo de não encontrado
  const handleNotFound = () => {
    // Se o termo de pesquisa parece um CPF válido (com pelo menos 11 dígitos), podemos inicializar o formulário com ele
    const cpfDigits = searchQuery.replace(/\D/g, '');
    
    if (cpfDigits.length >= 11) {
      setInitialPatientData({ cpf: formatCPF(cpfDigits) });
    } else {
      setInitialPatientData({});
    }
    
    setShowNotFoundDialog(true);
    setOpen(false);
  };
  
  // Função para mostrar o formulário de novo paciente
  const showNewPatientForm = () => {
    setShowNotFoundDialog(false);
    setShowPatientForm(true);
  };
  
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between bg-card text-foreground border border-border hover:bg-accent-light hover:text-muted-foreground rounded-md h-10 px-4 py-2", className)}
          >
            {selectedPatient ? (
              <div className="flex flex-col items-start text-left">
                <div className="font-semibold">{selectedPatient.fullName}</div>
                <div className="text-xs text-muted-foreground">{formatCPF(selectedPatient.cpf)}</div>
              </div>
            ) : (
              <span className="text-muted-foreground">Escolha o paciente para o pedido cirúrgico</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 bg-card border border-border" align="start">
          <Command shouldFilter={false} className="bg-card">
            <CommandInput 
              placeholder="Escolha o paciente para o pedido cirúrgico" 
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9 bg-card text-foreground placeholder:text-muted-foreground"
            />
            
            <CommandList className="text-foreground bg-card">
              {isLoading ? (
                <div className="py-6 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.length >= 2 ? "Pesquisando pacientes..." : "Carregando pacientes recentes..."}
                  </p>
                </div>
              ) : (
                <>
                  {searchQuery.length < 2 ? (
                    // Mostrar pacientes recentes
                    <>
                      {displayPatients.length === 0 ? (
                        <div className="py-6 text-center">
                          <Search className="h-4 w-4 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Nenhum paciente recente encontrado</p>
                          <p className="text-xs text-muted-foreground mt-1">Digite pelo menos 2 caracteres para pesquisar</p>
                        </div>
                      ) : (
                        <CommandGroup heading="Pacientes recentes" className="text-muted-foreground">
                          {displayPatients.map((patient) => (
                            <CommandItem
                              key={patient.id}
                              onSelect={() => handleSelect(patient)}
                              className="flex justify-between hover:bg-accent-light"
                            >
                              <div className="flex flex-col">
                                <span className="text-foreground">{patient.fullName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatCPF(patient.cpf)}
                                </span>
                              </div>
                              {selectedPatient?.id === patient.id && (
                                <Check className="h-4 w-4 text-muted-foreground" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </>
                  ) : (
                    // Mostrar resultados de busca
                    <>
                      <CommandEmpty>
                        <div className="py-6 text-center">
                          <p className="text-sm text-muted-foreground mb-2">Nenhum paciente encontrado com "{searchQuery}"</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleNotFound}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground border-none"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Cadastrar novo paciente
                          </Button>
                        </div>
                      </CommandEmpty>
                      
                      <CommandGroup heading="Resultados da pesquisa" className="text-muted-foreground">
                        {displayPatients.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            onSelect={() => handleSelect(patient)}
                            className="flex justify-between hover:bg-accent-light"
                          >
                            <div className="flex flex-col">
                              <span className="text-foreground">{patient.fullName}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatCPF(patient.cpf)}
                              </span>
                            </div>
                            {selectedPatient?.id === patient.id && (
                              <Check className="h-4 w-4 text-muted-foreground" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Dialog para paciente não encontrado */}
      <Dialog open={showNotFoundDialog} onOpenChange={setShowNotFoundDialog}>
        <DialogContent className="bg-popover border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Paciente não encontrado</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Nenhum paciente foi encontrado com "{searchQuery}".
              Deseja cadastrar um novo paciente?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowNotFoundDialog(false)}
              className="border-primary text-foreground hover:bg-accent-light"
            >
              Cancelar
            </Button>
            <Button 
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={showNewPatientForm}
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar Novo Paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Formulário de cadastro de paciente */}
      <PatientFormDialog 
        open={showPatientForm} 
        onOpenChange={setShowPatientForm}
        patient={undefined}
        initialData={initialPatientData}
        onSuccess={(newPatient) => {
          // Selecionar automaticamente o novo paciente cadastrado
          setSelectedPatient(newPatient);
          
          // Mostrar mensagem para o usuário
          toast({
            title: "Paciente selecionado",
            description: `${newPatient.fullName} foi cadastrado e selecionado para o pedido.`,
          });
          
          // Fechar o formulário
          setShowPatientForm(false);
          
          // Chamar callback se existir
          if (onPatientSelected) {
            onPatientSelected(newPatient);
          }
        }}
      />
    </>
  );
}