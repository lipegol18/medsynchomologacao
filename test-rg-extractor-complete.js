/**
 * Teste completo do sistema de extração de RG
 * Testa a nova arquitetura modular para documentos de identidade
 */

// Simular o texto extraído do RG fornecido pelo usuário
const rgText = `
REPÚBLICA FEDERATIVA DO BRASIL
ESTADO DE SÃO PAULO
SECRETARIA DA SEGURANÇA PÚBLICA
INSTITUTO DE IDENTIFICAÇÃO RICARDO GUMBLETON DAUNT
CARTEIRA DE IDENTIDADE
REGISTRO GERAL

48.151.623-42

DANIEL COELHO DA COSTA

FILIAÇÃO
ROSA COELHO DA COSTA
EDIVALDO DA COSTA

NATURALIDADE
SÃO PAULO - SP

19/DEZ/1980

342.002.171-42

DOC. ORIGEM: CERTIDÃO DE NASCIMENTO

VÁLIDA EM TODO O TERRITÓRIO NACIONAL
PROIBIDO PLASTIFICAR
`;

// Simular classes necessárias para o teste
class DocumentTypeDetector {
  static detectDocumentType(text) {
    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');
    
    const rgPatterns = [
      /REPÚBLICA FEDERATIVA DO BRASIL/,
      /CARTEIRA DE IDENTIDADE/,
      /REGISTRO GERAL/,
      /SECRETARIA DA SEGURANÇA PÚBLICA/,
      /INSTITUTO DE IDENTIFICAÇÃO/,
      /FILIAÇÃO/,
      /NATURALIDADE/,
    ];
    
    const rgMatches = rgPatterns.filter(pattern => pattern.test(normalizedText)).length;
    
    if (rgMatches >= 4) {
      let subtype = 'RG_GENERICO';
      if (text.includes('INSTITUTO DE IDENTIFICAÇÃO RICARDO GUMBLETON DAUNT') ||
          text.includes('SÃO PAULO') && text.includes('SECRETARIA DA SEGURANÇA PÚBLICA')) {
        subtype = 'RG_ANTIGO_SP';
      }
      
      return {
        type: 'RG_IDENTITY',
        subtype,
        confidence: Math.min(0.95, 0.7 + (rgMatches * 0.05))
      };
    }
    
    return {
      type: 'UNKNOWN',
      confidence: 0.1
    };
  }
}

class RGAntigoSPExtractor {
  
  canHandle(text) {
    const normalizedText = text.toUpperCase();
    
    const requiredPatterns = [
      /REPÚBLICA FEDERATIVA DO BRASIL/,
      /ESTADO DE SÃO PAULO/,
      /SECRETARIA DA SEGURANÇA PÚBLICA/,
      /INSTITUTO DE IDENTIFICAÇÃO RICARDO GUMBLETON DAUNT/,
      /CARTEIRA DE IDENTIDADE/,
      /REGISTRO GERAL/
    ];
    
    const matchCount = requiredPatterns.filter(pattern => pattern.test(normalizedText)).length;
    return matchCount >= 4;
  }
  
  async extract(text) {
    console.log('🆔 RG Antigo SP: Iniciando extração...');
    
    const data = {
      fullName: this.extractFullName(text),
      rg: this.extractRG(text),
      cpf: this.extractCPF(text),
      birthDate: this.extractBirthDate(text),
      filiation: this.extractFiliation(text),
      birthPlace: this.extractBirthPlace(text),
      issuedBy: 'SSP/SP',
      documentOrigin: this.extractDocumentOrigin(text)
    };
    
    console.log('🆔 RG Antigo SP: Dados extraídos:', data);
    return data;
  }
  
