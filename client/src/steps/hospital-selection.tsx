import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Hospital } from "@shared/schema";
import { Building2 } from "lucide-react";
import { HospitalSearch } from "@/components/hospitals/hospital-search";

interface HospitalSelectionProps {
  selectedHospital: Hospital | null;
  setSelectedHospital: (hospital: Hospital | null) => void;
}

export function HospitalSelection({ selectedHospital, setSelectedHospital }: HospitalSelectionProps) {
  // Utilizando o hook useQuery para buscar apenas hospitais associados ao médico
  const { 
    data: hospitals = [], 
    isLoading, 
    error 
  } = useQuery<Hospital[]>({
    queryKey: ['/api/hospitals', { onlyAssociated: true }],
    queryFn: async () => {
      const response = await fetch('/api/hospitals?onlyAssociated=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao buscar hospitais associados');
      }
      
      const data = await response.json();
      console.log(`Encontrados ${data.length} hospitais associados ao médico para seleção`);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
  
  // Log para debug
  console.log("HospitalSelection renderizado com hospital:", selectedHospital?.name);

  const handleHospitalSelected = (hospital: Hospital) => {
    setSelectedHospital(hospital);
  };

  return (
    <div className="mb-6 text-foreground">
      <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
        {/* Título com fundo azul */}
        <div className="bg-accent-light px-4 py-3">
          <div className="flex items-center">
            <Building2 className="mr-2 h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground">Selecione o Hospital</h3>
            </div>
          </div>
        </div>
        
        {/* Campo de seleção */}
        <div className="p-5">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando hospitais...</div>
        ) : error instanceof Error ? (
          <div className="text-center py-4 text-destructive">
            Erro ao carregar hospitais. Tente novamente mais tarde.
          </div>
        ) : hospitals.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Nenhum hospital cadastrado. Por favor, adicione hospitais primeiro.
          </div>
        ) : (
          <div className="space-y-4">
            <HospitalSearch 
              selectedHospital={selectedHospital}
              setSelectedHospital={setSelectedHospital}
              onHospitalSelected={handleHospitalSelected}
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}