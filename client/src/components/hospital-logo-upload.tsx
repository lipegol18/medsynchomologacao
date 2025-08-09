import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface HospitalLogoUploadProps {
  logoUrl: string | null;
  onFileChange: (file: File | null) => void;
  inputId?: string;
}

export function HospitalLogoUpload({ 
  logoUrl, 
  onFileChange,
  inputId = "hospital-logo" 
}: HospitalLogoUploadProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Validar tipo de arquivo
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: "Por favor, use arquivos PNG, JPG ou SVG",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }

      // Validar tamanho (máximo 2MB)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo para a logo é 2MB",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }

      // Criar URL para preview
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
      onFileChange(file);
    }
  };

  return (
    <div className="mb-4">
      <Label htmlFor={inputId}>Logo do Hospital</Label>
      <div className="mt-2 flex items-center gap-4">
        {previewUrl && (
          <div className="w-16 h-16 rounded-md border bg-white flex items-center justify-center overflow-hidden">
            <img 
              src={previewUrl} 
              alt="Logo do Hospital" 
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%230a558c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='12' y1='8' x2='12' y2='16'%3E%3C/line%3E%3Cline x1='8' y1='12' x2='16' y2='12'%3E%3C/line%3E%3C/svg%3E";
              }}
            />
          </div>
        )}
        
        <div className="flex-1">
          <Input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/svg+xml"
            onChange={handleFileChange}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Aceita PNG, JPG ou SVG (máx. 2MB)
          </p>
        </div>
      </div>
    </div>
  );
}