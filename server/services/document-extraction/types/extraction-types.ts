/**
 * Tipos e interfaces para o sistema de extração de documentos
 */

// Resultado da extração de dados básicos
export interface ExtractedData {
  // Campos de carteirinha de saúde
  plano?: string;
  numeroCarteirinha?: string;
  cns?: string;
  nomeTitular?: string;
  dataNascimento?: string;
  operadora?: string;
  normalizedOperadora?: string;
  ansCode?: string;
  operadoraId?: number; // ID único da operadora no banco
  registroAns?: string; // Código ANS exato do banco
  
  // Campos de documento de identidade (RG/CNH)
  nomeCompleto?: string;
  rg?: string;
  cpf?: string;
  nomeMae?: string;
  nomePai?: string;
  naturalidade?: string;
  dataExpedicao?: string;
  orgaoExpedidor?: string;
  documentoOrigem?: string;
  tipoDocumento?: string;
  subtipoDocumento?: string;
}

// Resultado completo da extração com metadados
export interface ExtractionResult {
  success: boolean;
  data: ExtractedData;
  confidence: ConfidenceScore;
  method: DetectionMethod;
  errors?: string[];
}

// Score de confiança da extração
export interface ConfidenceScore {
  overall: number;
  operadora: number;
  plano: number;
  numeroCarteirinha: number;
  // Campos específicos para documentos de identidade
  nome?: number;
  rg?: number;
  cpf?: number;
  dataNascimento?: number;
}

// Método usado para detectar a operadora
export interface DetectionMethod {
  type: 'ANS_CODE' | 'TEXT_PATTERN' | 'FUZZY_MATCH' | 'FALLBACK' | 'IDENTITY_EXTRACTOR';
  details: string;
}

// Configuração de operadora
export interface OperatorConfig {
  name: string;
  patterns: string[];
  ansCode?: string;
  priority: number;
  extractorClass: string;
}

// Interface base para extratores específicos
export interface IOperatorExtractor {
  canHandle(text: string): boolean;
  extract(text: string): Promise<ExtractedData>;
  extractCardNumber(text: string): string | null;
  extractPlan(text: string): string | null;
  extractHolderName(text: string): string | null;
  extractBirthDate(text: string): string | null;
  extractCNS(text: string): string | null;
  getConfidence(data: ExtractedData): number;
}

// Resultado da detecção de operadora
export interface OperatorDetectionResult {
  operatorName: string | null;
  method: DetectionMethod;
  confidence: number;
}