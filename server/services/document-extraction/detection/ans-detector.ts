/**
 * Passo 3: Extração do código ANS (identificador único da operadora)
 * O código ANS é o identificador oficial das operadoras de saúde no Brasil
 */
export class ANSDetector {
  
  /**
   * Extrai código ANS do texto limpo
   * @param cleanText Texto pré-processado
   * @returns string | null Código ANS encontrado ou null
   */
  static extractANSCode(cleanText: string): string | null {
    console.log('🔍 Buscando código ANS no texto...');
    
    // Padrões para detectar código ANS (5-7 dígitos)
    const ansPatterns = [
      // Padrão ANS - n° 00.070-1 (formato com pontos e hífen)
      /ANS\s*-\s*N[ºO°]?\s*(\d{2})\.(\d{3})-(\d{1})/i,
      // Padrão ANS-n° 000701 (6 dígitos diretos)
      /ANS\s*-\s*N[ºO°]?\s*(\d{6})(?!\d)/i,
      // Padrão ANS: 000701 (dois pontos)
      /ANS\s*:\s*(\d{5,7})(?!\d)/i,
      // Padrão ANS 000701 (espaço simples)
      /(?:^|\s)ANS\s+(\d{5,7})(?!\d)/i,
      // Padrão n° ANS: 000701
      /N[ºO°]?\s*ANS\s*:\s*(\d{5,7})(?!\d)/i,
      // Padrão NUMERO ANS ou NÚMERO ANS
      /(?:NUMERO|NÚMERO)\s*ANS\s*[:\s]*(\d{5,7})(?!\d)/i,
      // Padrão REGISTRO ANS
      /REGISTRO\s*ANS\s*[:\s]*(\d{5,7})(?!\d)/i,
      // Padrão CODIGO ANS ou CÓDIGO ANS
      /(?:CODIGO|CÓDIGO)\s*ANS\s*[:\s]*(\d{5,7})(?!\d)/i
    ];
    
    for (const pattern of ansPatterns) {
      console.log('🔍 Testando padrão ANS:', pattern.source);
      const match = cleanText.match(pattern);
      
      if (match) {
        let ansCode = '';
        
        if (match[1] && match[2] && match[3]) {
          // Formato XX.XXX-X -> combinar os grupos
          ansCode = match[1] + match[2] + match[3];
          console.log('📋 ANS formato estruturado encontrado:', match[1], match[2], match[3], '→', ansCode);
        } else if (match[1] && match[1].length >= 5) {
          // Formato direto de 5-7 dígitos
          ansCode = match[1];
          console.log('📋 ANS formato direto encontrado:', ansCode);
        }
        
        if (ansCode && this.isValidANSCode(ansCode)) {
          console.log('✅ Código ANS válido encontrado:', ansCode);
          return ansCode;
        }
      }
    }
    
    console.log('❌ Nenhum código ANS encontrado no texto');
    return null;
  }

  /**
   * Valida se um código ANS tem formato correto
   * @param code Código a ser validado
   * @returns boolean True se válido
   */
  private static isValidANSCode(code: string): boolean {
    // Código ANS deve ter entre 5-7 dígitos e não ser sequência repetitiva
    if (code.length < 5 || code.length > 7) {
      return false;
    }
    
    // Verificar se não é sequência repetitiva (ex: 11111)
    const uniqueDigits = new Set(code).size;
    if (uniqueDigits <= 2 && code.length > 4) {
      console.log('⚠️ Código ANS rejeitado (sequência repetitiva):', code);
      return false;
    }
    
    return true;
  }

  /**
   * Normaliza código ANS removendo zeros à esquerda se necessário
   * @param ansCode Código ANS bruto
   * @returns string Código normalizado
   */
  static normalizeANSCode(ansCode: string): string {
    // Remove zeros à esquerda, mas mantém pelo menos 4 dígitos
    const normalized = ansCode.replace(/^0+/, '') || '0';
    
    if (normalized.length < 4) {
      return ansCode; // Retorna original se ficar muito curto
    }
    
    console.log('🔄 Código ANS normalizado:', ansCode, '→', normalized);
    return normalized;
  }
}