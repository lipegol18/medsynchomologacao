import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileImage, FileText, Upload, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFileUrl, deleteFile, uploadExamImage as uploadImage, uploadMedicalReport as uploadReport } from "@/lib/file-upload";
import { DragDropZone } from "@/components/ui/drag-drop-zone";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

interface ExamInfoProps {
  additionalNotes: string;
  setAdditionalNotes: (notes: string) => void;
  medicalReport: File | null;
  setMedicalReport: (file: File | null) => void;
  clinicalIndication: string;
  setClinicalIndication: (text: string) => void;
  // Array unificado de imagens de exame (novo modelo)
  examImages: File[];
  setExamImages: (files: File[]) => void;
  // Array de arquivos de laudos médicos (novo modelo)
  medicalReports: File[];
  setMedicalReports: (files: File[]) => void;
  // Adicionar URLs de arquivos do servidor
  imageUrls?: string[]; // Array unificado de URLs de imagens no banco de dados
  medicalReportUrl?: string | null;
  medicalReportUrls?: string[]; // Array de URLs de laudos médicos
  // Função para atualizar campos do pedido no banco de dados
  updateOrderField?: (fieldName: string, value: any) => Promise<boolean>;
  // ID do pedido atual
  orderId?: number | null;
}

export function ExamInfo({
  additionalNotes,
  setAdditionalNotes,
  medicalReport, 
  setMedicalReport,
  clinicalIndication,
  setClinicalIndication,
  examImages = [],
  setExamImages,
  medicalReports = [],
  setMedicalReports,
  imageUrls = [],
  medicalReportUrl = null,
  medicalReportUrls = [],
  updateOrderField,
  orderId
}: ExamInfoProps) {
  const [processingImage, setProcessingImage] = useState(false);
  const [processingReport, setProcessingReport] = useState(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  
  // Lista de todas as imagens com preview (tanto arquivos quanto URLs)
  const [imagePreviews, setImagePreviews] = useState<{file?: File, preview: string, url?: string}[]>([]);
  
  // Lista de todos os laudos com preview (tanto arquivos quanto URLs)
  const [reportPreviews, setReportPreviews] = useState<{file?: File, preview: string, url?: string, name: string}[]>([]);
  
  // Carregar previews de imagens do servidor (se houver)
  useEffect(() => {
    console.log("🖼️ ExamInfo: Atualizando previews com imageUrls:", imageUrls);
    
    if (imageUrls && imageUrls.length > 0) {
      // Converter URLs em objetos de preview
      const previews = imageUrls.map(url => ({
        preview: getFileUrl(url),
        url: url
      }));
      
      // Atualizar o estado com os previews das imagens do servidor
      setImagePreviews(previews);
      console.log(`✅ Carregados ${previews.length} previews de imagens do servidor`);
    } else {
      // Se não há URLs, limpar os previews apenas se não temos arquivos locais
      if (examImages.length === 0) {
        setImagePreviews([]);
        console.log("🧹 Previews limpos - nenhuma imagem encontrada");
      }
    }
  }, [imageUrls, examImages.length]);

  // Estado para armazenar informações do laudo do servidor
  const [reportFromUrl, setReportFromUrl] = useState<{name: string, url: string} | null>(null);
  
  // Estado para gerenciar a remoção de imagens específicas
  const [removalInProgress, setRemovalInProgress] = useState<boolean>(false);
  
  // Estados para visualização ampliada da imagem
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
  // Carregar previews de laudos do servidor (se houver)
  useEffect(() => {
    console.log("📄 ExamInfo: Atualizando previews dos laudos com medicalReportUrls:", medicalReportUrls);
    
    if (medicalReportUrls && medicalReportUrls.length > 0) {
      // Converter URLs em objetos de preview
      const previews = medicalReportUrls.map(url => {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        const decodedName = decodeURIComponent(filename);
        
        return {
          preview: getFileUrl(url),
          url: url,
          name: decodedName
        };
      });
      
      // Atualizar o estado com os previews dos laudos do servidor apenas se não há previews locais
      if (reportPreviews.length === 0 || reportPreviews.every(p => !p.file)) {
        setReportPreviews(previews);
        console.log(`✅ Carregados ${previews.length} previews de laudos do servidor`);
      }
      
      // Manter compatibilidade com o laudo único
      if (medicalReportUrls.length > 0) {
        const firstReportUrl = medicalReportUrls[0];
        const parts = firstReportUrl.split('/');
        const filename = parts[parts.length - 1];
        const decodedName = decodeURIComponent(filename);
        
        setReportFromUrl({
          name: decodedName,
          url: firstReportUrl
        });
      }
    } else {
      // Se não há URLs, limpar os previews apenas se não temos arquivos locais
      if (medicalReports.length === 0) {
        setReportPreviews([]);
        setReportFromUrl(null);
        console.log("🧹 Previews de laudos limpos - nenhum laudo encontrado");
      }
    }
  }, [medicalReportUrls]);

  // Processar novos arquivos de laudo selecionados localmente
  useEffect(() => {
    if (medicalReports.length > 0) {
      console.log("📄 Processando novos arquivos de laudo:", medicalReports.map(f => f.name));
      
      // Criar previews para os arquivos locais
      const processFiles = async () => {
        const promises = medicalReports.map(file => 
          new Promise<{file: File, preview: string, name: string}>((resolve) => {
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            
            if (isPdf) {
              resolve({
                file,
                preview: '/api/uploads/pdf-preview',
                name: file.name
              });
            } else {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target) {
                  resolve({
                    file,
                    preview: event.target.result as string,
                    name: file.name
                  });
                }
              };
              reader.readAsDataURL(file);
            }
          })
        );
        
        const newPreviews = await Promise.all(promises);
        
        // Mesclar com previews existentes do servidor, evitando duplicações
        const existingServerPreviews = reportPreviews.filter(p => !p.file);
        const allPreviews = [...existingServerPreviews, ...newPreviews];
        
        setReportPreviews(allPreviews);
        console.log(`✅ Total de ${allPreviews.length} previews de laudos (${existingServerPreviews.length} do servidor + ${newPreviews.length} locais)`);
      };
      
      processFiles();
    }
  }, [medicalReports]);

  // Função local para upload de imagem
  const uploadExamImage = async (file: File, patientId?: number, orderId?: number) => {
    console.log(`Enviando upload de imagem com patientId=${patientId}, orderId=${orderId}`);
    
    try {
      // Usando a função importada da biblioteca para garantir consistência
      const result = await uploadImage(file, patientId, orderId);
      console.log("Upload de imagem concluído com sucesso:", result);
      return result;
    } catch (error) {
      console.error("Erro no upload da imagem:", error);
      throw error;
    }
  };

  // Quando o usuário seleciona arquivos de imagem
  const handleExamImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      console.log(`Selecionadas ${newFiles.length} imagens:`, 
        newFiles.map(f => f.name).join(", "));
      
      // Adicionar todas as novas imagens com prévia
      const promises = newFiles.map(file => 
        new Promise<{file: File, preview: string}>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target) {
              resolve({
                file,
                preview: event.target.result as string
              });
            }
          };
          reader.readAsDataURL(file);
        })
      );
      
      setProcessingImage(true);
      
      // Criar previews das imagens
      const newImages = await Promise.all(promises);
      
      // Atualizar o estado com as novas imagens
      setImagePreviews([...imagePreviews, ...newImages]);
      
      // Atualizar o array de arquivos para o componente pai
      const allFileImages = [...examImages];
      newFiles.forEach(file => {
        // Verificar se o arquivo já existe no array para evitar duplicações
        const exists = allFileImages.some(
          existingFile => existingFile.name === file.name && existingFile.size === file.size
        );
        if (!exists) {
          allFileImages.push(file);
        }
      });
      
      setExamImages(allFileImages);
      
      // Iniciar o upload imediato das imagens
      if (orderId) {
        try {
          console.log(`Iniciando upload imediato de ${newFiles.length} imagens...`);
          
          // Obter URLs existentes
          const existingUrls = imageUrls || [];
          let newUploadedUrls = [...existingUrls];
          
          // Upload das imagens diretamente para o servidor
          for (const file of newFiles) {
            try {
              const formData = new FormData();
              formData.append('image', file);
              formData.append('patientId', orderId.toString()); // Usamos orderId como pacienteId temporariamente
              formData.append('orderId', orderId.toString());
              
              console.log(`Enviando imagem ${file.name} para o servidor...`);
              
              const response = await fetch('/api/uploads/exam-image', {
                method: 'POST',
                body: formData,
                credentials: 'include'
              });
              
              if (response.ok) {
                const result = await response.json();
                newUploadedUrls.push(result.url);
                console.log(`Imagem ${file.name} enviada com sucesso:`, result.url);
              } else {
                console.error(`Erro ao enviar imagem ${file.name}: Status ${response.status}`);
              }
            } catch (error) {
              console.error(`Erro ao processar upload da imagem ${file.name}:`, error);
            }
          }
          
          // Atualizar o banco de dados com as novas URLs
          if (updateOrderField && newUploadedUrls.length > existingUrls.length) {
            console.log("Atualizando banco de dados com novas URLs:", newUploadedUrls);
            const updated = await updateOrderField("exam_images_url", newUploadedUrls);
            if (updated) {
              console.log("URLs de imagens atualizadas no banco de dados:", newUploadedUrls);
            } else {
              console.error("Falha ao atualizar URLs de imagens no banco de dados");
            }
          }
        } catch (error) {
          console.error("Erro ao processar upload imediato:", error);
        }
      } else {
        console.log("Upload imediato não realizado pois não há ID do pedido disponível");
      }
      
      setProcessingImage(false);
      console.log(`Total de ${allFileImages.length} imagens após seleção`);
    }
  };

  // Quando o usuário seleciona arquivos de laudo
  const handleMedicalReportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      console.log(`Selecionados ${newFiles.length} laudos:`, 
        newFiles.map(f => f.name).join(", "));
      
      // Adicionar todos os novos laudos com prévia
      const promises = newFiles.map(file => 
        new Promise<{file: File, preview: string, name: string}>((resolve) => {
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          
          if (isPdf) {
            // Para PDFs, usar um preview genérico
            resolve({
              file,
              preview: '/api/uploads/pdf-preview',
              name: file.name
            });
          } else {
            // Para imagens, criar preview
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target) {
                resolve({
                  file,
                  preview: event.target.result as string,
                  name: file.name
                });
              }
            };
            reader.readAsDataURL(file);
          }
        })
      );
      
      setProcessingReport(true);
      
      // Criar previews dos laudos
      const newReports = await Promise.all(promises);
      
      // Atualizar o estado com os novos laudos
      setReportPreviews([...reportPreviews, ...newReports]);
      
      // Atualizar o array de arquivos para o componente pai
      const allFileReports = [...medicalReports];
      newFiles.forEach(file => {
        // Verificar se o arquivo já existe no array para evitar duplicações
        const exists = allFileReports.some(
          existingFile => existingFile.name === file.name && existingFile.size === file.size
        );
        if (!exists) {
          allFileReports.push(file);
        }
      });
      
      setMedicalReports(allFileReports);
      
      // Manter compatibilidade com laudo único
      if (newFiles.length > 0) {
        setMedicalReport(newFiles[0]);
      }
      
      // Iniciar o upload imediato dos laudos
      if (orderId) {
        try {
          console.log(`Iniciando upload imediato de ${newFiles.length} laudos...`);
          
          // Obter URLs existentes
          const existingUrls = medicalReportUrls || [];
          let newUploadedUrls = [...existingUrls];
          
          // Upload dos laudos diretamente para o servidor
          for (const file of newFiles) {
            try {
              const formData = new FormData();
              formData.append('report', file);
              formData.append('patientId', orderId.toString());
              formData.append('orderId', orderId.toString());
              
              console.log(`Enviando laudo ${file.name} para o servidor...`);
              
              const response = await fetch('/api/uploads/medical-report', {
                method: 'POST',
                body: formData,
                credentials: 'include'
              });
              
              if (response.ok) {
                const result = await response.json();
                newUploadedUrls.push(result.url);
                console.log(`Laudo ${file.name} enviado com sucesso:`, result.url);
              } else {
                console.error(`Erro ao enviar laudo ${file.name}: Status ${response.status}`);
              }
            } catch (error) {
              console.error(`Erro ao processar upload do laudo ${file.name}:`, error);
            }
          }
          
          // Atualizar o banco de dados com as novas URLs
          if (updateOrderField && newUploadedUrls.length > existingUrls.length) {
            console.log("Atualizando banco de dados com novas URLs de laudos:", newUploadedUrls);
            const updated = await updateOrderField("medical_report_url", newUploadedUrls);
            if (updated) {
              console.log("URLs de laudos atualizadas no banco de dados:", newUploadedUrls);
            } else {
              console.error("Falha ao atualizar URLs de laudos no banco de dados");
            }
          }
        } catch (error) {
          console.error("Erro ao processar upload imediato dos laudos:", error);
        }
      } else {
        console.log("Upload imediato não realizado pois não há ID do pedido disponível");
      }
      
      setProcessingReport(false);
      console.log(`Total de ${allFileReports.length} laudos após seleção`);
    }
  };

  // Função para adicionar imagens foi removida, usando apenas o upload de imagens principal

  // Referência para o input de imagem principal
  const examImageInputRef = useRef<HTMLInputElement>(null);
  
  // Remover todas as imagens
  const removeAllImages = async () => {
    // Limpar completamente o estado local relacionado às imagens
    setImagePreviews([]);
    setExamImages([]);
    
    // Resetar o valor do input para permitir a seleção do mesmo arquivo novamente
    if (examImageInputRef.current) {
      examImageInputRef.current.value = "";
    }
    
    // Verificar se há URLs de imagens para remover do servidor
    if (imageUrls && imageUrls.length > 0) {
      console.log("Removendo imagens do servidor:", imageUrls);
      
      try {
        // Remover cada uma das imagens do servidor
        for (const url of imageUrls) {
          // Chamar a API para excluir o arquivo do servidor
          const deleted = await deleteFile(url);
          
          if (deleted) {
            console.log(`Imagem ${url} excluída com sucesso do servidor`);
          } else {
            console.error(`Falha ao excluir imagem ${url} do servidor`);
          }
        }
        
        // Se temos uma função para atualizar o banco de dados, removemos a referência das imagens
        if (updateOrderField && orderId) {
          const updated = await updateOrderField("exam_images_url", []);
          if (updated) {
            console.log("Referências das imagens removidas do banco de dados");
          } else {
            console.error("Falha ao remover referências das imagens do banco de dados");
          }
        }
      } catch (error) {
        console.error("Erro ao excluir imagens do servidor:", error);
      }
    }
    
    // Garantir que o estado é completamente resetado para permitir nova seleção
    // Usar um timeout para garantir que o React tenha tempo de atualizar o DOM
    setTimeout(() => {
      if (examImageInputRef.current) {
        examImageInputRef.current.value = "";
      }
      
      // Avisar ao console que a limpeza foi concluída
      console.log("Campo de upload de imagem resetado e pronto para nova seleção");
    }, 200);
  };

  // Referência para o input de laudo médico
  const medicalReportInputRef = useRef<HTMLInputElement>(null);

  // Remover todos os laudos
  const removeAllMedicalReports = async () => {
    // Limpar completamente o estado local relacionado aos laudos
    setReportPreviews([]);
    setMedicalReports([]);
    setMedicalReport(null);
    setReportFromUrl(null);
    
    // Resetar o valor do input para permitir a seleção do mesmo arquivo novamente
    if (medicalReportInputRef.current) {
      medicalReportInputRef.current.value = "";
    }
    
    // Verificar se há URLs de laudos para remover do servidor
    if (medicalReportUrls && medicalReportUrls.length > 0) {
      console.log("Removendo laudos do servidor:", medicalReportUrls);
      
      try {
        // Remover cada um dos laudos do servidor
        for (const url of medicalReportUrls) {
          // Chamar a API para excluir o arquivo do servidor
          const deleted = await deleteFile(url);
          
          if (deleted) {
            console.log(`Laudo ${url} excluído com sucesso do servidor`);
          } else {
            console.error(`Falha ao excluir laudo ${url} do servidor`);
          }
        }
        
        // Se temos uma função para atualizar o banco de dados, removemos a referência dos laudos
        if (updateOrderField && orderId) {
          const updated = await updateOrderField("medical_report_url", []);
          if (updated) {
            console.log("Referências dos laudos removidas do banco de dados");
          } else {
            console.error("Falha ao remover referências dos laudos do banco de dados");
          }
        }
      } catch (error) {
        console.error("Erro ao excluir laudos do servidor:", error);
      }
    }
    
    // Garantir que o estado é completamente resetado para permitir nova seleção
    setTimeout(() => {
      if (medicalReportInputRef.current) {
        medicalReportInputRef.current.value = "";
      }
      console.log("Campo de upload de laudos resetado e pronto para nova seleção");
    }, 200);
  };

  // Remover um laudo específico
  const removeMedicalReport = async (index: number) => {
    const reportToRemove = reportPreviews[index];
    
    // Remover do estado local de previews
    setReportPreviews(reportPreviews.filter((_, i) => i !== index));
    
    // Se for um laudo de arquivo, remover do array de arquivos
    if (reportToRemove.file) {
      setMedicalReports(medicalReports.filter(file => {
        // Comparar nome e tamanho para identificar o arquivo
        return file.name !== reportToRemove.file?.name || 
               file.size !== reportToRemove.file?.size;
      }));
    }
    
    // Se for um laudo do servidor
    if (reportToRemove.url) {
      console.log("Removendo laudo do servidor:", reportToRemove.url);
      
      try {
        // Chamar a API para excluir o arquivo do servidor
        const deleted = await deleteFile(reportToRemove.url);
        
        if (deleted) {
          console.log("Laudo excluído com sucesso do servidor");
          
          // Se temos uma função para atualizar o banco de dados, atualizamos o array de laudos
          if (updateOrderField && orderId) {
            // Atualizar o banco de dados com a nova lista de URLs (sem a URL removida)
            const updatedUrls = medicalReportUrls.filter(url => url !== reportToRemove.url);
            
            const updated = await updateOrderField("medical_report_url", updatedUrls);
            if (updated) {
              console.log("Referência do laudo removida do banco de dados");
            } else {
              console.error("Falha ao remover referência do laudo do banco de dados");
            }
          }
        } else {
          console.error("Falha ao excluir laudo do servidor");
        }
      } catch (error) {
        console.error("Erro ao excluir laudo do servidor:", error);
      }
    }
    
    // Sempre resetar o input para permitir selecionar novos arquivos
    if (medicalReportInputRef.current) {
      medicalReportInputRef.current.value = "";
    }
    
    // Atualizar compatibilidade com laudo único
    if (reportPreviews.length > 1) {
      const remainingReports = reportPreviews.filter((_, i) => i !== index);
      if (remainingReports.length > 0 && remainingReports[0].file) {
        setMedicalReport(remainingReports[0].file);
      }
    } else {
      setMedicalReport(null);
      setReportFromUrl(null);
    }
  };

  // Apenas imagens principais são utilizadas

  // Remover uma imagem específica
  const removeImage = async (index: number) => {
    setRemovalInProgress(true);
    const imageToRemove = imagePreviews[index];
    
    // Remover do estado local de previews
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    
    // Se for uma imagem de arquivo, remover do array de arquivos
    if (imageToRemove.file) {
      setExamImages(examImages.filter(file => {
        // Comparar nome e tamanho para identificar o arquivo
        return file.name !== imageToRemove.file?.name || 
               file.size !== imageToRemove.file?.size;
      }));
    }
    
    // Se for uma imagem do servidor
    if (imageToRemove.url) {
      console.log("Removendo imagem do servidor:", imageToRemove.url);
      
      try {
        // Chamar a API para excluir o arquivo do servidor
        const deleted = await deleteFile(imageToRemove.url);
        
        if (deleted) {
          console.log("Imagem excluída com sucesso do servidor");
          
          // Se temos uma função para atualizar o banco de dados, atualizamos o array de imagens
          if (updateOrderField && orderId) {
            // Atualizar o banco de dados com a nova lista de URLs (sem a URL removida)
            const updatedUrls = imageUrls.filter(url => url !== imageToRemove.url);
            
            // Usar o nome correto da coluna: exam_images_url em vez de examImageUrl ou additionalImageUrls
            const updated = await updateOrderField("exam_images_url", updatedUrls);
            if (updated) {
              console.log("Referência da imagem removida do banco de dados");
            } else {
              console.error("Falha ao remover referência da imagem do banco de dados");
            }
          }
        } else {
          console.error("Falha ao excluir imagem do servidor");
        }
      } catch (error) {
        console.error("Erro ao excluir imagem do servidor:", error);
      }
    }
    
    // Sempre resetar o input para permitir selecionar novos arquivos
    if (examImageInputRef.current) {
      examImageInputRef.current.value = "";
    }
    
    setRemovalInProgress(false);
  };

  return (
    <div>
      {/* Modal de visualização da imagem ampliada */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-5xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Visualização da Imagem</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Imagem do exame em tamanho completo
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 mb-4">
            {selectedImage && (
              <div className="w-full h-[70vh] flex items-center justify-center p-2">
                {selectedImage.toLowerCase().includes('.pdf') ? (
                  <div className="w-full h-full border border-border rounded-md overflow-hidden">
                    <iframe 
                      src={selectedImage}
                      className="w-full h-full" 
                      title="Visualização do documento"
                    />
                  </div>
                ) : (
                  <img 
                    src={selectedImage}
                    alt="Imagem do exame"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-border text-foreground hover:bg-muted"
              onClick={() => setImageDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização do laudo */}
      <Dialog open={reportPreviewOpen} onOpenChange={setReportPreviewOpen}>
        <DialogContent className="max-w-4xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Visualização do Laudo</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {reportFromUrl ? reportFromUrl.name : "Laudo do exame"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 mb-4">
            {medicalReportUrls && medicalReportUrls.length > 0 && (
              <div className="w-full h-96 flex items-center justify-center">
                {(medicalReportUrls[0] && medicalReportUrls[0].toLowerCase().endsWith('.pdf')) ? (
                  <div className="w-full h-full border border-border rounded-md overflow-hidden">
                    <iframe 
                      src={getFileUrl(medicalReportUrls[0])}
                      className="w-full h-full" 
                      title="Laudo do exame"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4 border border-border rounded-md">
                    <img 
                      src={getFileUrl(medicalReportUrls[0])}
                      alt="Laudo do exame"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-border text-foreground hover:bg-muted"
              onClick={() => setReportPreviewOpen(false)}
            >
              Fechar
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                if (medicalReportUrls && medicalReportUrls.length > 0) {
                  window.open(getFileUrl(medicalReportUrls[0]), '_blank');
                }
              }}
            >
              Abrir em Nova Aba
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card className="mb-6 bg-card border-border text-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center text-foreground">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Informações, Imagens do Exame e Laudo
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Forneça informações, imagens e laudo do exame para o pedido cirúrgico. Apenas a indicação clínica é obrigatória.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Upload da imagem do exame (opcional) */}
            <div>
              <Label htmlFor="examImage" className="flex items-center text-foreground text-lg font-medium">
                Imagens do Exame
              </Label>
              
              <DragDropZone
                onFileDrop={async (file) => {
                  // Simular evento de input para reutilizar a lógica existente
                  const event = { target: { files: [file] } } as any;
                  await handleExamImageChange(event);
                }}
                accept="image/*"
                disabled={processingImage}
                className="w-full"
              >
                <div 
                  className={cn(
                    "border-2 border-dashed border-border rounded-lg p-4 mt-1",
                    "transition-all duration-200 hover:border-border",
                    imagePreviews.length > 0 ? "bg-accent/20" : "bg-muted/30 cursor-pointer"
                  )}
                  onClick={() => {
                    if (examImageInputRef.current) {
                      examImageInputRef.current.click();
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <input
                      id="examImage"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleExamImageChange}
                      ref={examImageInputRef}
                      key={`exam-image-upload-${Date.now()}`}
                    />
                    
                    {imagePreviews.length === 0 ? (
                      <>
                        <Upload className="h-8 w-8 text-primary" />
                        <span className="text-sm text-muted-foreground text-center block">
                          Clique ou arraste para fazer upload de imagens de exame
                        </span>
                      </>
                    ) : (
                      <>
                        <FileImage className="h-8 w-8 text-primary" />
                        <span className="text-sm text-muted-foreground text-center block">
                          Clique ou arraste para adicionar mais imagens
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </DragDropZone>
              <p className="text-xs text-muted-foreground mt-1">
                Faça upload de radiografias, ressonâncias ou outros exames de imagem relevantes
              </p>
            </div>

            {/* Mostra as miniaturas das imagens do exame */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Imagens selecionadas ({imagePreviews.length}):</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {imagePreviews.map((image, index) => (
                    <div key={index} className="relative group border border-border rounded-md p-1 bg-muted/30 hover:border-border transition-colors">
                      <div className="relative pt-[75%] overflow-hidden">
                        <img 
                          src={image.preview} 
                          alt={`Imagem de exame ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-contain bg-black/5 rounded shadow-inner cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita que acione o input de arquivo
                            setSelectedImage(image.preview);
                            setImageDialogOpen(true);
                          }}
                        />
                        <div className="absolute top-1 right-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-5 w-5 rounded-full p-0 opacity-80 hover:opacity-100"
                            onClick={() => removeImage(index)}
                            disabled={removalInProgress}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload de laudos do exame (múltiplos) */}
            <div>
              <Label htmlFor="medicalReport" className="text-foreground text-lg font-medium">Laudos do Exame</Label>

              <DragDropZone
                onFileDrop={async (file) => {
                  // Simular evento de input para reutilizar a lógica existente
                  const event = { target: { files: [file] } } as any;
                  await handleMedicalReportChange(event);
                }}
                accept=".pdf,image/*"
                disabled={processingReport}
                className="w-full"
              >
                <div 
                  className={cn(
                    "border-2 border-dashed border-border rounded-lg p-4 mt-1",
                    "transition-all duration-200 hover:border-border",
                    reportPreviews.length > 0 ? "bg-accent/20" : "bg-muted/30 cursor-pointer"
                  )}
                  onClick={() => {
                    if (medicalReportInputRef.current) {
                      medicalReportInputRef.current.click();
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <input
                      id="medicalReport"
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                      className="hidden"
                      onChange={handleMedicalReportChange}
                      ref={medicalReportInputRef}
                      key={`medical-report-upload-${Date.now()}`}
                    />
                    
                    {reportPreviews.length === 0 ? (
                      <>
                        <FileText className="h-8 w-8 text-primary" />
                        <span className="text-sm text-muted-foreground text-center block">
                          Clique ou arraste para fazer upload dos laudos do exame
                        </span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-8 w-8 text-primary" />
                        <span className="text-sm text-muted-foreground text-center block">
                          Clique ou arraste para adicionar mais laudos
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </DragDropZone>
              <p className="text-xs text-muted-foreground mt-1">
                Faça upload de laudos médicos, relatórios ou documentos relevantes
              </p>
            </div>

            {/* Mostra as miniaturas dos laudos */}
            {reportPreviews.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Laudos selecionados ({reportPreviews.length}):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {reportPreviews.map((report, index) => (
                    <div key={index} className="relative group border border-border rounded-md p-2 bg-muted/30 hover:border-border transition-colors">
                      <div className="relative">
                        {report.name.toLowerCase().includes('.pdf') ? (
                          <div className="flex flex-col items-center p-4 min-h-[100px] bg-red-900/20 rounded">
                            <FileText className="h-8 w-8 text-destructive mb-2" />
                            <span className="text-xs text-foreground text-center break-words">{report.name}</span>
                          </div>
                        ) : (
                          <div className="relative pt-[75%] overflow-hidden">
                            <img 
                              src={report.preview} 
                              alt={`Laudo ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-contain bg-black/5 rounded shadow-inner cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(report.preview);
                                setImageDialogOpen(true);
                              }}
                            />
                          </div>
                        )}
                        <div className="absolute top-1 right-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-5 w-5 rounded-full p-0 opacity-80 hover:opacity-100"
                            onClick={() => removeMedicalReport(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {report.name.toLowerCase().includes('.pdf') && (
                          <div className="absolute bottom-1 left-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 rounded-full p-0 opacity-80 hover:opacity-100 bg-primary/90/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(report.preview);
                                setImageDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de indicação clínica (obrigatório) */}
            <div>
              <Label htmlFor="clinicalIndication" className="text-foreground text-lg font-medium">
                Indicação Clínica <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="clinicalIndication"
                className="mt-1 bg-muted/30 border-border placeholder:text-primary/50"
                placeholder="Descreva a indicação clínica para o procedimento..."
                value={clinicalIndication}
                onChange={(e) => setClinicalIndication(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Descreva a razão médica para a solicitação do procedimento
              </p>
            </div>

            {/* Campo de observações adicionais (opcional) */}
            <div>
              <Label htmlFor="additionalNotes" className="text-foreground text-lg font-medium">
                Observações Adicionais
              </Label>
              <Textarea
                id="additionalNotes"
                className="mt-1 bg-muted/30 border-border placeholder:text-primary/50"
                placeholder="Adicione informações importantes para o procedimento..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Informações adicionais que possam ser relevantes para o procedimento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}