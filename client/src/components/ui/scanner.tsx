import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { createWorker } from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  Image as ImageIcon, 
  Check, 
  X,
  Loader2
} from "lucide-react";

interface ScannerProps {
  onScanComplete: (text: string) => void;
  type: "identification" | "medical_report";
}

export function Scanner({ onScanComplete, type }: ScannerProps) {
  const [mode, setMode] = useState<"idle" | "camera" | "upload" | "processing" | "complete" | "error">("idle");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const title = type === "identification" ? "Escanear Documento" : "Escanear Laudo Médico";
  const description = type === "identification" 
    ? "Escaneie um documento de identificação brasileiro para preencher automaticamente os dados do paciente"
    : "Escaneie o laudo médico para extrair automaticamente as informações necessárias";

  const processImage = useCallback(async (imageSource: string) => {
    try {
      setIsProcessing(true);
      setMode("processing");

      const worker = await createWorker("por");
      const result = await worker.recognize(imageSource);
      
      setExtractedText(result.data.text);
      onScanComplete(result.data.text);
      setMode("complete");
      
      await worker.terminate();
    } catch (err) {
      console.error("OCR Error:", err);
      setError("Falha ao processar a imagem. Tente novamente.");
      setMode("error");
    } finally {
      setIsProcessing(false);
    }
  }, [onScanComplete]);

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImageSrc(imageSrc);
        processImage(imageSrc);
      }
    }
  }, [processImage]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setImageSrc(imageSrc);
        processImage(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  }, [processImage]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetScanner = useCallback(() => {
    setMode("idle");
    setImageSrc(null);
    setExtractedText("");
    setError(null);
    setIsProcessing(false);
  }, []);

  const renderContent = () => {
    switch (mode) {
      case "idle":
        return (
          <div className="text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
            <h4 className="font-medium text-neutral-700 mb-1">{title}</h4>
            <p className="text-sm text-neutral-500 mb-4">{description}</p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button 
                onClick={() => setMode("camera")}
                className="flex items-center justify-center"
              >
                <Camera className="mr-2 h-4 w-4" />
                Usar Câmera
              </Button>
              <Button 
                variant="outline" 
                onClick={handleUploadClick}
                className="flex items-center justify-center"
              >
                <Upload className="mr-2 h-4 w-4" />
                Carregar Arquivo
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </div>
          </div>
        );
      
      case "camera":
        return (
          <div className="text-center">
            <div className="mb-4 relative rounded-md overflow-hidden">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-auto"
                videoConstraints={{
                  facingMode: "environment"
                }}
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={handleCapture}>Capturar</Button>
              <Button variant="outline" onClick={resetScanner}>Cancelar</Button>
            </div>
          </div>
        );
      
      case "processing":
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary-500 animate-spin" />
            <p className="text-neutral-700">Processando imagem...</p>
            <p className="text-sm text-neutral-500 mt-1">Isso pode levar alguns segundos</p>
          </div>
        );
      
      case "complete":
        return (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative inline-block">
                <img 
                  src={imageSrc || ""} 
                  alt="Documento escaneado" 
                  className="max-h-48 max-w-full rounded-md"
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                  <Check className="h-4 w-4" />
                </div>
              </div>
            </div>
            <p className="text-green-600 font-medium mb-2">Documento processado com sucesso!</p>
            <div className="mb-4">
              <p className="text-sm text-neutral-500">
                {type === "identification" 
                  ? "Dados do paciente extraídos" 
                  : "Informações do laudo extraídas"}
              </p>
            </div>
            <Button variant="outline" onClick={resetScanner}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Escanear novamente
            </Button>
          </div>
        );
      
      case "error":
        return (
          <div className="text-center">
            <div className="mb-4 relative rounded-md overflow-hidden">
              {imageSrc && (
                <img 
                  src={imageSrc} 
                  alt="Imagem com erro" 
                  className="max-h-48 max-w-full mx-auto rounded-md opacity-70"
                />
              )}
              <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full">
                <X className="h-4 w-4" />
              </div>
            </div>
            <p className="text-red-600 font-medium mb-2">Ocorreu um erro</p>
            <p className="text-sm text-neutral-500 mb-4">{error || "Não foi possível processar o documento"}</p>
            <Button variant="outline" onClick={resetScanner}>Tentar novamente</Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="mb-6 border-2 border-dashed border-neutral-300 bg-neutral-50">
      <CardContent className="p-4">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
