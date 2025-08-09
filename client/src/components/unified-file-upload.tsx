import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileImage, FileText, Upload, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

// Tipo unificado para anexos
export interface UnifiedAttachment {
  id?: string;
  filename: string;
  url: string;
  type: 'image' | 'pdf';
  size?: number;
  uploadedAt?: string;
}

interface UnifiedFileUploadProps {
  attachments: UnifiedAttachment[];
  onAttachmentsChange: (attachments: UnifiedAttachment[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  title?: string;
  description?: string;
  disabled?: boolean;
  orderId?: number | null; // ID do pedido para organizar arquivos
}

export function UnifiedFileUpload({
  attachments = [],
  onAttachmentsChange,
  maxFiles = 10,
  acceptedTypes = ['image/*', '.pdf'],
  title = "Anexos",
  description = "Faça upload de imagens de exames e relatórios médicos",
  disabled = false,
  orderId = null
}: UnifiedFileUploadProps) {

  
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<UnifiedAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para processar arquivos selecionados
  const processFiles = async (files: FileList | File[]) => {
    if (disabled || isUploading) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValidType = acceptedTypes.some(type => 
        type === 'image/*' ? file.type.startsWith('image/') : 
        type === '.pdf' ? file.type === 'application/pdf' : 
        file.type === type
      );
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) return;
    if (attachments.length + validFiles.length > maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    setIsUploading(true);
    
    try {
      const newAttachments: UnifiedAttachment[] = [];
      
      for (const file of validFiles) {
        // Upload real via API
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          // Debug do orderId
          console.log('📤 Upload - orderId disponível:', orderId);
          
          // Usar APENAS rota específica do pedido - rota antiga removida
          if (!orderId) {
            throw new Error('ID do pedido é obrigatório para upload');
          }
          const uploadUrl = `/api/upload-attachment/${orderId}`;
            
          console.log('📤 Upload - URL escolhida:', uploadUrl);
            
          const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Erro no upload');
          }
          
          const result = await response.json();
          
          newAttachments.push({
            id: result.id || Math.random().toString(36),
            filename: file.name,
            url: result.url,
            type: file.type.startsWith('image/') ? 'image' : 'pdf',
            size: file.size,
            uploadedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Erro no upload de ${file.name}:`, error);
          // Para fins de desenvolvimento, criar URL temporária
          newAttachments.push({
            id: Math.random().toString(36),
            filename: file.name,
            url: URL.createObjectURL(file),
            type: file.type.startsWith('image/') ? 'image' : 'pdf',
            size: file.size,
            uploadedAt: new Date().toISOString()
          });
        }
      }

      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
      }
    } catch (error) {
      console.error('Erro no processamento dos arquivos:', error);
      alert('Erro ao processar os arquivos');
    } finally {
      setIsUploading(false);
    }
  };

  // Função para o drag and drop
  const handleFileDrop = async (files: FileList) => {
    await processFiles(files);
  };

  // Função para seleção via input
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await processFiles(files);
    }
    // Limpar o input para permitir re-seleção do mesmo arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = async (index: number) => {
    if (disabled) return;
    
    const attachmentToRemove = attachments[index];
    console.log('🗑️ Removendo anexo:', attachmentToRemove);
    
    try {
      // Excluir o arquivo físico do servidor
      if (attachmentToRemove?.url && orderId) {
        const filename = attachmentToRemove.url.split('/').pop();
        console.log('🗑️ Excluindo arquivo físico:', filename);
        
        const deleteResponse = await fetch(`/api/delete-attachment/${orderId}/${filename}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (deleteResponse.ok) {
          console.log('✅ Arquivo físico excluído com sucesso');
        } else {
          console.warn('⚠️ Erro ao excluir arquivo físico, mas continuando com remoção da lista');
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao excluir arquivo físico:', error);
    }
    
    // Remover da lista
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  const getFileIcon = (type: 'image' | 'pdf') => {
    return type === 'image' ? FileImage : FileText;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)}KB` : `${mb.toFixed(1)}MB`;
  };

  return (
    <div className="mb-6 text-foreground">
      <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
        {/* Título com fundo azul */}
        <div className="bg-accent-light px-4 py-3">
          <div className="flex items-center">
            <Upload className="mr-2 h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
            </div>
          </div>
        </div>
        
        {/* Área de conteúdo */}
        <div className="p-5">
          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="space-y-4">
        {/* Área de upload */}
        <div
          className="p-8 border-2 border-dashed border-border rounded-lg transition-colors hover:border-border/80 cursor-pointer"
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled && !isUploading) {
              const files = e.dataTransfer.files;
              if (files.length > 0) {
                handleFileDrop(files);
              }
            }
          }}
        >
          <div className="text-center">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-foreground">
                  {isUploading ? 'Enviando arquivos...' : 'Clique ou arraste arquivos aqui'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Imagens (JPG, PNG) ou PDFs • Máximo {maxFiles} arquivos
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Input oculto para fallback */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Lista de anexos unificada */}
        {attachments.filter(att => att.type === 'image' || (att.type === 'pdf' && !att.filename.includes('pedido_'))).length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {attachments.filter(att => att.type === 'image' || (att.type === 'pdf' && !att.filename.includes('pedido_'))).map((attachment, index) => {
                const originalIndex = attachments.findIndex(att => att === attachment);
                const Icon = getFileIcon(attachment.type);
                return (
                  <div
                    key={originalIndex}
                    className="flex flex-col p-2 border-border rounded-lg bg-card hover:bg-accent-light transition-colors items-center"
                  >
                    {/* Thumbnail/Icon */}
                    <div 
                      className="w-32 h-32 mb-2 rounded border overflow-hidden bg-white flex-shrink-0 mx-auto cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setPreviewFile(attachment)}
                    >
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt={attachment.filename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback para ícone se imagem não carregar
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-muted"><svg class="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg></div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10">
                          <Icon className="h-8 w-8 text-destructive mb-1" />
                          <span className="text-xs text-destructive font-medium">PDF</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Informações do arquivo */}
                    <div className="flex-1 min-w-0 mb-2">
                      <p className="text-sm font-medium text-foreground truncate" title={attachment.filename}>
                        {attachment.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAttachment(originalIndex)}
                        disabled={disabled}
                        className=" text-white text-xs px-3 py-1 h-7"
                      >
                        Apagar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preview modal */}
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh]">
            <DialogHeader>
              <DialogTitle>Preview: {previewFile?.filename}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              {previewFile && (
                <>
                  {previewFile.type === 'image' ? (
                    <img
                      src={previewFile.url}
                      alt={previewFile.filename}
                      className="max-w-full max-h-[75vh] object-contain"
                    />
                  ) : (
                    <iframe
                      src={previewFile.url}
                      title={previewFile.filename}
                      className="w-full h-[75vh] border-0"
                    />
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}