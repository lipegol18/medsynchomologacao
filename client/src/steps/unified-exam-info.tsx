import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UnifiedFileUpload, UnifiedAttachment } from "@/components/unified-file-upload";
import { FileText, StickyNote } from "lucide-react";

interface UnifiedExamInfoProps {
  additionalNotes: string;
  setAdditionalNotes: (notes: string) => void;
  clinicalIndication: string;
  setClinicalIndication: (text: string) => void;
  attachments: UnifiedAttachment[];
  setAttachments: (attachments: UnifiedAttachment[]) => void;
  orderId?: number | null;
  updateOrderField?: (fieldName: string, value: any) => Promise<boolean>;
}

export function UnifiedExamInfo({
  additionalNotes,
  setAdditionalNotes,
  clinicalIndication,
  setClinicalIndication,
  attachments,
  setAttachments,
  orderId,
  updateOrderField
}: UnifiedExamInfoProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAttachmentsChange = async (newAttachments: UnifiedAttachment[]) => {
    setAttachments(newAttachments);
    
    // Se temos um orderId e função de atualização, salvar no banco
    if (orderId && updateOrderField) {
      setIsUpdating(true);
      try {
        await updateOrderField('attachments', newAttachments);
      } catch (error) {
        console.error('Erro ao atualizar anexos:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicação Clínica */}
      <div className="mb-6 text-foreground">
        <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
          {/* Título com fundo azul */}
          <div className="bg-accent-light px-4 py-3">
            <div className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold text-muted-foreground">Indicação Clínica <span className="text-destructive">*</span></h3>
              </div>
            </div>
          </div>
          
          {/* Campo de entrada */}
          <div className="p-5">
            <div className="space-y-2">
              <Textarea
                value={clinicalIndication}
                onChange={(e) => setClinicalIndication(e.target.value)}
                placeholder="Descreva a indicação médica para o procedimento&#10;Ex: Paciente com dor lombar crônica, indicado artrodese..."
                className="min-h-[100px] bg-card text-foreground border-border placeholder:text-muted-foreground focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Unificado de Anexos */}
      <UnifiedFileUpload
        attachments={attachments}
        onAttachmentsChange={handleAttachmentsChange}
        title="Anexos do Pedido"
        description="Faça upload de imagens de exames (raio-X, ressonância, tomografia) e relatórios médicos (PDFs)"
        maxFiles={10}
        disabled={isUpdating}
        orderId={orderId}
      />

      {/* Observações Adicionais */}
      <div className="mb-6 text-foreground">
        <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
          {/* Título com fundo azul */}
          <div className="bg-accent-light px-4 py-3">
            <div className="flex items-center">
              <StickyNote className="mr-2 h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold text-muted-foreground">Observações Adicionais</h3>
              </div>
            </div>
          </div>
          
          {/* Campo de entrada */}
          <div className="p-5">
            <div className="space-y-2">
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Informações complementares sobre o caso&#10;Ex: Paciente alérgico a contraste, procedimento urgente..."
                className="min-h-[80px] bg-card text-foreground border-border placeholder:text-muted-foreground focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status de salvamento */}
      {isUpdating && (
        <div className="flex items-center justify-center p-2 bg-card border border-border rounded-lg">
          <span className="text-sm text-foreground">Salvando anexos...</span>
        </div>
      )}
    </div>
  );
}