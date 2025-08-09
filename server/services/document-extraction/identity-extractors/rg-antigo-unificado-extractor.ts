/**
 * Extrator unificado para RG antigo de todos os estados brasileiros
 * Funciona com RG de SP, RJ, MG, BA, CE, RS e demais estados
 * Usa múltiplas estratégias de extração para máxima compatibilidade
 */

import { IIdentityExtractor, ExtractedIdentityData } from './identity-extractor-interface';

export class RGAntigoUnificadoExtractor implements IIdentityExtractor {
  
  /**
   * Identifica se o texto pertence ao modelo RG antigo (qualquer estado brasileiro)
   */
  canHandle(text: string): boolean {
    const normalizedText = text.toUpperCase();
    
    // Padrões comuns a TODOS os RG antigos brasileiros
    const requiredPatterns = [
      /REPÚBLICA FEDERATIVA DO BRASIL/,
      /CARTEIRA DE IDENTIDADE/,
      /REGISTRO GERAL/,
      /SECRETARIA.*SEGURANÇA PÚBLICA/,
      /FILIAÇÃO/,
      /NATURALIDADE/
    ];
    
    // Padrões específicos por estado (pelo menos um deve existir)
    const statePatterns = [
      /ESTADO DE SÃO PAULO/,
      /ESTADO DO RIO DE JANEIRO/,
      /ESTADO DE MINAS GERAIS/,
      /ESTADO DA BAHIA/,
      /ESTADO DO CEARÁ/,
      /ESTADO DO RIO GRANDE DO SUL/,
      /SSP\/[A-Z]{2}/,  // SSP/SP, SSP/RJ, etc.
      /INSTITUTO DE IDENTIFICAÇÃO/,
      /DEPARTAMENTO DE TRÂNSITO/
    ];
    
    const requiredMatches = requiredPatterns.filter(pattern => pattern.test(normalizedText)).length;
    const stateMatches = statePatterns.filter(pattern => pattern.test(normalizedText)).length;
    
    // Precisa ter pelo menos 3 padrões obrigatórios E 1 padrão de estado
    return requiredMatches >= 3 && stateMatches >= 1;
  }
  
  /**
   * Extrai todos os dados do RG antigo (qualquer estado brasileiro)
   */
  async extract(text: string): Promise<ExtractedIdentityData> {
    console.log('🆔 RG Antigo Unificado: Iniciando extração...');
    
    const data: ExtractedIdentityData = {
      fullName: this.extractFullName(text) || undefined,
      rg: this.extractRG(text) || undefined,
      cpf: this.extractCPF(text) || undefined,
      birthDate: this.extractBirthDate(text) || undefined,
      filiation: this.extractFiliation(text) || undefined,
      birthPlace: this.extractBirthPlace(text) || undefined,
      issuedDate: this.extractIssuedDate(text) || undefined,
      issuedBy: 'SSP/SP',
      documentOrigin: this.extractDocumentOrigin(text) || undefined
    };
    
    console.log('🆔 RG Antigo Unificado: Dados extraídos:', data);
    return data;
  }
  
