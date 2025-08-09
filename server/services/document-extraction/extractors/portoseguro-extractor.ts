/**
 * Extrator especializado para carteirinhas Porto Seguro Saúde
 * Implementa padrões específicos de extração para documentos Porto Seguro
 */

import { IOperatorExtractor } from '../types/extraction-types';
import type { ExtractedData } from '../types/extraction-types';
import { CNSValidator } from '../utils/cns-validator';

export class PortoSeguroExtractor implements IOperatorExtractor {
  
  /**
   * Identifica se o texto pertence à Porto Seguro
   */
  canHandle(text: string): boolean {
    const normalizedText = text.toUpperCase();
    
    const portoPatterns = [
      /PORTO\s*SAUDE/,
      /PORTOSAUDE/,
      /PORTO\s*SEGURO/,
      /PORTOSEGURO/,
      /SEGURADORA\s*PORTO/,
    ];

    return portoPatterns.some(pattern => pattern.test(normalizedText));
  }

  /**
   * Extrai dados específicos da Porto Seguro
   */
  async extract(text: string): Promise<ExtractedData> {
    console.log('🔍 PortoSeguro: Iniciando extração específica...');
    
    const data: ExtractedData = {
      operadora: 'PORTO',
      numeroCarteirinha: this.extractCardNumber(text) ?? undefined,
      plano: this.extractPlan(text) ?? undefined,
      nomeTitular: this.extractHolderName(text) ?? undefined,
      dataNascimento: this.extractBirthDate(text) ?? undefined,
      cns: this.extractCNS(text) ?? undefined
    };

    console.log('✅ PortoSeguro: Extração concluída:', data);
    return data;
  }

  /**
   * Extrai número da carteirinha específico da Porto Seguro
   * Padrão: 4869 7908 0000 0247 (16 dígitos)
   */
  extractCardNumber(text: string): string | null {
    console.log('🔍 PortoSeguro: Extraindo número da carteirinha...');
    
    // Remover CNS do texto para evitar confusão
    const cleanText = CNSValidator.removeCNSFromText(text);
    
    const portoPatterns = [
      // Padrão específico Porto Seguro: 4869 seguido de números
      /4869\s*(\d{4})\s*(\d{4})\s*(\d{4})/,
      /4869(\d{4})(\d{4})(\d{4})/,
      
      // Padrão com contexto
      /(?:CART[ÃA]O|CARTEIRINHA|BENEFICI[AÁ]RIO)[:\s]*(4869\s*\d{4}\s*\d{4}\s*\d{4})/i,
      
      // Padrão numérico de 16 dígitos começando com 4869
      /\b(4869\d{12})\b/,
      
      // Padrão com espaços
      /\b4869\s+\d{4}\s+\d{4}\s+\d{4}\b/,
    ];

    for (const pattern of portoPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let cardNumber: string;
        
        // Se for padrão fragmentado, concatenar
        if (match[1] && match[2] && match[3]) {
          cardNumber = '4869' + match[1] + match[2] + match[3];
          console.log(`🔍 PortoSeguro: Número fragmentado encontrado: 4869 ${match[1]} ${match[2]} ${match[3]} → ${cardNumber}`);
        } else {
          cardNumber = match[0].replace(/\s/g, '');
          console.log(`🔍 PortoSeguro: Número encontrado: ${cardNumber}`);
        }
        
        // Validar tamanho e que não é CNS
        if (cardNumber.length === 16 && !CNSValidator.isCNSNumber(cardNumber)) {
          console.log(`✅ PortoSeguro: Número da carteirinha encontrado: ${cardNumber}`);
          return cardNumber;
        }
      }
    }

