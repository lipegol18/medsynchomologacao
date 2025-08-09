/**
 * Utilitários para padronização de nomes de arquivos em todo o sistema
 */

/**
 * Gera um nome de arquivo padronizado baseado no ID do paciente, ID do pedido e tipo de arquivo
 * @param patientId ID do paciente
 * @param orderId ID do pedido
 * @param fileType Tipo de arquivo (image, report, etc)
 * @param ext Extensão do arquivo com o ponto (ex: .jpg, .pdf)
 * @returns Nome do arquivo padronizado
 */
export function createStandardFileName(
  patientId: number, 
  orderId: number, 
  fileType: string, 
  ext: string
): string {
  // Garantir que a extensão tenha o ponto
  if (!ext.startsWith('.')) {
    ext = '.' + ext;
  }
  
  // Formatação: p[patientId]_o[orderId]_[tipo]_[datahora].[extensão]
  // Exemplo: p42_o15_image_20250513_124530.jpg
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
  
  return `p${patientId}_o${orderId}_${fileType}_${dateStr}_${timeStr}${ext}`;
}

/**
 * Extrai o ID do pedido de um nome de arquivo padronizado
 * @param fileName Nome do arquivo padronizado
 * @returns O ID do pedido ou null se não for possível extrair
 */
export function extractOrderIdFromFileName(fileName: string): number | null {
  // Padrão: p[patientId]_o[orderId]_[tipo]_[data]_[hora].[ext]
  const match = fileName.match(/^p\d+_o(\d+)_/);
  if (!match || match.length < 2) return null;
  
  const orderId = parseInt(match[1], 10);
  return isNaN(orderId) ? null : orderId;
}

/**
 * Extrai o ID do paciente de um nome de arquivo padronizado
 * @param fileName Nome do arquivo padronizado
 * @returns O ID do paciente ou null se não for possível extrair
 */
export function extractPatientIdFromFileName(fileName: string): number | null {
  // Padrão: p[patientId]_o[orderId]_[tipo]_[data]_[hora].[ext]
  const match = fileName.match(/^p(\d+)_o/);
  if (!match || match.length < 2) return null;
  
  const patientId = parseInt(match[1], 10);
  return isNaN(patientId) ? null : patientId;
}

/**
 * Verifica se um nome de arquivo segue o padrão padronizado do sistema
 * @param fileName Nome do arquivo para verificar
 * @returns true se o nome segue o padrão, false caso contrário
 */
export function isStandardFileName(fileName: string): boolean {
  // Padrão: p[patientId]_o[orderId]_[tipo]_[data]_[hora].[ext]
  return /^p\d+_o\d+_[a-z]+_\d{8}_\d{6}\.\w+$/.test(fileName);
}