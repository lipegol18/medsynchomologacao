import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Patient } from "@shared/schema";
import { User } from "lucide-react";
import { PatientSearch } from "@/components/patients/patient-search";

interface PatientSelectionProps {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  onPatientSelected?: (patient: Patient) => void;
}

export function PatientSelection({ 
  selectedPatient, 
  setSelectedPatient,
  onPatientSelected
}: PatientSelectionProps) {
  
  // Função para tratar seleção de paciente
  const handlePatientSelected = (patient: Patient) => {
    // Não chamamos setSelectedPatient aqui pois o PatientSearch já faz isso
    // Apenas chamar callback se existir
    if (onPatientSelected) {
      onPatientSelected(patient);
    }
  };

  return (
    <div className="mb-6 text-foreground">
      <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
        {/* Título com fundo azul */}
        <div className="bg-accent-light px-4 py-3">
          <div className="flex items-center">
            <User className="mr-2 h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground">Dados do Paciente</h3>
            </div>
          </div>
        </div>
        
        {/* Campo de seleção */}
        <div className="p-5">
          <div className="space-y-4">
            <PatientSearch 
              selectedPatient={selectedPatient}
              setSelectedPatient={setSelectedPatient}
              onPatientSelected={handlePatientSelected}
            />
          </div>
        </div>
      </div>
    </div>
  );
}