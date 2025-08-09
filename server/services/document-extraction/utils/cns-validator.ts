/**
 * Utilitário para detecção e validação de CNS (Cartão Nacional de Saúde)
 * Pode ser usado por todas as operadoras
 */

export class CNSValidator {
  
  /**
   * Extrai CNS do texto usando padrões específicos
   * @param text Texto para buscar CNS
   * @returns string | null CNS válido encontrado
   */
  static extractCNS(text: string): string | null {
    console.log('🔍 CNS: Extraindo Cartão Nacional de Saúde...');
    
    // Padrão para CNS com rótulos específicos
    const cnsPatterns = [
      /(CNS|CART[ÃA]O\s*NACIONAL\s*DE\s*SA[ÚU]DE)[:\s]*([12789]\d{14})/i,
      /CNS\s*N[ºO°]?[:\s]*([12789]\d{14})/i,
      /CARTAO\s*NACIONAL[:\s]*([12789]\d{14})/i,
      /CART[ÃA]O\s*SUS[:\s]*([12789]\d{14})/i,
      /REGISTRO\s*SUS[:\s]*([12789]\d{14})/i,
    ];

    // Primeiro: buscar CNS com rótulo (mais confiável)
    for (const pattern of cnsPatterns) {
      const match = text.match(pattern);
      if (match && match[2]) {
        const cns = match[2].replace(/\s/g, '');
        if (this.isValidCNS(cns)) {
          console.log(`✅ CNS: Encontrado com rótulo: ${cns}`);
          return cns;
        }
      }
    }

    // Segundo: buscar números de 15 dígitos que começam com 1,2,7,8,9 sem rótulo
    const directCNSPattern = /\b([12789]\d{14})\b/g;
    let match;
    
    while ((match = directCNSPattern.exec(text)) !== null) {
      const cns = match[1];
      if (this.isValidCNS(cns)) {
        console.log(`✅ CNS: Encontrado sem rótulo: ${cns}`);
        return cns;
      }
    }

    console.log('❌ CNS: Não encontrado');
    return null;
  }

  /**
   * Valida CNS usando algoritmo módulo 11
   * @param cns String de 15 dígitos para validar
   * @returns boolean True se CNS é válido
   */
  static isValidCNS(cns: string): boolean {
    // Verificar formato básico
    if (!/^\d{15}$/.test(cns)) {
      console.log(`❌ CNS: Formato inválido - ${cns}`);
      return false;
    }

    // Verificar primeiro dígito válido
    const start = parseInt(cns.slice(0, 1));
    if (![1, 2, 7, 8, 9].includes(start)) {
      console.log(`❌ CNS: Primeiro dígito inválido - ${start}`);
      return false;
    }

    // Algoritmo módulo 11
    const num = cns.split('').map(d => parseInt(d));
    let sum = 0;

    for (let i = 0; i < 15; i++) {
      sum += num[i] * (15 - i);
    }

    const isValid = sum % 11 === 0;
    
    if (isValid) {
      console.log(`✅ CNS: Válido - ${cns}`);
    } else {
      console.log(`❌ CNS: Dígito verificador inválido - ${cns}`);
    }

    return isValid;
  }

  /**
   * Remove números que são CNS válidos do texto
   * Útil para evitar confusão com números de carteirinha
   * @param text Texto original
   * @returns string Texto sem os CNS identificados
   */
  static removeCNSFromText(text: string): string {
    const cns = this.extractCNS(text);
    if (cns) {
      // Remover o CNS e seus rótulos do texto
      let cleanText = text.replace(new RegExp(cns, 'g'), '');
      
      // Remover também rótulos comuns de CNS
      cleanText = cleanText.replace(/(CNS|CART[ÃA]O\s*NACIONAL\s*DE\s*SA[ÚU]DE)[:\s]*/gi, '');
      cleanText = cleanText.replace(/CNS\s*N[ºO°]?[:\s]*/gi, '');
      
      return cleanText.trim();
    }
    return text;
  }

  /**
   * Verifica se um número específico é um CNS válido
   * @param number Número para verificar
   * @returns boolean True se é CNS válido
   */
  static isCNSNumber(number: string): boolean {
    const cleanNumber = number.replace(/\s/g, '');
    return this.isValidCNS(cleanNumber);
  }

  /**
   * Formata CNS para exibição
   * @param cns CNS de 15 dígitos
   * @returns string CNS formatado (xxx xxx xxx xxx xxx)
   */
  static formatCNS(cns: string): string {
    if (cns.length !== 15) return cns;
    
    return cns.replace(/(\d{3})(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4 $5');
  }

  /**
   * Extrai múltiplos CNS do texto (caso existam vários)
   * @param text Texto para análise
   * @returns string[] Array de CNS válidos encontrados
   */
  static extractAllCNS(text: string): string[] {
    const cnsNumbers: string[] = [];
    
    // Buscar todos os números de 15 dígitos que começam com 1,2,7,8,9
    const allPatterns = /\b([12789]\d{14})\b/g;
    let match;
    
    while ((match = allPatterns.exec(text)) !== null) {
      const cns = match[1];
      if (this.isValidCNS(cns) && !cnsNumbers.includes(cns)) {
        cnsNumbers.push(cns);
      }
    }

    console.log(`🔍 CNS: Encontrados ${cnsNumbers.length} CNS válidos`);
    return cnsNumbers;
  }
}