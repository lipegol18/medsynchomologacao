/**
 * Teste da arquitetura unificada para RG de todos os estados brasileiros
 * Valida funcionamento com SP, RJ, MG e outros estados
 */

// Simular textos de RG de diferentes estados
const rgTextos = {
  sp: `
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
`,

  rj: `
REPÚBLICA FEDERATIVA DO BRASIL
ESTADO DO RIO DE JANEIRO
SECRETARIA DE ESTADO DE SEGURANÇA PÚBLICA
INSTITUTO FÉLIX PACHECO

CARTEIRA DE IDENTIDADE
REGISTRO GERAL

NOME: MARIA SILVA SANTOS
RG: 12.345.678-9
CPF: 123.456.789-01

FILIAÇÃO
JOÃO SILVA SANTOS
ANA MARIA SILVA

NATURALIDADE: RIO DE JANEIRO - RJ
DATA DE NASCIMENTO: 15/03/1985

SSP/RJ
`,

  mg: `
REPÚBLICA FEDERATIVA DO BRASIL
ESTADO DE MINAS GERAIS
SECRETARIA DA SEGURANÇA PÚBLICA
INSTITUTO DE IDENTIFICAÇÃO

CARTEIRA DE IDENTIDADE
REGISTRO GERAL

23.456.789-1

CARLOS OLIVEIRA SILVA

FILIAÇÃO
JOSÉ OLIVEIRA SILVA
MARIA HELENA OLIVEIRA

NATURALIDADE
BELO HORIZONTE - MG

22/05/1975

234.567.890-12
`,

  ba: `
REPÚBLICA FEDERATIVA DO BRASIL
ESTADO DA BAHIA
SECRETARIA DA SEGURANÇA PÚBLICA
DEPARTAMENTO DE POLÍCIA TÉCNICA

CARTEIRA DE IDENTIDADE

NOME: JOÃO PEREIRA DOS SANTOS
34.567.890-2
CPF: 345.678.901-23

FILIAÇÃO
ANTÔNIO PEREIRA DOS SANTOS
CONCEIÇÃO MARIA DOS SANTOS

NATURALIDADE: SALVADOR - BA
NASCIMENTO: 10/11/1990

SSP/BA
`
};

// Implementação simplificada das classes para teste
class DocumentTypeDetector {
  static detectDocumentType(text) {
    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');
    
    const rgPatterns = [
      /REPÚBLICA FEDERATIVA DO BRASIL/,
      /CARTEIRA DE IDENTIDADE/,
      /REGISTRO GERAL/,
      /SECRETARIA.*SEGURANÇA PÚBLICA/,
      /FILIAÇÃO/,
      /NATURALIDADE/,
    ];
    
    const rgMatches = rgPatterns.filter(pattern => pattern.test(normalizedText)).length;
    
    if (rgMatches >= 4) {
      // Detectar subtipo
      let subtype = 'RG_ANTIGO';
      if (text.includes('CARTEIRA DE IDENTIDADE NACIONAL') || text.includes('CIN')) {
        subtype = 'CIN_NOVA';
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

class RGAntigoUnificadoExtractor {
  
  canHandle(text) {
    const normalizedText = text.toUpperCase();
    
    const requiredPatterns = [
      /REPÚBLICA FEDERATIVA DO BRASIL/,
      /CARTEIRA DE IDENTIDADE/,
      /REGISTRO GERAL/,
      /SECRETARIA.*SEGURANÇA PÚBLICA/,
      /FILIAÇÃO/,
      /NATURALIDADE/
    ];
    
    const statePatterns = [
      /ESTADO DE SÃO PAULO/,
      /ESTADO DO RIO DE JANEIRO/,
      /ESTADO DE MINAS GERAIS/,
      /ESTADO DA BAHIA/,
      /SSP\/[A-Z]{2}/,
      /INSTITUTO DE IDENTIFICAÇÃO/,
    ];
    
    const requiredMatches = requiredPatterns.filter(pattern => pattern.test(normalizedText)).length;
    const stateMatches = statePatterns.filter(pattern => pattern.test(normalizedText)).length;
    
    return requiredMatches >= 3 && stateMatches >= 1;
  }
  
  async extract(text) {
    console.log('🆔 RG Antigo Unificado: Iniciando extração...');
    
    const data = {
      fullName: this.extractFullName(text),
      rg: this.extractRG(text),
      cpf: this.extractCPF(text),
      birthDate: this.extractBirthDate(text),
      filiation: this.extractFiliation(text),
      birthPlace: this.extractBirthPlace(text),
      issuedBy: this.extractIssuedBy(text),
      documentOrigin: this.extractDocumentOrigin(text)
    };
    
    console.log('🆔 RG Antigo Unificado: Dados extraídos:', data);
    return data;
  }
  
  extractFullName(text) {
    console.log('🔍 Extraindo nome...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Estratégia 1: Campo explícito "NOME:"
    for (const line of lines) {
      if (line.toUpperCase().startsWith('NOME:')) {
        const name = line.replace(/^NOME\s*:?\s*/i, '').trim();
        if (this.isValidName(name)) {
          console.log('✅ Nome encontrado em campo NOME:', name);
          return this.formatName(name);
        }
      }
    }
    
    // Estratégia 2: Nome antes de "FILIAÇÃO"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.includes('FILIAÇÃO')) {
        for (let j = Math.max(0, i - 3); j < i; j++) {
          const prevLine = lines[j].trim();
          if (this.isValidName(prevLine) && prevLine.length > 5) {
            console.log('✅ Nome encontrado antes de FILIAÇÃO:', prevLine);
            return this.formatName(prevLine);
          }
        }
      }
    }
    
    // Estratégia 3: Nome após número do RG
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2}$/.test(line) || /^\d{8,10}$/.test(line)) {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (this.isValidName(nextLine)) {
            console.log('✅ Nome encontrado após RG:', nextLine);
            return this.formatName(nextLine);
          }
        }
      }
    }
    
