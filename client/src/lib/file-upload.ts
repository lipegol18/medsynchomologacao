import { apiRequest } from "@/lib/queryClient";
import { FileManager } from "./file-manager";

/**
 * Interface para a resposta de upload de arquivo
 */
export interface FileUploadResponse {
  url: string;
  originalName: string;
  size: number;
}

/**
 * Faz o upload de uma imagem de exame para o servidor
 * @param file Arquivo de imagem do exame
 * @param patientId ID do paciente para nomeação padronizada do arquivo
 * @param orderId ID do pedido para nomeação padronizada do arquivo
 * @param existingFilePath Caminho do arquivo existente (opcional)
 * @returns Promise com a resposta do servidor contendo a URL do arquivo
 */
export async function uploadExamImage(
  file: File, 
  patientId?: number, 
  orderId?: number, 
  existingFilePath?: string | null
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('image', file);
  
  // Garantimos que os IDs para a criação de nomes de arquivo padronizados sejam enviados corretamente
  // Mesmo se for undefined, convertemos para string vazia para evitar problemas
  const patientIdStr = patientId ? patientId.toString() : '';
  const orderIdStr = orderId ? orderId.toString() : '';
  formData.append('patientId', patientIdStr);
  formData.append('orderId', orderIdStr);
  
  // Se temos um caminho de arquivo existente, enviamos para ser reutilizado/substituído
  if (existingFilePath) {
    formData.append('existingImagePath', existingFilePath);
    console.log("Enviando caminho de imagem existente para sobrescrever:", existingFilePath);
  }
  
  console.log(`Enviando upload de imagem com patientId=${patientIdStr}, orderId=${orderIdStr}, existingPath=${existingFilePath || 'nenhum'}`);
  
  const response = await fetch('/api/uploads/exam-image', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao fazer upload da imagem');
  }
  
  return await response.json();
}

/**
 * Faz o upload de um laudo médico para o servidor
 * @param file Arquivo do laudo médico
 * @param patientId ID do paciente para nomeação padronizada do arquivo
 * @param orderId ID do pedido para nomeação padronizada do arquivo
 * @param existingFilePath Caminho do arquivo existente (opcional)
 * @returns Promise com a resposta do servidor contendo a URL do arquivo
 */
export async function uploadMedicalReport(
  file: File, 
  patientId?: number, 
  orderId?: number, 
  existingFilePath?: string | null
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('report', file);
  
  // Garantimos que os IDs para a criação de nomes de arquivo padronizados sejam enviados corretamente
  // Mesmo se for undefined, convertemos para string vazia para evitar problemas
  const patientIdStr = patientId ? patientId.toString() : '';
  const orderIdStr = orderId ? orderId.toString() : '';
  formData.append('patientId', patientIdStr);
  formData.append('orderId', orderIdStr);
  
  // Se temos um caminho de arquivo existente, enviamos para ser reutilizado/substituído
  if (existingFilePath) {
    formData.append('existingReportPath', existingFilePath);
    console.log("Enviando caminho de laudo existente para sobrescrever:", existingFilePath);
  }
  
  console.log(`Enviando upload de laudo com patientId=${patientIdStr}, orderId=${orderIdStr}, existingPath=${existingFilePath || 'nenhum'}`);
  
  const response = await fetch('/api/uploads/medical-report', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao fazer upload do laudo');
  }
  
  return await response.json();
}

/**
 * Faz o upload de múltiplas imagens adicionais para o servidor
 * @param files Array de arquivos de imagem
 * @param patientId ID do paciente para nomeação padronizada do arquivo
 * @param orderId ID do pedido para nomeação padronizada do arquivo
 * @param existingFilePaths Array de caminhos de arquivos existentes (opcional)
 * @returns Promise com a resposta do servidor contendo as URLs dos arquivos
 */
export async function uploadAdditionalImages(
  files: File[], 
  patientId?: number,
  orderId?: number,
  existingFilePaths?: string[] | null
): Promise<FileUploadResponse[]> {
  if (files.length === 0) {
    return [];
  }
  
  const formData = new FormData();
  
  // Adicionamos cada arquivo ao FormData
  files.forEach((file, index) => {
    formData.append('images', file);
  });
  
  // Garantimos que os IDs para a criação de nomes de arquivo padronizados sejam enviados corretamente
  // Mesmo se for undefined, convertemos para string vazia para evitar problemas
  const patientIdStr = patientId ? patientId.toString() : '';
  const orderIdStr = orderId ? orderId.toString() : '';
  formData.append('patientId', patientIdStr);
  formData.append('orderId', orderIdStr);
  
  // Se temos caminhos de arquivos existentes, enviamos para serem reutilizados/substituídos
  if (existingFilePaths && existingFilePaths.length > 0) {
    existingFilePaths.forEach((path, index) => {
      if (path && index < files.length) {
        formData.append(`existingFilePath_${index}`, path);
      }
    });
  }
  
  console.log(`Enviando upload de ${files.length} imagens adicionais com patientId=${patientIdStr}, orderId=${orderIdStr}`);
  
  const response = await fetch('/api/uploads/additional-images', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao fazer upload das imagens adicionais');
  }
  
  return await response.json();
}

/**
 * Obtém a URL completa do arquivo para exibição
 * @param url URL relativa do arquivo
 * @returns URL completa para o arquivo
 */
export function getFileUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // Se a URL já começar com http:// ou https://, retornar como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Se a URL começar com barra, adicionar o domínio base
  if (url.startsWith('/')) {
    return `${window.location.origin}${url}`;
  }
  
  // Caso contrário, adicionar o domínio base e a barra
  return `${window.location.origin}/${url}`;
}

/**
 * Deleta um arquivo do servidor pelo seu caminho relativo
 * @param fileUrl URL relativa do arquivo a ser excluído
 * @returns Promise com o resultado da operação
 */
export async function deleteFile(fileUrl: string | undefined | null): Promise<boolean> {
  if (!fileUrl) return false;
  
  try {
    console.log('Solicitando exclusão do arquivo:', fileUrl);
    
    const response = await fetch('/api/uploads/file', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileUrl }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error('Erro HTTP ao excluir arquivo:', response.status, response.statusText);
      return false;
    }

    // Try to parse as JSON, but handle cases where server returns HTML
    let result;
    try {
      const responseText = await response.text();
      if (responseText.trim()) {
        result = JSON.parse(responseText);
      } else {
        result = { success: true };
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError);
      // If we can't parse the response but the HTTP status was OK, assume success
      result = { success: true };
    }
    
    console.log('Arquivo excluído com sucesso:', result);
    return true;
  } catch (error) {
    console.error('Erro na requisição de exclusão de arquivo:', error);
    return false;
  }
}