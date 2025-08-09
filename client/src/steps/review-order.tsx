import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { jsPDF } from "jspdf";
import { 
  User, 
  FileText, 
  BriefcaseMedical,
  FileCheck,
  Loader2,
  Building2
} from "lucide-react";
import { type Patient, type Procedure, type OpmeItem, type Hospital } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ReviewOrderProps {
  selectedHospital: Hospital | null;
  patient: Patient | null;
  procedure: Procedure | null;
  procedureDate: string | null;
  reportContent: string;
  selectedItems: { item: OpmeItem; quantity: number }[];
  additionalNotes: string;
  setAdditionalNotes: (notes: string) => void;
}

export function ReviewOrder({ 
  selectedHospital,
  patient, 
  procedure, 
  procedureDate, 
  reportContent, 
  selectedItems,
  additionalNotes,
  setAdditionalNotes
}: ReviewOrderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Não definida";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const handleGenerateOrder = async () => {
    if (!selectedHospital || !patient || !procedure) {
      toast({
        title: "Dados incompletos",
        description: "Informações do hospital, paciente ou procedimento estão faltando.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      // 1. Save medical order to backend
      const orderResponse = await apiRequest<any>("/api/medical-orders", {
        method: "POST",
        body: JSON.stringify({
          hospitalId: selectedHospital.id,
          patientId: patient.id,
          procedureId: procedure.id,
          procedureDate,
          reportContent,
          additionalNotes,
        })
      });
      
      const order = orderResponse;
      
      // 2. Save order items
      for (const { item, quantity } of selectedItems) {
        await apiRequest<any>(`/api/medical-orders/${order.id}/items`, {
          method: "POST",
          body: JSON.stringify({
            opmeItemId: item.id,
            quantity,
          })
        });
      }

      // 3. Generate PDF
      generatePDF();
      
      // 4. Update queries
      queryClient.invalidateQueries({ queryKey: ["/api/medical-orders"] });
      
      toast({
        title: "Pedido gerado com sucesso!",
        description: "O pedido cirúrgico foi salvo e o PDF foi gerado.",
      });
      
      // 5. Redirect to home after a delay
      setTimeout(() => {
        navigate("/");
      }, 1500);
      
    } catch (error) {
      console.error("Error generating order:", error);
      toast({
        title: "Erro ao gerar pedido",
        description: "Ocorreu um erro ao salvar o pedido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = () => {
    if (!selectedHospital || !patient || !procedure) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PEDIDO CIRÚRGICO", 105, 20, { align: "center" });
    
    // Hospital info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("HOSPITAL", 20, 35);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${selectedHospital.name}`, 20, 42);
    doc.text(`CNPJ: ${selectedHospital.cnpj}`, 20, 49);
    doc.text(`UF: ${selectedHospital.uf}`, 20, 56);
    
    // Patient info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO PACIENTE", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${patient.fullName}`, 20, 77);
    doc.text(`CPF: ${patient.cpf}`, 20, 84);
    doc.text(`Data de Nascimento: ${formatDate(patient.birthDate)}`, 20, 91);
    doc.text(`Convênio: ${patient.insurance || "Não informado"}`, 20, 98);
    doc.text(`Carteirinha: ${patient.insuranceNumber || "Não informado"}`, 130, 98);
    
    // Procedure info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO PROCEDIMENTO", 20, 112);
    doc.setFont("helvetica", "normal");
    doc.text(`Procedimento: ${procedure.name}`, 20, 119);
    doc.text(`Data Prevista: ${formatDate(procedureDate)}`, 20, 126);
    
    // Report content
    if (reportContent) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("LAUDO MÉDICO", 20, 140);
      doc.setFont("helvetica", "normal");
      
      // Wrap text to fit page width
      const textLines = doc.splitTextToSize(reportContent, 170);
      doc.text(textLines, 20, 147);
    }
    
    // OPME items
    const yPosition = reportContent ? 180 : 140;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ITENS OPME SOLICITADOS", 20, yPosition);
    
    // Create table for OPME items
    let tableY = yPosition + 10;
    doc.setFontSize(10);
    
    // Table header
    doc.setFont("helvetica", "bold");
    doc.text("Descrição", 20, tableY);
    doc.text("Código", 100, tableY);
    doc.text("Fabricante", 130, tableY);
    doc.text("Qtd.", 180, tableY);
    
    // Table lines
    doc.line(20, tableY + 2, 190, tableY + 2);
    tableY += 10;
    
    // Table content
    doc.setFont("helvetica", "normal");
    selectedItems.forEach(({ item, quantity }) => {
      // Check if we need a new page
      if (tableY > 270) {
        doc.addPage();
        tableY = 20;
      }
      
      doc.text(item.name, 20, tableY);
      doc.text(item.code, 100, tableY);
      doc.text(item.manufacturer, 130, tableY);
      doc.text(quantity.toString(), 180, tableY);
      
      tableY += 8;
    });
    
    // Additional notes
    if (additionalNotes) {
      // Check if we need a new page
      if (tableY > 250) {
        doc.addPage();
        tableY = 20;
      } else {
        tableY += 10;
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("OBSERVAÇÕES ADICIONAIS", 20, tableY);
      doc.setFont("helvetica", "normal");
      
      // Wrap text to fit page width
      const notesLines = doc.splitTextToSize(additionalNotes, 170);
      doc.text(notesLines, 20, tableY + 10);
    }
    
    // Download PDF
    doc.save(`pedido_cirurgico_${patient.fullName.replace(/\s/g, "_")}.pdf`);
  };

  return (
    <Card className="bg-card rounded-lg shadow-md p-6 mb-6 border-border">
      <h3 className="text-lg font-medium text-foreground mb-4">Revisão do Pedido Cirúrgico</h3>
      
      <div className="mb-6">
        <h4 className="font-medium text-foreground mb-2 flex items-center">
          <Building2 className="mr-1 h-4 w-4 text-primary" />
          Hospital
        </h4>
        <div className="bg-accent/20 p-4 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Nome do Hospital</div>
              <div className="font-medium text-foreground">{selectedHospital?.name || "Não informado"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">CNPJ</div>
              <div className="font-medium text-foreground">{selectedHospital?.cnpj || "Não informado"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">UF</div>
              <div className="font-medium text-foreground">{selectedHospital?.uf || "Não informada"}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="font-medium text-foreground mb-2 flex items-center">
          <User className="mr-1 h-4 w-4 text-primary" />
          Dados do Paciente
        </h4>
        <div className="bg-accent/20 p-4 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Nome Completo</div>
              <div className="font-medium text-foreground">{patient?.fullName || "Não informado"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">CPF</div>
              <div className="font-medium text-foreground">{patient?.cpf || "Não informado"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Data de Nascimento</div>
              <div className="font-medium text-foreground">
                {patient?.birthDate ? formatDate(patient.birthDate) : "Não informada"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Convênio</div>
              <div className="font-medium text-foreground">
                {patient?.insurance 
                  ? `${patient.insurance}${patient.insuranceNumber ? ` - ${patient.insuranceNumber}` : ""}` 
                  : "Não informado"}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="font-medium text-foreground mb-2 flex items-center">
          <FileText className="mr-1 h-4 w-4 text-primary" />
          Procedimento
        </h4>
        <div className="bg-accent/20 p-4 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Tipo de Procedimento</div>
              <div className="font-medium text-foreground">{procedure?.name || "Não informado"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Data Prevista</div>
              <div className="font-medium text-foreground">{procedureDate ? formatDate(procedureDate) : "Não informada"}</div>
            </div>
          </div>
          {reportContent && (
            <div className="mt-3">
              <div className="text-sm text-muted-foreground">Descrição do Laudo</div>
              <div className="text-sm mt-1 text-foreground">{reportContent}</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="font-medium text-foreground mb-2 flex items-center">
          <BriefcaseMedical className="mr-1 h-4 w-4 text-primary" />
          Itens OPME Solicitados
        </h4>
        <div className="bg-accent/20 p-4 rounded-lg border border-border">
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-muted-foreground">Código</TableHead>
                  <TableHead className="text-muted-foreground">Fabricante</TableHead>
                  <TableHead className="text-muted-foreground">Qtd.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map(({ item, quantity }) => (
                  <TableRow key={item.id} className="border-b border-border hover:bg-muted/50">
                    <TableCell className="text-foreground">{item.name}</TableCell>
                    <TableCell className="text-sm text-primary">{item.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.manufacturer}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="font-medium text-foreground mb-2">Observações Adicionais</h4>
        <Textarea
          className="w-full bg-card text-foreground border-border focus:border-primary focus:ring-primary"
          rows={2}
          placeholder="Adicione observações adicionais, se necessário..."
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
        />
      </div>
      
      <div className="mt-6 text-center">
        <Button 
          className="bg-green-600 hover:bg-green-700 text-foreground"
          size="lg"
          onClick={handleGenerateOrder}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando Pedido...
            </>
          ) : (
            <>
              <FileCheck className="mr-2 h-5 w-5" />
              Gerar Pedido Cirúrgico
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