    console.log('❌ PortoSeguro: Número da carteirinha não encontrado');
    return null;
  }

  /**
   * Extrai CNS usando utilitário global
   */
  extractCNS(text: string): string | null {
    console.log('🔍 PortoSeguro: Extraindo CNS...');
    const cns = CNSValidator.extractCNS(text);
    if (cns) {
      console.log(`✅ PortoSeguro: CNS extraído: ${cns}`);
    } else {
      console.log('❌ PortoSeguro: CNS não encontrado');
    }
    return cns;
  }

  /**
   * Extrai plano específico da Porto Seguro
   * Padrões: BRONZE BRASIL, PRATA, OURO, EXECUTIVO, etc.
   */
  extractPlan(text: string): string | null {
    console.log('🔍 PortoSeguro: Extraindo plano...');
    
    const normalizedText = text.toUpperCase();
    
    // Padrões específicos da Porto Seguro
    const portoSeguroPlanPatterns = [
      // Planos específicos observados
      /BRONZE\s+BRASIL/,
      /PRATA\s+BRASIL/,
      /OURO\s+BRASIL/,
      /DIAMANTE\s+BRASIL/,
      
      // Padrões gerais
      /BRONZE/,
      /PRATA/,
      /OURO/,
      /DIAMANTE/,
      /EXECUTIVO/,
      /EMPRESARIAL/,
      /INDIVIDUAL/,
      /FAMILIAR/,
      /PREMIUM/,
      /BASICO/,
      /ESPECIAL/,
      
      // Padrão com contexto
      /PLANO[:\s]+([A-Z\s]{3,30})/,
      /SERVICO[:\s]+([A-Z\s]{3,30})/,
      /COBERTURA[:\s]+([A-Z\s]{3,30})/,
    ];

    for (const pattern of portoSeguroPlanPatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const planName = match[1] || match[0];
        const cleanPlan = planName.trim();
        console.log(`✅ PortoSeguro: Plano encontrado: ${cleanPlan}`);
        return cleanPlan;
      }
    }

    console.log('❌ PortoSeguro: Plano não encontrado');
    return null;
  }

  /**
   * Extrai nome do titular específico da Porto Seguro
   */
  extractHolderName(text: string): string | null {
    console.log('🔍 PortoSeguro: Extraindo nome do titular...');
    
    const normalizedText = text.toUpperCase();
    
    const namePatterns = [
      // Padrão com rótulo específico
      /(?:BENEFICI[AÁ]RIO|TITULAR)[:\s]+([A-Z\s]{10,50})/,
      /(?:NOME|PACIENTE)[:\s]+([A-Z\s]{10,50})/,
      
      // Padrão após "Porto Saúde" ou identificadores
      /PORTOSAUDE[:\s]+([A-Z\s]{10,50})/,
      
      // Buscar nome após número da carteirinha
      /4869\s*\d{4}\s*\d{4}\s*\d{4}[:\s]*([A-Z\s]{10,50})/,
      
      // Padrão genérico para nomes (3+ palavras maiúsculas)
      /\b([A-Z]{2,}\s+[A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/,
    ];

    for (const pattern of namePatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        
        // Filtrar nomes que não são pessoas
        const invalidNames = [
          'PORTO SEGURO', 'PORTOSEGURO', 'PORTO SAUDE', 'PORTOSAUDE',
          'SAUDE', 'BENEFICIARIO', 'TITULAR', 'CARTEIRINHA', 'CARTAO',
          'NACIONAL', 'BRASIL', 'BRONZE', 'PRATA', 'OURO', 'DIAMANTE'
        ];
        
        if (!invalidNames.some(invalid => name.includes(invalid)) && name.length >= 10) {
          console.log(`✅ PortoSeguro: Nome do titular encontrado: ${name}`);
          return name;
        }
      }
    }

    console.log('❌ PortoSeguro: Nome do titular não encontrado');
    return null;
  }

  /**
   * Extrai data de nascimento específica da Porto Seguro
   */
  extractBirthDate(text: string): string | null {
    console.log('🔍 PortoSeguro: Extraindo data de nascimento...');
    
    const datePatterns = [
      // Padrões com rótulos específicos
      /(?:NASCIMENTO|NASC|DATA\s*NASC)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:NASCIMENTO|NASC|DATA\s*NASC)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
      
      // Padrão genérico de data
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      /\b(\d{1,2}-\d{1,2}-\d{4})\b/,
      
      // Padrão específico após vigência
      /VIG[EÊ]NCIA[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const date = match[1];
        console.log(`✅ PortoSeguro: Data encontrada: ${date}`);
        return date;
      }
    }

    console.log('❌ PortoSeguro: Data de nascimento não encontrada');
    return null;
  }

  /**
   * Calcula confiança específica para Porto Seguro
   */
  getConfidence(data: ExtractedData): number {
    let confidence = 0;
    let factors = 0;

    // Operadora identificada (peso 3)
    if (data.operadora === 'PORTO') {
      confidence += 3;
    }
    factors += 3;

    // Número da carteirinha (peso 3)
    if (data.numeroCarteirinha && data.numeroCarteirinha.length === 16) {
      confidence += 3;
    }
    factors += 3;

    // Plano identificado (peso 2)
    if (data.plano) {
      confidence += 2;
    }
    factors += 2;

    // Nome do titular (peso 1)
    if (data.nomeTitular) {
      confidence += 1;
    }
    factors += 1;

    // CNS identificado (peso 1)
    if (data.cns) {
      confidence += 1;
    }
    factors += 1;

    return factors > 0 ? confidence / factors : 0;
  }
}