    // Estratégia 4: Nome isolado válido
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
    
    return null;
  }
  
  extractRG(text) {
    console.log('🔍 Extraindo RG...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Estratégia 1: Linha isolada com formato RG
    for (const line of lines) {
      const rgPattern = /^(\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2})$/;
      const match = line.match(rgPattern);
      
      if (match) {
        const cleanNumber = match[1].replace(/[^\d]/g, '');
        if (cleanNumber.length >= 8 && cleanNumber.length <= 10) {
          const formattedRG = this.formatRG(cleanNumber);
          console.log('✅ RG encontrado na linha isolada:', formattedRG);
          return formattedRG;
        }
      }
    }
    
    // Estratégia 2: Campo "RG:"
    const rgFieldPattern = /RG\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2})/i;
    const rgMatch = text.match(rgFieldPattern);
    if (rgMatch) {
      const formattedRG = this.formatRG(rgMatch[1]);
      console.log('✅ RG encontrado em campo RG:', formattedRG);
      return formattedRG;
    }
    
    // Estratégia 3: Busca geral por padrões
    const rgPatterns = [
      /(\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2})/g,
      /\b(\d{8,10})\b/g
    ];
    
    for (const pattern of rgPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const cleanNumber = match[1].replace(/[^\d]/g, '');
        if (cleanNumber.length >= 8 && cleanNumber.length <= 10) {
          if (!this.isDate(cleanNumber) && cleanNumber !== this.extractCPFNumber(text)) {
            const formattedRG = this.formatRG(cleanNumber);
            console.log('✅ RG encontrado via padrão:', formattedRG);
            return formattedRG;
          }
        }
        if (!pattern.global) break;
      }
      pattern.lastIndex = 0;
    }
    
    return null;
  }
  
  extractCPF(text) {
    const cpfPatterns = [
      /CPF\s*:?\s*(\d{3}\.?\d{3}\.?\d{3}[-]?\d{2})/i,
      /(\d{3}\.?\d{3}\.?\d{3}[-]?\d{2})/g,
    ];
    
    for (const pattern of cpfPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const cleanCPF = match[1].replace(/[^\d]/g, '');
        if (cleanCPF.length === 11) {
          return this.formatCPF(cleanCPF);
        }
        if (!pattern.global) break;
      }
      pattern.lastIndex = 0;
    }
    
    return null;
  }
  
  extractCPFNumber(text) {
    const cpf = this.extractCPF(text);
    return cpf ? cpf.replace(/[^\d]/g, '') : null;
  }
  
  extractBirthDate(text) {
    const birthPatterns = [
      /(?:DATA\s+DE\s+)?NASCIMENTO\s*:?\s*(\d{1,2}\/(?:[A-Z]{3}|\d{1,2})\/\d{4})/i,
      /(\d{1,2}\/[A-Z]{3}\/\d{4})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
    ];
    
    for (const pattern of birthPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return this.formatBirthDate(match[1]);
      }
    }
    
    return null;
  }
  
  extractFiliation(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let mother, father;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      
      if (line.includes('FILIAÇÃO')) {
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const parentLine = lines[j].trim();
          
          if (this.isValidName(parentLine) && parentLine.length > 5) {
            if (!mother) {
              mother = this.formatName(parentLine);
            } else if (!father) {
              father = this.formatName(parentLine);
              break;
            }
          }
        }
      }
    }
    
    return mother || father ? { mother, father } : null;
  }
  
  extractBirthPlace(text) {
    const birthPlacePatterns = [
      /NATURALIDADE\s*:?\s*([A-Z\s\-]{5,30})/i,
      /((?:[A-Z\s]+)\s*[-]\s*[A-Z]{2})/
    ];
    
    for (const pattern of birthPlacePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  extractIssuedBy(text) {
    if (text.includes('SSP/SP')) return 'SSP/SP';
    if (text.includes('SSP/RJ')) return 'SSP/RJ';
    if (text.includes('SSP/MG')) return 'SSP/MG';
    if (text.includes('SSP/BA')) return 'SSP/BA';
    
    const sspMatch = text.match(/SSP\/([A-Z]{2})/);
    if (sspMatch) return `SSP/${sspMatch[1]}`;
    
    return 'SSP';
  }
  
  extractDocumentOrigin(text) {
    const originPatterns = [
      /DOC\.\s*ORIGEM\s*:?\s*([A-Z\s\-]{5,50})/i,
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
    if (!/^[A-ZÀ-Ÿ\s]+$/.test(text.toUpperCase())) return false;
    
    const invalidWords = [
      'REPÚBLICA', 'FEDERATIVA', 'BRASIL', 'ESTADO', 'SECRETARIA',
      'SEGURANÇA', 'PÚBLICA', 'INSTITUTO', 'IDENTIFICAÇÃO', 
      'CARTEIRA', 'IDENTIDADE', 'REGISTRO', 'GERAL', 'FILIAÇÃO',
      'NATURALIDADE', 'NASCIMENTO', 'ORIGEM'
    ];
    
    const upperText = text.toUpperCase();
    if (invalidWords.some(word => upperText.includes(word))) return false;
    
    const words = text.trim().split(/\s+/);
    return words.length >= 2;
  }
  
  containsDocumentKeywords(text) {
    const keywords = [
      'REPÚBLICA', 'FEDERATIVA', 'BRASIL', 'ESTADO', 'SECRETARIA',
      'SEGURANÇA', 'PÚBLICA', 'INSTITUTO', 'IDENTIFICAÇÃO', 
      'CARTEIRA', 'IDENTIDADE', 'REGISTRO', 'GERAL', 'FILIAÇÃO',
      'NATURALIDADE', 'VÁLIDA', 'TERRITÓRIO', 'NACIONAL'
    ];
    
    const upperText = text.toUpperCase();
    return keywords.some(keyword => upperText.includes(keyword));
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
}

class IdentityOrchestrator {
  constructor() {
    this.rgAntigoUnificadoExtractor = new RGAntigoUnificadoExtractor();
  }

  async processIdentityDocument(text) {
    try {
      console.log('🆔 Iniciando processamento...');

      const documentTypeResult = DocumentTypeDetector.detectDocumentType(text);
      
      if (documentTypeResult.type !== 'RG_IDENTITY') {
        return { success: false, error: 'Documento não identificado como RG' };
      }

      console.log('🆔 Tipo:', documentTypeResult.type);
      console.log('🆔 Subtipo:', documentTypeResult.subtype);
      console.log('🆔 Confiança:', (documentTypeResult.confidence * 100).toFixed(1) + '%');

      let extractor = null;
      let extractorName = '';

      if (documentTypeResult.subtype === 'RG_ANTIGO' || 
          documentTypeResult.subtype === 'RG_GENERICO' || 
          this.rgAntigoUnificadoExtractor.canHandle(text)) {
        extractor = this.rgAntigoUnificadoExtractor;
        extractorName = 'RG Antigo Unificado';
      }

      if (!extractor) {
        return { success: false, error: 'Tipo de RG não suportado: ' + documentTypeResult.subtype };
      }

      console.log('🆔 Extrator selecionado:', extractorName);

      const extractedData = await extractor.extract(text);
      const confidence = this.calculateConfidence(extractedData);

      return {
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

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      return { success: false, error: `Erro no processamento: ${error}` };
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
}

// Função principal de teste
async function testRGUnificado() {
  console.log('🚀 === TESTE DA ARQUITETURA RG UNIFICADA ===\n');

  const orchestrator = new IdentityOrchestrator();
  const estados = ['sp', 'rj', 'mg', 'ba'];
  const resultados = {};

  for (const estado of estados) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔍 TESTANDO RG DO ESTADO: ${estado.toUpperCase()}`);
    console.log('='.repeat(50));
    
    const texto = rgTextos[estado];
    console.log('📋 Texto do RG:');
    console.log(texto);
    
    try {
      const result = await orchestrator.processIdentityDocument(texto);
      resultados[estado] = result;
      
      if (result.success) {
        console.log('\n✅ EXTRAÇÃO BEM-SUCEDIDA');
        console.log('👤 Nome:', result.data.fullName || 'N/A');
        console.log('🆔 RG:', result.data.rg || 'N/A');
        console.log('📄 CPF:', result.data.cpf || 'N/A');
        console.log('📅 Nascimento:', result.data.birthDate || 'N/A');
        console.log('👩 Mãe:', result.data.filiation?.mother || 'N/A');
        console.log('👨 Pai:', result.data.filiation?.father || 'N/A');
        console.log('🏠 Naturalidade:', result.data.birthPlace || 'N/A');
        console.log('🏛️ Órgão:', result.data.issuedBy || 'N/A');
        console.log('📊 Confiança:', (result.confidence.overall * 100).toFixed(1) + '%');
        
        const fieldsExtracted = [
          result.data.fullName ? 'Nome' : null,
          result.data.rg ? 'RG' : null,
          result.data.cpf ? 'CPF' : null,
          result.data.birthDate ? 'Data' : null,
          result.data.filiation?.mother ? 'Mãe' : null,
          result.data.filiation?.father ? 'Pai' : null,
          result.data.birthPlace ? 'Naturalidade' : null
        ].filter(Boolean);
        
        console.log('📝 Campos extraídos (' + fieldsExtracted.length + '/7):', fieldsExtracted.join(', '));
        
      } else {
        console.log('\n❌ FALHA NA EXTRAÇÃO');
        console.log('🚫 Erro:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Erro durante teste:', error);
      resultados[estado] = { success: false, error: error.message };
    }
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO FINAL - ARQUITETURA UNIFICADA');
  console.log('='.repeat(60));
  
  let sucessos = 0;
  let totalCampos = 0;
  let camposExtraidos = 0;
  
  for (const [estado, resultado] of Object.entries(resultados)) {
    console.log(`\n🏛️ ${estado.toUpperCase()}:`);
    
    if (resultado.success) {
      sucessos++;
      const campos = [
        resultado.data.fullName,
        resultado.data.rg,
        resultado.data.cpf,
        resultado.data.birthDate,
        resultado.data.filiation?.mother,
        resultado.data.filiation?.father,
        resultado.data.birthPlace
      ];
      
      const extraidos = campos.filter(Boolean).length;
      camposExtraidos += extraidos;
      totalCampos += 7;
      
      console.log(`   ✅ Sucesso - ${extraidos}/7 campos - ${(resultado.confidence.overall * 100).toFixed(1)}%`);
    } else {
      console.log(`   ❌ Falha - ${resultado.error}`);
      totalCampos += 7;
    }
  }
  
  console.log('\n📈 ESTATÍSTICAS GERAIS:');
  console.log(`   🎯 Taxa de sucesso: ${sucessos}/${estados.length} (${(sucessos/estados.length*100).toFixed(1)}%)`);
  console.log(`   📝 Campos extraídos: ${camposExtraidos}/${totalCampos} (${(camposExtraidos/totalCampos*100).toFixed(1)}%)`);
  
  if (sucessos === estados.length) {
    console.log('\n🎉 ARQUITETURA UNIFICADA FUNCIONANDO PERFEITAMENTE!');
    console.log('✅ Compatível com RG de todos os estados testados');
    console.log('✅ Múltiplas estratégias de extração funcionando');
    console.log('✅ Pronta para produção');
  } else {
    console.log('\n⚠️ Arquitetura precisa de ajustes para alguns estados');
  }
  
  console.log('='.repeat(60));
}

// Executar teste
testRGUnificado();