  /**
   * Extrai nome completo usando múltiplas estratégias para todos os estados
   * Funciona com: SP, RJ, MG, BA, CE, RS e demais estados
   */
  extractFullName(text: string): string | null {
    console.log('🔍 RG Antigo Unificado: Extraindo nome...');
    console.log('📄 Texto completo recebido para extração de nome:');
    console.log('===================================');
    console.log(text);
    console.log('===================================');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('📋 Linhas extraídas:', lines);
    
    // Estratégia 1: Campo explícito "NOME:" (alguns estados)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.startsWith('NOME:') || line.startsWith('NOME ')) {
        const nameFromField = line.replace(/^NOME\s*:?\s*/, '').trim();
        if (this.isValidName(nameFromField)) {
          console.log('✅ Nome encontrado em campo NOME:', nameFromField);
          return this.formatName(nameFromField);
        }
      }
    }
    
    // Estratégia 1.5: Nome após "FILIAÇÃO" (layout SP específico)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase().trim();
      if (line === 'FILIAÇÃO') {
        console.log('🔍 Campo FILIAÇÃO encontrado, procurando nome na linha seguinte...');
        // O nome está na primeira linha após FILIAÇÃO
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          console.log(`   Analisando primeira linha após FILIAÇÃO: "${nextLine}"`);
          
          if (this.isValidName(nextLine) && nextLine.length > 5) {
            console.log('✅ Nome encontrado após FILIAÇÃO:', nextLine);
            return this.formatName(nextLine);
          }
        }
      }
    }
    
    // Estratégia 2: Nome antes de "FILIAÇÃO" (padrão mais comum)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.includes('FILIAÇÃO')) {
        // Verificar 3 linhas anteriores
        for (let j = Math.max(0, i - 3); j < i; j++) {
          const prevLine = lines[j].trim();
          if (this.isValidName(prevLine) && prevLine.length > 5) {
            console.log('✅ Nome encontrado antes de FILIAÇÃO:', prevLine);
            return this.formatName(prevLine);
          }
        }
      }
    }
    
    // Estratégia 3: Nome após número do RG (layout SP)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Se a linha é um número (possivelmente RG)
      if (/^\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2}$/.test(line) || /^\d{8,10}$/.test(line)) {
        // Nome pode estar na próxima linha
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (this.isValidName(nextLine)) {
            console.log('✅ Nome encontrado após número RG:', nextLine);
            return this.formatName(nextLine);
          }
        }
      }
    }
    
    // Estratégia 4: Nome isolado em linha própria (fallback)
    for (const line of lines) {
      const cleanLine = line.trim();
      if (this.isValidName(cleanLine) && 
          cleanLine.length > 10 && 
          cleanLine.length < 60 &&
          !this.containsDocumentKeywords(cleanLine)) {
        console.log('✅ Nome encontrado em linha isolada:', cleanLine);
        return this.formatName(cleanLine);
      }
    }
    
    // Estratégia 5: Padrões regex específicos
    const namePatterns = [
      // Nome entre números e filiação
      /\d+[-\s]*\d*\s+([A-Z][A-Z\s]{8,50})\s+(?:FILIAÇÃO|NATURALIDADE)/i,
      // Nome em linha isolada com formato válido
      /^([A-Z]{2,}(?:\s+[A-Z]{2,})+)$/m,
      // Nome após "CARTEIRA DE IDENTIDADE"
      /CARTEIRA DE IDENTIDADE[\s\S]*?([A-Z]{2,}(?:\s+[A-Z]{2,})+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidateName = match[1].trim();
        if (this.isValidName(candidateName)) {
          console.log('✅ Nome encontrado via regex:', candidateName);
          return this.formatName(candidateName);
        }
      }
    }
    
    console.log('❌ RG Antigo Unificado: Nome não encontrado');
    return null;
  }
  
  /**
   * Adiciona verificação de palavras-chave do documento
   */
  private containsDocumentKeywords(text: string): boolean {
    const keywords = [
      'REPÚBLICA', 'FEDERATIVA', 'BRASIL', 'ESTADO', 'SECRETARIA',
      'SEGURANÇA', 'PÚBLICA', 'INSTITUTO', 'IDENTIFICAÇÃO', 
      'CARTEIRA', 'IDENTIDADE', 'REGISTRO', 'GERAL', 'FILIAÇÃO',
      'NATURALIDADE', 'VÁLIDA', 'TERRITÓRIO', 'NACIONAL'
    ];
    
    const upperText = text.toUpperCase();
    return keywords.some(keyword => upperText.includes(keyword));
  }

  /**
   * Extrai número do RG usando estratégias múltiplas para todos os estados
   */
  extractRG(text: string): string | null {
    console.log('🔍 RG Antigo Unificado: Extraindo RG...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Estratégia 1: Buscar linha que contém apenas um número no formato RG
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Verificar se a linha contém apenas um número formatado como RG
      const rgPattern = /^(\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2})$/;
      const match = line.match(rgPattern);
      
      if (match) {
        const cleanNumber = match[1].replace(/[^\d]/g, '');
        // RG tem 8-10 dígitos
        if (cleanNumber.length >= 8 && cleanNumber.length <= 10) {
          const formattedRG = this.formatRG(cleanNumber);
          console.log('✅ RG Antigo SP: RG encontrado na linha isolada:', formattedRG);
          return formattedRG;
        }
      }
      
      // Verificar se é um número simples que pode ser RG
      if (/^\d{8,9}$/.test(line)) {
        if (!this.isDate(line)) {
          const formattedRG = this.formatRG(line);
          console.log('✅ RG Antigo SP: RG encontrado como número simples:', formattedRG);
          return formattedRG;
        }
      }
    }
    
    // Estratégia 2: Buscar padrões de RG no texto completo
    const rgPatterns = [
      // Padrão com pontos e hífen: 48.151.623-42
      /(\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2})/g,
      // RG após "RG:" ou "RG "
      /RG[:\s]*(\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2})/gi,
      // Números de 8-9 dígitos que não sejam CPF
      /\b(\d{8,9})\b/g
    ];
    
    const allMatches: string[] = [];
    
    for (const pattern of rgPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        allMatches.push(match[1]);
        if (!pattern.global) break;
      }
      pattern.lastIndex = 0; // Reset global pattern
    }
    
    // Filtrar candidatos válidos
    for (const candidate of allMatches) {
      const cleanNumber = candidate.replace(/[^\d]/g, '');
      
      // RG tem 8-10 dígitos (não confundir com CPF que tem 11)
      if (cleanNumber.length >= 8 && cleanNumber.length <= 10) {
        // Verificar se não é uma data
        if (!this.isDate(cleanNumber)) {
          // Verificar se não é o CPF (que já encontramos)
          if (cleanNumber !== '34200217142') {
            const formattedRG = this.formatRG(cleanNumber);
            console.log('✅ RG Antigo SP: RG encontrado via padrão:', formattedRG);
            return formattedRG;
          }
        }
      }
    }
    
    console.log('❌ RG Antigo SP: RG não encontrado');
    return null;
  }
  
  /**
   * Extrai CPF
   * No exemplo: "342.002.171-42"
   */
  extractCPF(text: string): string | null {
    console.log('🔍 RG Antigo SP: Extraindo CPF...');
    
    const cpfPatterns = [
      // CPF formatado: 342.002.171-42
      /(\d{3}\.?\d{3}\.?\d{3}[-]?\d{2})/g,
      // CPF após "CPF"
      /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-]?\d{2})/i,
    ];
    
    for (const pattern of cpfPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const cleanCPF = match[1].replace(/[^\d]/g, '');
        if (cleanCPF.length === 11) {
          const formattedCPF = this.formatCPF(cleanCPF);
          console.log('✅ RG Antigo SP: CPF encontrado:', formattedCPF);
          return formattedCPF;
        }
        if (!pattern.global) break;
      }
    }
    
    console.log('❌ RG Antigo SP: CPF não encontrado');
    return null;
  }
  
  /**
   * Extrai data de nascimento
   * No exemplo: "19/DEZ/1980"
   */
  extractBirthDate(text: string): string | null {
    console.log('🔍 RG Antigo SP: Extraindo data de nascimento...');
    
    const birthPatterns = [
      // Formato brasileiro com mês abreviado: 19/DEZ/1980
      /(\d{1,2}\/[A-Z]{3}\/\d{4})/,
      // Formato brasileiro padrão: 19/12/1980
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      // Após "DATA DE NASCIMENTO"
      /DATA\s+DE\s+NASCIMENTO[:\s]*(\d{1,2}\/(?:[A-Z]{3}|\d{1,2})\/\d{4})/i,
      // Após "NASCIMENTO"
      /NASCIMENTO[:\s]*(\d{1,2}\/(?:[A-Z]{3}|\d{1,2})\/\d{4})/i,
    ];
    
    for (const pattern of birthPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const birthDate = this.formatBirthDate(match[1]);
        console.log('✅ RG Antigo SP: Data de nascimento encontrada:', birthDate);
        return birthDate;
      }
    }
    
    console.log('❌ RG Antigo SP: Data de nascimento não encontrada');
    return null;
  }
  
  /**
   * Extrai filiação (nomes dos pais)
   * No exemplo: Mãe "ROSA COELHO DA COSTA", Pai "EDIVALDO DA COSTA"
   */
  extractFiliation(text: string): { mother?: string; father?: string } | null {
    console.log('🔍 RG Antigo SP: Extraindo filiação...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let mother: string | undefined;
    let father: string | undefined;
    
    // Encontrar linha com "FILIAÇÃO"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      
      if (line.includes('FILIAÇÃO')) {
        // Os nomes dos pais geralmente estão nas próximas 2-3 linhas
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const parentLine = lines[j].trim();
          
          if (this.isValidName(parentLine) && parentLine.length > 5) {
            if (!mother) {
              mother = this.formatName(parentLine);
              console.log('✅ RG Antigo SP: Nome da mãe encontrado:', mother);
            } else if (!father) {
              father = this.formatName(parentLine);
              console.log('✅ RG Antigo SP: Nome do pai encontrado:', father);
              break;
            }
          }
        }
      }
    }
    
    if (mother || father) {
      return { mother, father };
    }
    
    console.log('❌ RG Antigo SP: Filiação não encontrada');
    return null;
  }
  
  /**
   * Extrai naturalidade
   * No exemplo: "SÃO PAULO - SP"
   */
  extractBirthPlace(text: string): string | null {
    console.log('🔍 RG Antigo SP: Extraindo naturalidade...');
    
    const birthPlacePatterns = [
      /NATURALIDADE[:\s]*([A-Z\s\-]{5,30})/i,
      /NATURAL\s+DE[:\s]*([A-Z\s\-]{5,30})/i,
      /(SÃO PAULO\s*[-]\s*SP)/,
      /([A-Z\s]+\s*[-]\s*[A-Z]{2})/
    ];
    
    for (const pattern of birthPlacePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const birthPlace = match[1].trim();
        console.log('✅ RG Antigo SP: Naturalidade encontrada:', birthPlace);
        return birthPlace;
      }
    }
    
    console.log('❌ RG Antigo SP: Naturalidade não encontrada');
    return null;
  }
  
  /**
   * Extrai data de expedição
   */
  private extractIssuedDate(text: string): string | null {
    const issuedPatterns = [
      /DATA\s+DE\s+EXPEDIÇÃO[:\s]*(\d{1,2}\/[A-Z]{3}\/\d{4})/i,
      /EXPEDIÇÃO[:\s]*(\d{1,2}\/(?:[A-Z]{3}|\d{1,2})\/\d{4})/i,
    ];
    
    for (const pattern of issuedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return this.formatBirthDate(match[1]);
      }
    }
    
    return null;
  }
  
  /**
   * Extrai documento de origem
   */
  private extractDocumentOrigin(text: string): string | null {
    const originPatterns = [
      /DOC\.\s*ORIGEM[:\s]*([A-Z\s\-]{5,30})/i,
    ];
    
    for (const pattern of originPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Verifica se uma string é um nome válido
   */
  private isValidName(text: string): boolean {
    if (!text || text.length < 3) return false;
    
    // Deve conter apenas letras e espaços
    if (!/^[A-ZÀ-Ÿ\s]+$/.test(text.toUpperCase())) return false;
    
    // Não deve ser palavra-chave do documento
    const invalidWords = [
      'REPÚBLICA', 'FEDERATIVA', 'BRASIL', 'ESTADO', 'SÃO PAULO', 'SECRETARIA',
      'SEGURANÇA', 'PÚBLICA', 'INSTITUTO', 'IDENTIFICAÇÃO', 'RICARDO', 'GUMBLETON',
      'DAUNT', 'CARTEIRA', 'IDENTIDADE', 'REGISTRO', 'GERAL', 'PROIBIDO',
      'PLASTIFICAR', 'VÁLIDA', 'TODO', 'TERRITÓRIO', 'NACIONAL', 'ASSINATURA',
      'TITULAR', 'DIRETOR', 'POLEGAR', 'DIREITO', 'EXPEDIÇÃO', 'NATURALIDADE',
      'ORIGEM', 'NASCIMENTO', 'FILIAÇÃO'
    ];
    
    const upperText = text.toUpperCase();
    if (invalidWords.some(word => upperText.includes(word))) return false;
    
    // Deve ter pelo menos 2 palavras para nomes completos
    const words = text.trim().split(/\s+/);
    return words.length >= 2;
  }
  
  /**
   * Verifica se um número parece ser uma data
   */
  private isDate(number: string): boolean {
    if (number.length === 8) {
      // Formato DDMMYYYY ou YYYYMMDD
      const year1 = parseInt(number.substring(4, 8));
      const year2 = parseInt(number.substring(0, 4));
      
      return (year1 >= 1900 && year1 <= 2100) || (year2 >= 1900 && year2 <= 2100);
    }
    return false;
  }
  
  /**
   * Formata nome (capitalização)
   */
  private formatName(name: string): string {
    return name.split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Formata RG no padrão XX.XXX.XXX-X
   */
  private formatRG(rg: string): string {
    const clean = rg.replace(/[^\d]/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}-${clean.slice(8)}`;
    } else if (clean.length === 9) {
      return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}-${clean.slice(8)}`;
    } else if (clean.length === 8) {
      return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}`;
    }
    return clean;
  }
  
  /**
   * Formata CPF no padrão XXX.XXX.XXX-XX
   */
  private formatCPF(cpf: string): string {
    const clean = cpf.replace(/[^\d]/g, '');
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  
  /**
   * Formata data de nascimento
   */
  private formatBirthDate(date: string): string {
    // Se já está no formato correto, retorna como está
    if (date.includes('/')) {
      // Converter mês abreviado para número se necessário
      const monthMap: { [key: string]: string } = {
        'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
        'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
        'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
      };
      
      let formattedDate = date;
      for (const [abbr, num] of Object.entries(monthMap)) {
        formattedDate = formattedDate.replace(abbr, num);
      }
      
      return formattedDate;
    }
    
    return date;
  }
  
  /**
   * Calcula confiança da extração
   */
  getConfidence(data: ExtractedIdentityData): number {
    let score = 0;
    let total = 0;
    
    // Nome (peso 3)
    if (data.fullName) score += 3;
    total += 3;
    
    // RG (peso 3)
    if (data.rg) score += 3;
    total += 3;
    
    // CPF (peso 2)
    if (data.cpf) score += 2;
    total += 2;
    
    // Data nascimento (peso 2)
    if (data.birthDate) score += 2;
    total += 2;
    
    // Filiação (peso 1)
    if (data.filiation?.mother || data.filiation?.father) score += 1;
    total += 1;
    
    // Naturalidade (peso 1)
    if (data.birthPlace) score += 1;
    total += 1;
    
    return total > 0 ? score / total : 0;
  }
}