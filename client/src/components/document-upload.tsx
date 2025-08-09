import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TranslatedText } from "@/components/ui/translated-text";
import { 
  Upload, 
  FileText, 
  CreditCard, 
  Loader2
} from "lucide-react";
import { 
  processDocument, 
  DocumentType, 
  ExtractedDocumentData 
} from "@/lib/document-processor";
import { t } from "@/lib/i18n";

interface DocumentUploadProps {
  onProcessed: (data: ExtractedDocumentData) => void;
  onError?: (error: Error) => void;
  variant?: "id" | "insurance" | "both";
  className?: string;
}

export function DocumentUpload({ 
  onProcessed, 
  onError, 
  variant = "both",
  className 
}: DocumentUploadProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };
  
  const handleIdUpload = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para fazer upload",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      toast({
        title: t("document.processing"),
        description: t("document.processing.description"),
      });
      
      const extractedData = await processDocument(file);
      
      if (
        (variant === "id" && extractedData.documentType !== DocumentType.ID_DOCUMENT) ||
        (variant === "insurance" && extractedData.documentType !== DocumentType.INSURANCE_CARD)
      ) {
        toast({
          title: t("document.processed.failure"),
          description: t("document.processed.failure.description")
        });
      } else if (extractedData.confidence > 0.3) {
        toast({
          title: t("document.processed.success"),
          description: t("document.processed.success.description")
        });
      } else {
        toast({
          title: t("document.processed.failure"),
          description: t("document.processed.failure.description")
        });
      }
      
      onProcessed(extractedData);
      setFile(null);
      
      // Limpar input
      const input = document.getElementById('document-upload') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error) {
      console.error("Erro ao processar documento:", error);
      toast({
        title: t("document.error"),
        description: t("document.error.description"),
        variant: "destructive"
      });
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleInsuranceUpload = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para fazer upload",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      toast({
        title: t("insurance.processing"),
        description: t("insurance.processing.description"),
      });
      
      const extractedData = await processDocument(file);
      
      if (extractedData.documentType !== DocumentType.INSURANCE_CARD) {
        toast({
          title: t("insurance.processed.failure"),
          description: t("insurance.processed.failure.description")
        });
      } else if (extractedData.confidence > 0.3) {
        toast({
          title: t("insurance.processed.success"),
          description: t("insurance.processed.success.description")
        });
      } else {
        toast({
          title: t("insurance.processed.failure"),
          description: t("insurance.processed.failure.description")
        });
      }
      
      onProcessed(extractedData);
      setFile(null);
      
      // Limpar input
      const input = document.getElementById('insurance-upload') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error) {
      console.error("Erro ao processar carteirinha:", error);
      toast({
        title: t("insurance.error"),
        description: t("insurance.error.description"),
        variant: "destructive"
      });
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card className={`shadow border-primary/20 ${className}`}>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label htmlFor="document-upload">
            <TranslatedText textKey="button.upload.document" />
          </Label>
          <Input
            id="document-upload"
            type="file"
            accept="image/*"
            className="mt-2"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(variant === "both" || variant === "id") && (
            <Button
              onClick={handleIdUpload}
              disabled={!file || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              <TranslatedText textKey="button.upload.document" />
            </Button>
          )}
          
          {(variant === "both" || variant === "insurance") && (
            <Button
              onClick={handleInsuranceUpload}
              disabled={!file || isProcessing}
              variant="outline"
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              <TranslatedText textKey="button.upload.insurance" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}