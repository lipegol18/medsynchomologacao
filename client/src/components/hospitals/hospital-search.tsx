import React, { useState, useEffect, useRef } from "react";
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
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Hospital } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

// Função para normalizar texto (remover acentos e converter para minúsculas)
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

interface HospitalSearchProps {
  selectedHospital: Hospital | null;
  setSelectedHospital: (hospital: Hospital | null) => void;
  onHospitalSelected?: (hospital: Hospital) => void;
  className?: string;
}

export function HospitalSearch({ 
  selectedHospital, 
  setSelectedHospital, 
  onHospitalSelected,
  className 
}: HospitalSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  
  // Buscar hospitais do backend, com opção de filtrar por associados ao médico
  const { data: hospitals = [], isLoading } = useQuery<Hospital[]>({
    queryKey: ['/api/hospitals', { onlyAssociated: true }],
    queryFn: async () => {
      // Sempre buscar apenas hospitais associados ao médico na criação de pedidos
      console.log("Buscando apenas hospitais associados ao médico");
      
      const response = await fetch(`/api/hospitals?onlyAssociated=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao buscar hospitais');
      }
      
      const data = await response.json();
      console.log(`Encontrados ${data.length} hospitais associados ao médico`);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
  
  // Filtrar hospitais com base na consulta de pesquisa usando normalização
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHospitals(hospitals);
      return;
    }
    
    // Normalizar o termo de busca para remover acentos e converter para minúsculas
    const normalizedQuery = normalizeText(searchQuery);
    
    const filtered = hospitals.filter(hospital => {
      return (
        normalizeText(hospital.name).includes(normalizedQuery) || 
        (hospital.city && normalizeText(hospital.city).includes(normalizedQuery)) ||
        (hospital.uf && normalizeText(hospital.uf).includes(normalizedQuery)) ||
        (hospital.cnpj && normalizeText(hospital.cnpj).includes(normalizedQuery))
      );
    });
    
    setFilteredHospitals(filtered);
  }, [searchQuery, hospitals]);
  
  const handleSelect = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setOpen(false);
    
    if (onHospitalSelected) {
      onHospitalSelected(hospital);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-card text-foreground border border-border hover:bg-accent-light hover:text-muted-foreground rounded-md h-10 px-4 py-2", className)}
        >
          {selectedHospital ? (
            <div className="flex flex-col items-start text-left">
              <div className="font-semibold">{selectedHospital.name}</div>
              <div className="text-xs text-muted-foreground">
                {selectedHospital.uf && selectedHospital.city 
                  ? `${selectedHospital.city} - ${selectedHospital.uf}`
                  : selectedHospital.uf || selectedHospital.city || ''
                }
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Escolha o hospital para o pedido cirúrgico</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 bg-card border border-border" align="start">
        <Command shouldFilter={false} className="bg-card">
          <CommandInput 
            placeholder="Escolha o hospital para o pedido cirúrgico" 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9 bg-card text-foreground placeholder:text-muted-foreground"
          />
          
          <CommandList className="text-foreground bg-card">
            {isLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Carregando hospitais...</p>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <Search className="h-4 w-4 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhum hospital encontrado</p>
                  </div>
                </CommandEmpty>
                
                <CommandGroup heading="Hospitais" className="text-muted-foreground">
                  {filteredHospitals.map((hospital) => (
                    <CommandItem
                      key={hospital.id}
                      onSelect={() => handleSelect(hospital)}
                      className="flex justify-between hover:bg-accent-light"
                    >
                      <div className="flex flex-col">
                        <span className="text-foreground">{hospital.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {hospital.city ? `${hospital.city}${hospital.uf ? ` - ${hospital.uf}` : ''}` : hospital.uf || ''}
                        </span>
                      </div>
                      {selectedHospital?.id === hospital.id && (
                        <Check className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}