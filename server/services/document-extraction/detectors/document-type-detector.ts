/**
 * Detector de Tipo de Documento
 * Identifica se é carteirinha de saúde, RG, CNH, etc.
 */

export type DocumentType = 'INSURANCE_CARD' | 'RG_IDENTITY' | 'CNH_LICENSE' | 'UNKNOWN';

export interface DocumentTypeResult {
  type: DocumentType;
  subtype?: string;
  confidence: number;
}

export class DocumentTypeDetector {
  
  /**
   * Detecta o tipo de documento baseado no texto extraído
   */
  static detectDocumentType(text: string): DocumentTypeResult {
    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');
    
    console.log('🔍 DocumentTypeDetector: Analisando texto...');
    console.log('📄 Texto normalizado (primeiros 200 chars):', normalizedText.substring(0, 200));
    
    // Padrões para carteirinha de saúde
    const insurancePatterns = [
      /CARTÃO NACIONAL DE SAÚDE/,
      /CNS/,
      /UNIMED|BRADESCO\s+SAÚDE|AMIL|SUL\s*AM[EÉ]RICA|PORTO\s+SEGURO/,
      /PLANO\s+DE\s+SAÚDE/,
      /BENEFICI[AÁ]RIO/,
      /OPERADORA/,
      /ANS\s*[-:]?\s*\d{6}/,
    ];
    
    // Padrões para RG (Registro Geral) - mais abrangentes
    const rgPatterns = [
      /REPÚBLICA FEDERATIVA DO BRASIL/,
      /CARTEIRA DE IDENTIDADE/,
      /REGISTRO GERAL/,
      /REGISTRO\s+\d+/,  // REGISTRO seguido de número
      /SECRETARIA DA SEGURANÇA PÚBLICA/,
      /INSTITUTO DE IDENTIFICAÇÃO/,
      /SSP|DETRAN|IGP/,
      /PROIBIDO PLASTIFICAR/,
      /VÁLIDA EM TODO O TERRITÓRIO NACIONAL/,
      /FILIAÇÃO/,
      /NATURALIDADE/,
      /DOC\.\s*ORIGEM/,
      /DATA\s+DE\s+NASCIMENTO/,
      /EXPEDIÇÃO/,
      /\b\d{1,2}\/[A-Z]{3}\/\d{4}\b/,  // Datas no formato DD/MMM/YYYY típico de RG
      /CPF\s+\d{3}\.\d{3}\.\d{3}-\d{2}/, // CPF formatado
      /ASSINATURA DO DIRETOR/,
      /LEI\s+N[ºª]?\s*\d+/,  // Referência a leis
    ];
    
    // Padrões para CNH
    const cnhPatterns = [
      /CARTEIRA NACIONAL DE HABILITAÇÃO/,
      /CNH/,
      /CATEGORIA/,
      /VALIDADE/,
      /PRIMEIRA HABILITAÇÃO/,
      /DETRAN/,
      /CONDUTOR/,
    ];
    
    // Verificar carteirinha de saúde
    const insuranceMatches = insurancePatterns.filter(pattern => pattern.test(normalizedText)).length;
    if (insuranceMatches >= 2) {
      return {
        type: 'INSURANCE_CARD',
        confidence: Math.min(0.9, 0.6 + (insuranceMatches * 0.1))
      };
    }
    
    // Verificar RG
    console.log('🔍 Testando padrões de RG:');
    const rgMatchingPatterns: string[] = [];
    rgPatterns.forEach((pattern, index) => {
      const match = pattern.test(normalizedText);
      console.log(`${index + 1}. ${pattern} → ${match ? '✅' : '❌'}`);
      if (match) rgMatchingPatterns.push(pattern.toString());
    });
    
    const rgMatches = rgMatchingPatterns.length;
    console.log(`📊 RG matches: ${rgMatches} de ${rgPatterns.length}`);
    console.log('📋 Padrões que fizeram match:', rgMatchingPatterns);
    
    if (rgMatches >= 2) {
      const subtype = this.detectRGSubtype(normalizedText);
      const confidence = Math.min(0.95, 0.6 + (rgMatches * 0.05));
      console.log(`✅ DETECTADO COMO RG_IDENTITY com confiança ${confidence}`);
      return {
        type: 'RG_IDENTITY',
        subtype,
        confidence
      };
    }
    
    // Verificar CNH
    const cnhMatches = cnhPatterns.filter(pattern => pattern.test(normalizedText)).length;
    if (cnhMatches >= 2) {
      return {
        type: 'CNH_LICENSE',
        confidence: Math.min(0.9, 0.6 + (cnhMatches * 0.1))
      };
    }
    
    console.log('❌ Documento não detectado - retornando UNKNOWN com 10% de confiança');
    console.log('📋 Summary: Insurance matches:', insuranceMatches, 'RG matches:', rgMatches, 'CNH matches:', cnhMatches);
    
    return {
      type: 'UNKNOWN',
      confidence: 0.1
    };
  }
  
  /**
   * Detecta o subtipo específico de RG
   */
  private static detectRGSubtype(text: string): string {
    // CIN Nova (Carteira de Identidade Nacional)
    if (text.includes('CARTEIRA DE IDENTIDADE NACIONAL') ||
        text.includes('CIN') ||
        text.includes('REPÚBLICA FEDERATIVA DO BRASIL') && text.includes('QR') ||
        text.includes('REGISTRO NACIONAL')) {
      return 'CIN_NOVA';
    }
    
    // RG Antigo (todos os estados brasileiros)
    if (text.includes('CARTEIRA DE IDENTIDADE') ||
        text.includes('REGISTRO GERAL') ||
        text.includes('SECRETARIA DA SEGURANÇA PÚBLICA') ||
        text.includes('INSTITUTO DE IDENTIFICAÇÃO') ||
        text.includes('SSP/')) {
      return 'RG_ANTIGO';
    }
    
    // RG Genérico (fallback)
    return 'RG_GENERICO';
  }
  
  /**
   * Verifica se o documento é uma carteirinha de saúde
   */
  static isInsuranceCard(text: string): boolean {
    const result = this.detectDocumentType(text);
    return result.type === 'INSURANCE_CARD' && result.confidence > 0.7;
  }
  
  /**
   * Verifica se o documento é um RG
   */
  static isIdentityDocument(text: string): boolean {
    const result = this.detectDocumentType(text);
    return result.type === 'RG_IDENTITY' && result.confidence > 0.7;
  }
}