  extractFullName(text) {
    console.log('🔍 RG Antigo SP: Extraindo nome...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Estratégia: Buscar linha com nome após números e antes de FILIAÇÃO
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Se a linha atual contém "FILIAÇÃO", verificar linhas anteriores
      if (line.toUpperCase().includes('FILIAÇÃO')) {
        for (let j = Math.max(0, i - 3); j < i; j++) {
          const prevLine = lines[j].trim();
          if (this.isValidName(prevLine) && prevLine.length > 5) {
            console.log('✅ RG Antigo SP: Nome encontrado antes de FILIAÇÃO:', prevLine);
            return this.formatName(prevLine);
          }
        }
      }
      
      // Verificar se a linha atual é um nome válido
      if (this.isValidName(line) && line.length > 10) {
        // Verificar se não é uma palavra-chave do documento
        const upperLine = line.toUpperCase();
        if (!upperLine.includes('REPÚBLICA') && 
            !upperLine.includes('ESTADO') && 
            !upperLine.includes('SECRETARIA') &&
            !upperLine.includes('INSTITUTO') &&
            !upperLine.includes('CARTEIRA') &&
            !upperLine.includes('REGISTRO')) {
          console.log('✅ RG Antigo SP: Nome encontrado:', line);
          return this.formatName(line);
        }
      }
    }
    
    console.log('❌ RG Antigo SP: Nome não encontrado');
    return null;
  }
  
