import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  ImageIcon,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

interface HospitalLogoCropUploadProps {
  logoUrl: string | null;
  onLogoChange: (logoUrl: string | null) => void;
  inputId?: string;
  hospitalId?: number;
}

export function HospitalLogoCropUpload({ 
  logoUrl, 
  onLogoChange,
  inputId = "hospital-logo",
  hospitalId
}: HospitalLogoCropUploadProps) {
  const { toast } = useToast();
  
  // Estados para o crop
  const [showLogoCrop, setShowLogoCrop] = useState(false);
  const [logoImageSrc, setLogoImageSrc] = useState("");
  const [logoScale, setLogoScale] = useState(1);
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Estados para drag
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const logoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Função para desenhar a imagem no canvas
  const drawImageOnCanvas = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    imageSrc: string,
    scale: number,
    position: { x: number; y: number },
    canvasSize: { width: number; height: number }
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const image = new Image();
    image.onload = () => {
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      
      ctx.drawImage(
        image,
        position.x,
        position.y,
        scaledWidth,
        scaledHeight
      );
    };
    image.src = imageSrc;
  };

  // Função para resetar posição e zoom
  const resetImagePosition = (
    imageSrc: string,
    canvasSize: { width: number; height: number },
    setScale: (scale: number) => void,
    setPosition: (pos: { x: number; y: number }) => void
  ) => {
    const image = new Image();
    image.onload = () => {
      // Calcular escala para fit na área (sem cortar)
      const scaleX = canvasSize.width / image.width;
      const scaleY = canvasSize.height / image.height;
      const scale = Math.min(scaleX, scaleY);
      
      // Centralizar imagem
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      const x = (canvasSize.width - scaledWidth) / 2;
      const y = (canvasSize.height - scaledHeight) / 2;
      
      setScale(scale);
      setPosition({ x, y });
    };
    image.src = imageSrc;
  };

  // Função para obter imagem cropada do canvas
  const getCroppedImageFromCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas não disponível'));
        return;
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Erro ao gerar imagem'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  // Função para lidar com a seleção do arquivo
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 2MB",
          variant: "destructive",
        });
        return;
      }
      
      // Criar URL da imagem e abrir o crop
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setLogoImageSrc(imageSrc);
        setShowLogoCrop(true);
        
        // Resetar posição e zoom quando nova imagem é carregada
        setTimeout(() => {
          resetImagePosition(
            imageSrc,
            { width: 200, height: 100 },
            setLogoScale,
            setLogoPosition
          );
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para confirmar o crop
  const handleLogoCropConfirm = async () => {
    if (!logoImageSrc) return;
    
    try {
      const croppedImageBlob = await getCroppedImageFromCanvas(logoCanvasRef);
      const croppedFile = new File([croppedImageBlob], 'logo.jpg', { type: 'image/jpeg' });
      
      setLogoFile(croppedFile);
      setShowLogoCrop(false);
      
      // Upload automático após o crop
      await handleLogoUpload(croppedFile);
    } catch (error) {
      console.error('Erro ao processar crop do logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a imagem do logo",
        variant: "destructive",
      });
    }
  };

  // Função para fazer upload do logo
  const handleLogoUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || logoFile;
    if (!file || !hospitalId) return;
    
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('hospitalId', hospitalId.toString());
      
      if (logoUrl) {
        formData.append('existingLogoUrl', logoUrl);
      }
      
      const response = await fetch('/api/uploads/hospital-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao fazer upload do logo");
      }
      
      const result = await response.json();
      
      // Notificar o componente pai sobre a mudança
      onLogoChange(result.url);
      
      setLogoFile(null);
      // Limpar o input de arquivo
      const fileInput = document.getElementById(inputId) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({
        title: "Logo enviado",
        description: "O logo do hospital foi enviado com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Funções para controle de drag
  const handleLogoMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = logoCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDraggingLogo(true);
    setDragStart({ x: x - logoPosition.x, y: y - logoPosition.y });
  };

  const handleLogoMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingLogo) return;
    
    const canvas = logoCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPosition = {
      x: x - dragStart.x,
      y: y - dragStart.y
    };
    
    setLogoPosition(newPosition);
    drawImageOnCanvas(
      logoCanvasRef,
      logoImageSrc,
      logoScale,
      newPosition,
      { width: 200, height: 100 }
    );
  };

  const handleLogoMouseUp = () => {
    setIsDraggingLogo(false);
  };

  return (
    <div className="mb-4">
      <Label htmlFor={inputId}>Logo do Hospital</Label>
      <div className="mt-2 space-y-3">
        {logoUrl && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              <ImageIcon className="text-primary w-5 h-5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Logo atual</p>
                <img 
                  src={logoUrl} 
                  alt="Logo do hospital" 
                  className="mt-2 max-h-20 border rounded" 
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onLogoChange(null)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Remover
            </Button>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Upload className="text-primary w-5 h-5" />
          <Input 
            id={inputId}
            type="file"
            accept="image/*"
            onChange={handleLogoFileChange}
            className="flex-1"
          />
        </div>
        
        {logoFile && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <ImageIcon className="text-primary w-4 h-4" />
              <span className="text-sm font-medium">{logoFile.name}</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => handleLogoUpload()}
              disabled={isUploadingLogo}
              className="bg-primary hover:bg-primary/90"
            >
              {isUploadingLogo ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-3 w-3" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Aceita PNG, JPG ou SVG (máx. 2MB)
        </p>
      </div>

      {/* Modal de Crop do Logo */}
      <Dialog open={showLogoCrop} onOpenChange={setShowLogoCrop}>
        <DialogContent className="bg-[#1a2332] border-blue-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-blue-400">Ajustar Logo do Hospital</DialogTitle>
            <DialogDescription className="text-blue-200">
              Ajuste a posição e o tamanho do logo para obter o melhor resultado
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex flex-col items-center space-y-3">
              <canvas
                ref={logoCanvasRef}
                width={200}
                height={100}
                className="border border-gray-300 cursor-move"
                onMouseDown={handleLogoMouseDown}
                onMouseMove={handleLogoMouseMove}
                onMouseUp={handleLogoMouseUp}
                onMouseLeave={handleLogoMouseUp}
              />
            </div>
            
            {/* Controles de zoom e posição */}
            <div className="w-full max-w-md space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Zoom: {Math.round(logoScale * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={logoScale}
                  onChange={(e) => {
                    const newScale = parseFloat(e.target.value);
                    setLogoScale(newScale);
                    drawImageOnCanvas(
                      logoCanvasRef,
                      logoImageSrc,
                      newScale,
                      logoPosition,
                      { width: 200, height: 100 }
                    );
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Posição X</label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="1"
                    value={logoPosition.x}
                    onChange={(e) => {
                      const newPosition = { ...logoPosition, x: parseInt(e.target.value) };
                      setLogoPosition(newPosition);
                      drawImageOnCanvas(
                        logoCanvasRef,
                        logoImageSrc,
                        logoScale,
                        newPosition,
                        { width: 200, height: 100 }
                      );
                    }}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Posição Y</label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="1"
                    value={logoPosition.y}
                    onChange={(e) => {
                      const newPosition = { ...logoPosition, y: parseInt(e.target.value) };
                      setLogoPosition(newPosition);
                      drawImageOnCanvas(
                        logoCanvasRef,
                        logoImageSrc,
                        logoScale,
                        newPosition,
                        { width: 200, height: 100 }
                      );
                    }}
                    className="w-full"
                  />
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetImagePosition(
                    logoImageSrc,
                    { width: 200, height: 100 },
                    setLogoScale,
                    setLogoPosition
                  );
                  setTimeout(() => {
                    drawImageOnCanvas(
                      logoCanvasRef,
                      logoImageSrc,
                      logoScale,
                      logoPosition,
                      { width: 200, height: 100 }
                    );
                  }, 50);
                }}
                className="w-full text-gray-700"
              >
                Centralizar e Ajustar
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogoCrop(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleLogoCropConfirm}
              disabled={isUploadingLogo}
            >
              {isUploadingLogo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Confirmar e Enviar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}