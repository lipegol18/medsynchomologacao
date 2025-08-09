import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Scanner } from "@/components/ui/scanner";
import { type Procedure } from "@shared/schema";

interface MedicalReportProps {
  procedure: Procedure | null;
  setProcedure: (procedure: Procedure) => void;
  procedureDate: string | null;
  setProcedureDate: (date: string) => void;
  reportContent: string;
  setReportContent: (content: string) => void;
}

export function MedicalReport({ 
  procedure, 
  setProcedure, 
  procedureDate, 
  setProcedureDate, 
  reportContent, 
  setReportContent 
}: MedicalReportProps) {
  const [isScanning, setIsScanning] = useState(false);
  
  const { data: procedures, isLoading: isLoadingProcedures } = useQuery<Procedure[]>({
    queryKey: ["/api/procedures"],
  });

  const handleScanComplete = useCallback((extractedText: string) => {
    setIsScanning(false);
    setReportContent(extractedText);
    
    // Optional: Try to detect procedure from report content
    if (procedures && procedures.length > 0) {
      for (const proc of procedures) {
        if (extractedText.toLowerCase().includes(proc.name.toLowerCase())) {
          setProcedure(proc);
          break;
        }
      }
    }
  }, [procedures, setReportContent, setProcedure]);

  const handleProcedureChange = useCallback((procedureId: string) => {
    const id = parseInt(procedureId);
    const selectedProcedure = procedures?.find(p => p.id === id);
    if (selectedProcedure) {
      setProcedure(selectedProcedure);
    }
  }, [procedures, setProcedure]);

  return (
    <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-medium text-neutral-800 mb-4">Laudo do Exame de Imagem</h3>
      
      {isScanning ? (
        <Scanner
          onScanComplete={handleScanComplete}
          type="medical_report"
        />
      ) : (
        <div className="mb-6 border-2 border-dashed border-neutral-300 rounded-lg p-4 bg-neutral-50">
          <div className="text-center">
            <span className="material-icons text-neutral-400 text-4xl mb-2">image</span>
            <h4 className="font-medium text-neutral-700 mb-1">Escanear Laudo do Exame de Imagem</h4>
            <p className="text-sm text-neutral-500 mb-4">
              Escaneie o laudo do exame de imagem para extrair automaticamente as informações necessárias
            </p>
            
            <button 
              className="bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
              onClick={() => setIsScanning(true)}
            >
              Iniciar Escaneamento
            </button>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <Label htmlFor="report-content">Informações do Laudo do Exame de Imagem</Label>
        <Textarea
          id="report-content"
          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          rows={5}
          placeholder="As informações do laudo aparecerão aqui após o escaneamento..."
          value={reportContent}
          onChange={(e) => setReportContent(e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <Label htmlFor="procedure">Procedimento</Label>
        {isLoadingProcedures ? (
          <Skeleton className="w-full h-10 rounded-md" />
        ) : (
          <Select 
            value={procedure ? procedure.id.toString() : ""} 
            onValueChange={handleProcedureChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o procedimento" />
            </SelectTrigger>
            <SelectContent>
              {procedures?.map((proc) => (
                <SelectItem key={proc.id} value={proc.id.toString()}>
                  {proc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      <div className="mb-4">
        <Label htmlFor="procedure-date">Data Prevista</Label>
        <Input 
          id="procedure-date"
          type="date" 
          className="w-full"
          value={procedureDate || ""}
          onChange={(e) => setProcedureDate(e.target.value)}
        />
      </div>
      
      {procedure && procedure.description && (
        <div className="mt-6 p-4 bg-accent/20 border border-border rounded-md">
          <h4 className="font-medium text-foreground mb-2">Sobre o procedimento:</h4>
          <p className="text-sm text-muted-foreground">{procedure.description}</p>
        </div>
      )}
    </Card>
  );
}