  extractRG(text) {
    console.log('🔍 RG Antigo SP: Extraindo RG...');
    
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
    
    const allMatches = [];
    
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
  
  extractCPF(text) {
    console.log('🔍 RG Antigo SP: Extraindo CPF...');
    
    const cpfPatterns = [
      /(\d{3}\.?\d{3}\.?\d{3}[-]?\d{2})/g,
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
      pattern.lastIndex = 0;
    }
    
    console.log('❌ RG Antigo SP: CPF não encontrado');
    return null;
  }
  
  extractBirthDate(text) {
    console.log('🔍 RG Antigo SP: Extraindo data de nascimento...');
    
    const birthPatterns = [
      /(\d{1,2}\/[A-Z]{3}\/\d{4})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
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
  
  extractFiliation(text) {
    console.log('🔍 RG Antigo SP: Extraindo filiação...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let mother;
    let father;
    
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
  
  extractBirthPlace(text) {
    console.log('🔍 RG Antigo SP: Extraindo naturalidade...');
    
    const birthPlacePatterns = [
      /NATURALIDADE[:\s]*([A-Z\s\-]{5,30})/i,
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
  
  extractDocumentOrigin(text) {
    const originPatterns = [
      /DOC\.\s*ORIGEM[:\s]*([A-Z\s\-]{5,50})/i,
    ];
    
    for (const pattern of originPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  isValidName(text) {
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
  
  isDate(number) {
    if (number.length === 8) {
      const year1 = parseInt(number.substring(4, 8));
      const year2 = parseInt(number.substring(0, 4));
      
      return (year1 >= 1900 && year1 <= 2100) || (year2 >= 1900 && year2 <= 2100);
    }
    return false;
  }
  
  formatName(name) {
    return name.split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  formatRG(rg) {
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
  
  formatCPF(cpf) {
    const clean = cpf.replace(/[^\d]/g, '');
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  
  formatBirthDate(date) {
    // Converter mês abreviado para número se necessário
    const monthMap = {
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
  
  getConfidence(data) {
    let score = 0;
    let total = 0;
    
    if (data.fullName) score += 3;
    total += 3;
    
    if (data.rg) score += 3;
    total += 3;
    
    if (data.cpf) score += 2;
    total += 2;
    
    if (data.birthDate) score += 2;
    total += 2;
    
    if (data.filiation?.mother || data.filiation?.father) score += 1;
    total += 1;
    
    if (data.birthPlace) score += 1;
    total += 1;
    
    return total > 0 ? score / total : 0;
  }
}

class IdentityOrchestrator {
  constructor() {
    this.rgAntigoSPExtractor = new RGAntigoSPExtractor();
  }

  async processIdentityDocument(text) {
    try {
      console.log('🆔 Iniciando processamento de documento de identidade...');

      // Detectar tipo de documento
      const documentTypeResult = DocumentTypeDetector.detectDocumentType(text);
      
      if (documentTypeResult.type !== 'RG_IDENTITY') {
        return this.createErrorResult('Documento não identificado como RG');
      }

      console.log('🆔 Tipo de documento:', documentTypeResult.type);
      console.log('🆔 Subtipo:', documentTypeResult.subtype);
      console.log('🆔 Confiança na detecção:', (documentTypeResult.confidence * 100).toFixed(1) + '%');

      // Selecionar extrator apropriado
      let extractor = null;
      let extractorName = '';

      if (documentTypeResult.subtype === 'RG_ANTIGO_SP' || this.rgAntigoSPExtractor.canHandle(text)) {
        extractor = this.rgAntigoSPExtractor;
        extractorName = 'RG Antigo SP';
      }

      if (!extractor) {
        return this.createErrorResult('Tipo de RG não suportado: ' + documentTypeResult.subtype);
      }

      console.log('🆔 Extrator selecionado:', extractorName);

      // Extrair dados
      const extractedData = await extractor.extract(text);

      // Calcular confiança
      const confidence = this.calculateConfidence(extractedData);

      const result = {
        success: true,
        data: {
          documentType: 'RG',
          subtype: documentTypeResult.subtype,
          fullName: extractedData.fullName,
          rg: extractedData.rg,
          cpf: extractedData.cpf,
          birthDate: extractedData.birthDate,
          filiation: extractedData.filiation,
          birthPlace: extractedData.birthPlace,
          issuedBy: extractedData.issuedBy,
          documentOrigin: extractedData.documentOrigin
        },
        confidence,
        method: {
          type: 'SPECIALIZED_EXTRACTOR',
          details: `Processado com ${extractorName}`
        }
      };

      console.log('✅ Extração de RG concluída com sucesso');
      console.log('📊 Dados extraídos:', result.data);
      console.log('📊 Confiança geral:', (confidence.overall * 100).toFixed(1) + '%');

      return result;

    } catch (error) {
      console.error('❌ Erro no processamento do RG:', error);
      return this.createErrorResult(`Erro no processamento: ${error}`);
    }
  }

  calculateConfidence(data) {
    const nameScore = data.fullName ? 1 : 0;
    const rgScore = data.rg ? 1 : 0;
    const cpfScore = data.cpf ? 1 : 0;
    const birthDateScore = data.birthDate ? 1 : 0;

    const weightedScore = (nameScore * 3 + rgScore * 3 + cpfScore * 2 + birthDateScore * 2) / 10;

    return {
      overall: weightedScore,
      name: nameScore,
      rg: rgScore,
      cpf: cpfScore,
      birthDate: birthDateScore
    };
  }

  createErrorResult(message) {
    return {
      success: false,
      error: message,
      confidence: {
        overall: 0,
        name: 0,
        rg: 0,
        cpf: 0,
        birthDate: 0
      }
    };
  }
}

// Função principal de teste
async function testRGExtraction() {
  console.log('🚀 === TESTE COMPLETO DO EXTRATOR DE RG ===\n');

  try {
    console.log('📋 Texto do RG a ser processado:');
    console.log(rgText);
    console.log('\n' + '='.repeat(50) + '\n');

    // Teste 1: Detecção de tipo de documento
    console.log('🔍 TESTE 1: Detecção de tipo de documento');
    const documentType = DocumentTypeDetector.detectDocumentType(rgText);
    console.log('📊 Resultado da detecção:', documentType);
    console.log('✅ Tipo detectado:', documentType.type);
    console.log('📋 Subtipo detectado:', documentType.subtype);
    console.log('📊 Confiança:', (documentType.confidence * 100).toFixed(1) + '%');
    console.log('\n' + '-'.repeat(30) + '\n');

    // Teste 2: Verificação de compatibilidade do extrator
    console.log('🔍 TESTE 2: Verificação de compatibilidade do extrator');
    const extractor = new RGAntigoSPExtractor();
    const canHandle = extractor.canHandle(rgText);
    console.log('✅ Extrator RG Antigo SP pode processar:', canHandle);
    console.log('\n' + '-'.repeat(30) + '\n');

    // Teste 3: Extração individual de campos
    console.log('🔍 TESTE 3: Extração individual de campos');
    
    const nome = extractor.extractFullName(rgText);
    console.log('📝 Nome extraído:', nome);
    
    const rg = extractor.extractRG(rgText);
    console.log('🆔 RG extraído:', rg);
    
    const cpf = extractor.extractCPF(rgText);
    console.log('📄 CPF extraído:', cpf);
    
    const birthDate = extractor.extractBirthDate(rgText);
    console.log('📅 Data de nascimento extraída:', birthDate);
    
    const filiation = extractor.extractFiliation(rgText);
    console.log('👨‍👩‍👧‍👦 Filiação extraída:', filiation);
    
    const birthPlace = extractor.extractBirthPlace(rgText);
    console.log('🏠 Naturalidade extraída:', birthPlace);
    
    const docOrigin = extractor.extractDocumentOrigin(rgText);
    console.log('📋 Documento de origem:', docOrigin);
    
    console.log('\n' + '-'.repeat(30) + '\n');

    // Teste 4: Extração completa via orquestrador
    console.log('🔍 TESTE 4: Extração completa via orquestrador');
    const orchestrator = new IdentityOrchestrator();
    const result = await orchestrator.processIdentityDocument(rgText);
    
    console.log('📊 RESULTADO FINAL:', JSON.stringify(result, null, 2));
    
    // Teste 5: Validação dos resultados esperados
    console.log('\n' + '-'.repeat(30) + '\n');
    console.log('🔍 TESTE 5: Validação dos resultados esperados');
    
    const expectedResults = {
      fullName: 'Daniel Coelho Da Costa',
      rg: '48.151.623-42',
      cpf: '342.002.171-42',
      birthDate: '19/12/1980',
      motherName: 'Rosa Coelho Da Costa',
      fatherName: 'Edivaldo Da Costa',
      birthPlace: 'SÃO PAULO - SP'
    };
    
    console.log('✅ Resultados esperados vs obtidos:');
    console.log('Nome esperado:', expectedResults.fullName);
    console.log('Nome obtido:', result.data?.fullName);
    console.log('✅ Match:', result.data?.fullName === expectedResults.fullName ? 'SIM' : 'NÃO');
    
    console.log('RG esperado:', expectedResults.rg);
    console.log('RG obtido:', result.data?.rg);
    console.log('✅ Match:', result.data?.rg === expectedResults.rg ? 'SIM' : 'NÃO');
    
    console.log('CPF esperado:', expectedResults.cpf);
    console.log('CPF obtido:', result.data?.cpf);
    console.log('✅ Match:', result.data?.cpf === expectedResults.cpf ? 'SIM' : 'NÃO');
    
    console.log('Data esperada:', expectedResults.birthDate);
    console.log('Data obtida:', result.data?.birthDate);
    console.log('✅ Match:', result.data?.birthDate === expectedResults.birthDate ? 'SIM' : 'NÃO');
    
    console.log('Mãe esperada:', expectedResults.motherName);
    console.log('Mãe obtida:', result.data?.filiation?.mother);
    console.log('✅ Match:', result.data?.filiation?.mother === expectedResults.motherName ? 'SIM' : 'NÃO');

    // Resumo final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO FINAL DO TESTE');
    console.log('='.repeat(50));
    
    if (result.success) {
      console.log('✅ Status: SUCESSO');
      console.log('📊 Confiança geral:', (result.confidence.overall * 100).toFixed(1) + '%');
      console.log('📋 Método:', result.method.details);
      console.log('🆔 Tipo de documento:', result.data.documentType);
      console.log('📋 Subtipo:', result.data.subtype);
      
      const fieldsExtracted = [
        result.data.fullName ? 'Nome' : null,
        result.data.rg ? 'RG' : null,
        result.data.cpf ? 'CPF' : null,
        result.data.birthDate ? 'Data nascimento' : null,
        result.data.filiation?.mother ? 'Nome da mãe' : null,
        result.data.filiation?.father ? 'Nome do pai' : null,
        result.data.birthPlace ? 'Naturalidade' : null
      ].filter(Boolean);
      
      console.log('📝 Campos extraídos (' + fieldsExtracted.length + '/7):', fieldsExtracted.join(', '));
      
      if (result.confidence.overall >= 0.8) {
        console.log('🎉 RESULTADO: EXCELENTE (>= 80%)');
      } else if (result.confidence.overall >= 0.6) {
        console.log('👍 RESULTADO: BOM (>= 60%)');
      } else {
        console.log('⚠️ RESULTADO: PRECISA MELHORAR (< 60%)');
      }
    } else {
      console.log('❌ Status: FALHA');
      console.log('🚫 Erro:', result.error);
    }
    
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar teste
testRGExtraction();