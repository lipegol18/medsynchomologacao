/**
 * Interface para extratores de documentos de identidade
 */

export interface ExtractedIdentityData {
  fullName?: string;
  rg?: string;
  cpf?: string;
  birthDate?: string;
  filiation?: {
    mother?: string;
    father?: string;
  };
  birthPlace?: string;
  issuedDate?: string;
  issuedBy?: string;
  documentOrigin?: string;
}

export interface IIdentityExtractor {
  /**
   * Verifica se este extrator pode processar o texto fornecido
   */
  canHandle(text: string): boolean;
  
  /**
   * Extrai dados do documento de identidade
   */
  extract(text: string): Promise<ExtractedIdentityData>;
  
  /**
   * Extrai nome completo
   */
  extractFullName(text: string): string | null;
  
  /**
   * Extrai número do RG
   */
  extractRG(text: string): string | null;
  
  /**
   * Extrai CPF
   */
  extractCPF(text: string): string | null;
  
  /**
   * Extrai data de nascimento
   */
  extractBirthDate(text: string): string | null;
  
  /**
   * Extrai filiação (pai e mãe)
   */
  extractFiliation(text: string): { mother?: string; father?: string } | null;
  
  /**
   * Extrai naturalidade
   */
  extractBirthPlace(text: string): string | null;
  
  /**
   * Calcula confiança da extração
   */
  getConfidence(data: ExtractedIdentityData): number;
}