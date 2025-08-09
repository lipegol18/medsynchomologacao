import { createStandardFileName } from "@shared/file-utils";
import { FileUploadResponse } from "./file-upload";

/**
 * Classe para gerenciamento e padronização de arquivos no sistema
 */
export class FileManager {
  /**
   * Renomeia um arquivo usando o padrão padronizado do sistema
   * @param file Arquivo original
   * @param patientId ID do paciente
   * @param orderId ID do pedido
   * @param fileType Tipo de arquivo (image, report, etc)
   * @returns Um novo objeto File com o nome padronizado
   */
  static renameFileToStandard(
    file: File,
    patientId: number,
    orderId: number,
    fileType: string
  ): File {
    if (!file) return file;
    
    // Obtém a extensão do arquivo original
    const originalExtension = this.getFileExtension(file.name);
    
    // Cria um nome padronizado
    const standardName = createStandardFileName(
      patientId,
      orderId,
      fileType,
      originalExtension
    );
    
    // Cria um novo objeto File com o mesmo conteúdo mas nome padronizado
    return new File([file], standardName, { type: file.type });
  }

  /**
   * Processa um arquivo de imagem para garantir nome padronizado
   * @param file Arquivo de imagem
   * @param patientId ID do paciente
   * @param orderId ID do pedido  
   * @returns Um objeto File com nome padronizado
   */
  static processExamImage(
    file: File,
    patientId: number,
    orderId: number
  ): File {
    return this.renameFileToStandard(file, patientId, orderId, 'image');
  }

  /**
   * Processa um arquivo de laudo para garantir nome padronizado
   * @param file Arquivo de laudo
   * @param patientId ID do paciente
   * @param orderId ID do pedido
   * @returns Um objeto File com nome padronizado 
   */
  static processMedicalReport(
    file: File,
    patientId: number,
    orderId: number
  ): File {
    return this.renameFileToStandard(file, patientId, orderId, 'report');
  }

  /**
   * Processa múltiplas imagens adicionais para garantir nomes padronizados
   * @param files Array de arquivos de imagem
   * @param patientId ID do paciente
   * @param orderId ID do pedido
   * @returns Array de objetos File com nomes padronizados
   */
  static processAdditionalImages(
    files: File[],
    patientId: number,
    orderId: number
  ): File[] {
    return files.map((file, index) => {
      // Adiciona um índice para diferenciar múltiplas imagens
      return this.renameFileToStandard(file, patientId, orderId, `additional_${index + 1}`);
    });
  }

  /**
   * Obtém a extensão de um arquivo a partir do nome
   * @param fileName Nome do arquivo
   * @returns A extensão com o ponto (ex: .jpg)
   */
  private static getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return ''; // Sem extensão
    
    return fileName.substring(lastDotIndex);
  }
  
  /**
   * Verifica se precisamos fazer upload de um arquivo
   * @param file Arquivo para verificar
   * @param existingPath Caminho existente do arquivo
   * @returns true se precisamos fazer upload, false caso contrário
   */
  static shouldUpload(file: File | null, existingPath: string | null): boolean {
    if (!file) return false;
    
    // Se não temos um caminho existente, sempre fazemos upload
    if (!existingPath) return true;
    
    // Verificamos se o arquivo foi modificado recentemente (nos últimos 60 segundos)
    // ou se é um arquivo de blob (geralmente indica um novo upload)
    return file.name.includes("blob") || file.lastModified > (Date.now() - 60000);
  }
}