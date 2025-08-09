import { UnifiedAttachment } from "@/components/unified-file-upload";

// Função para converter anexos legados para o formato unificado
export function convertLegacyAttachments(
  examImages?: string[],
  medicalReports?: string[]
): UnifiedAttachment[] {

  const attachments: UnifiedAttachment[] = [];

  // Converter imagens de exames
  if (examImages) {
    examImages.forEach((url, index) => {
      if (url) {
        attachments.push({
          id: `exam_${index}`,
          filename: `Exame_${index + 1}.jpg`,
          url: url,
          type: 'image'
        });
      }
    });
  }

  // Converter relatórios médicos
  if (medicalReports) {
    medicalReports.forEach((url, index) => {
      if (url) {
        // Detectar se é PDF ou imagem baseado na extensão
        const isPdf = url.toLowerCase().includes('.pdf');
        attachments.push({
          id: `report_${index}`,
          filename: `Relatorio_${index + 1}.${isPdf ? 'pdf' : 'jpg'}`,
          url: url,
          type: isPdf ? 'pdf' : 'image'
        });
      }
    });
  }


  return attachments;
}

// Função para separar anexos unificados de volta para os campos legados (se necessário)
export function separateAttachments(attachments: UnifiedAttachment[]) {
  const examImages: string[] = [];
  const medicalReports: string[] = [];

  attachments.forEach(attachment => {
    if (attachment.type === 'image' && attachment.id?.startsWith('exam_')) {
      examImages.push(attachment.url);
    } else if (attachment.id?.startsWith('report_')) {
      medicalReports.push(attachment.url);
    }
  });

  return { examImages, medicalReports };
}

// Função para validar anexos
export function validateAttachment(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

  if (file.size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande (máximo 10MB)' };
  }

  if (!allowedTypes.includes(file.mimetype || file.type)) {
    return { valid: false, error: 'Tipo de arquivo não suportado (apenas JPG, PNG e PDF)' };
  }

  return { valid: true };
}

// Função para formatar tamanho de arquivo
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}