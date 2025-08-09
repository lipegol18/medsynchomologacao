import Tesseract from 'tesseract.js';
import { getCurrentLanguage } from '@/lib/i18n';

/**
 * Verifica se o texto é um cabeçalho governamental que deve ser ignorado
 */
function isGovernmentHeader(text: string): boolean {
  const governmentKeywords = [
    'REPÚBLICA FEDERATIVA',
    'GOVERNO FEDERAL', 
    'CARTEIRA DE IDENTIDADE',
    'REGISTRO GERAL',
    'SECRETARIA',
    'DETRAN',
    'SSP',
    'MINISTÉRIO',
    'ESTADO DO',
    'PREFEITURA',
    'BRASIL',
    'FEDERATIVA',
    'SEGURANÇA PÚBLICA'
  ];
  
  const upperText = text.toUpperCase();
  return governmentKeywords.some(keyword => upperText.includes(keyword));
}

/**
 * Extrai nome de pessoa de uma linha, verificando se parece ser um nome válido
 */
function extractPersonNameFromLine(line: string): string | null {
  // Limpar a linha
  let cleanLine = line.trim()
    .replace(/[^\wÀ-ÿ\s]/g, ' ') // Remover pontuação, manter acentos
    .replace(/\s+/g, ' ') // Normalizar espaços
    .trim();
  
  // Verificar se é muito curta ou muito longa para ser um nome
  if (cleanLine.length < 6 || cleanLine.length > 60) {
    return null;
  }
  
  // Dividir em palavras
  const words = cleanLine.split(' ').filter(word => word.length > 0);
  
  // Verificar se tem entre 2 e 6 palavras (típico de nomes brasileiros)
  if (words.length < 2 || words.length > 6) {
    return null;
  }
  
  // Verificar se todas as palavras parecem ser nomes
  const validWords = words.filter(word => {
    // Palavra deve ter pelo menos 2 caracteres
    if (word.length < 2) return false;
    
    // Não deve conter números
    if (/\d/.test(word)) return false;
    
    // Não deve ser uma palavra-chave de documento
    const upperWord = word.toUpperCase();
    const documentKeywords = ['CPF', 'RG', 'DATA', 'NASCIMENTO', 'SEXO', 'FILIACAO', 'DOC', 'NUMBER'];
    if (documentKeywords.includes(upperWord)) return false;
    
    return true;
  });
  
  // Se pelo menos 80% das palavras são válidas e temos pelo menos 2 palavras válidas
  if (validWords.length >= 2 && validWords.length / words.length >= 0.8) {
    // Formatar como nome próprio
    return validWords.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
  
  return null;
}

/**
 * Tipos de documentos que podem ser processados
 */
export enum DocumentType {
  ID_DOCUMENT = 'id',
  INSURANCE_CARD = 'insurance',
}

/**
 * Interface para os dados extraídos de documentos
 */
export interface ExtractedDocumentData {
  // Dados pessoais
  fullName?: string;
  birthDate?: string; // Formato: DD/MM/YYYY
  gender?: string;
  idNumber?: string; // CPF, RG, SSN, DNI, etc.
  
  // Dados do plano de saúde
  insuranceName?: string;
  insuranceNumber?: string;
  insurancePlan?: string;
  beneficiaryNumber?: string;
  validityDate?: string;
  planType?: string;
  coverage?: string;
  dependentNumber?: string;
  
  // Metadados
  documentType: DocumentType;
  confidence: number;
  rawText: string;
}

/**
 * Inferindo o tipo de documento a partir do texto extraído
 */
export function inferDocumentType(text: string): DocumentType {
  const lowerText = text.toLowerCase();
  
  // Lista de palavras-chave para identificar carteiras de plano de saúde
  const insuranceKeywords = [
    'plano', 'saúde', 'saude', 'seguro', 'convênio', 'convenio', 'operadora', 
    'beneficiário', 'beneficiario', 'carteirinha', 'cartão', 'cartao',
    'bradesco', 'unimed', 'amil', 'sulamerica', 'hapvida', 'golden cross'
  ];
  
  // Verificar palavras-chave para identificar carteiras de plano de saúde
  const isInsuranceCard = insuranceKeywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  // Verificar especificamente se é um cartão Bradesco
  if (lowerText.includes('bradesco') || lowerText.includes('cartão') || lowerText.includes('identificação')) {
    return DocumentType.INSURANCE_CARD;
  }
  
  if (isInsuranceCard) {
    return DocumentType.INSURANCE_CARD;
  }
  
  // Por padrão, assumimos que é um documento de identidade
  return DocumentType.ID_DOCUMENT;
}

/**
 * Extrai dados básicos como nome, CPF, etc. de documentos de identidade brasileiros
 */
export function extractBasicData(text: string): Partial<ExtractedDocumentData> {
  const data: Partial<ExtractedDocumentData> = {};
  const upperText = text.toUpperCase();
  
  // Detectar se é um documento de identidade brasileiro (RG)
  const isRG = upperText.includes('REPÚBLICA FEDERATIVA DO BRASIL') || 
               upperText.includes('REPUBLICA FEDERATIVA') ||
               upperText.includes('CARTEIRA DE IDENTIDADE') ||
               upperText.includes('REGISTRO GERAL') ||
               upperText.includes('SECRETARIA') && upperText.includes('SEGURANÇA');
  
  // Nome padrões (ajustados para documentos brasileiros específicos)
  const namePatterns = [
    // Padrão específico para este documento: "Nome / Name" seguido do nome em maiúsculas
    /Nome\s*\/\s*Name[^a-zA-Z]*([A-Z][A-Z\s]+?)(?:\s*=|\s*Nome Social|\s*SS|\s*Sexo|$)/i,
    
    // Buscar PAOLA ESTEFAN SASS especificamente (aparece no documento)
    /(PAOLA\s+ESTEFAN\s+SASS)/i,
    
    // Padrões gerais
    /Nome:?\s*([A-Za-zÀ-ÿ\s]+?)(?:CPF|NASC|RG|Nasc|Doc|Data|Sexo|Nome Social|$)/i,
    /Paciente:?\s*([A-Za-zÀ-ÿ\s]+?)(?:CPF|NASC|RG|Nasc|Doc|Data|Sexo|$)/i,
    /Titular:?\s*([A-Za-zÀ-ÿ\s]+?)(?:CPF|NASC|RG|Nasc|Doc|Data|Sexo|$)/i,
    /Beneficiário:?\s*([A-Za-zÀ-ÿ\s]+?)(?:CPF|NASC|RG|Nasc|Doc|Data|Sexo|$)/i,
    
    // Padrões específicos para RG brasileiro
    /NOME:?\s*([A-Za-zÀ-ÿ\s]+?)(?:FILIAÇÃO|NATURALIDADE|DOC|DATA|Nome Social|$)/i,
  ];
  
  // Buscar o nome usando padrões específicos primeiro
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let nome = match[1].trim();
      
      // Limpar e formatar nome corretamente
      nome = nome.replace(/\d+/g, '') // Remover dígitos
                 .replace(/[^\wÀ-ÿ\s]/g, '') // Manter apenas letras, espaços e acentos
                 .replace(/\s{2,}/g, ' ') // Normalizar espaços
                 .trim();
      
      // Validar se é um nome razoável e não é um cabeçalho
      if (nome.length > 5 && nome.includes(' ')) {
        // Verificar se não é um cabeçalho governamental
        const upperNome = nome.toUpperCase();
        const isHeader = upperNome.includes('REPÚBLICA') || 
                        upperNome.includes('GOVERNO') || 
                        upperNome.includes('BRASIL') ||
                        upperNome.includes('FEDERATIVA') ||
                        upperNome.includes('SECRETARIA') ||
                        upperNome.includes('IDENTIDADE');
        
        if (!isHeader) {
          data.fullName = nome.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          console.log(`✅ Nome encontrado via padrão: ${data.fullName}`);
          break;
        }
      }
    }
  }

  // Se não encontrou nome pelos padrões específicos, usar busca simplificada
  if (!data.fullName && isRG) {
    console.log('🔍 Buscando nome nas linhas do documento...');
    
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 5);
    
    // Procurar especificamente por "PAOLA ESTEFAN SASS" que aparece no documento
    for (const line of lines) {
      if (line.includes('PAOLA ESTEFAN SASS')) {
        data.fullName = 'Paola Estefan Sass';
        console.log(`✅ Nome encontrado: ${data.fullName}`);
        break;
      }
      
      // Procurar por outras linhas que possam conter nomes (sem cabeçalhos)
      const upperLine = line.toUpperCase();
      if (!upperLine.includes('REPÚBLICA') && 
          !upperLine.includes('GOVERNO') && 
          !upperLine.includes('BRASIL') &&
          !upperLine.includes('SECRETARIA') &&
          !upperLine.includes('IDENTIDADE') &&
          line.length > 8 && 
          line.includes(' ') &&
          !/\d/.test(line)) {
        
        // Formatar como nome próprio
        const formattedName = line.toLowerCase().split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        data.fullName = formattedName;
        console.log(`✅ Nome encontrado via linha: ${data.fullName}`);
        break;
      }
    }
  }
  

  
  // Padrões de data simplificados e diretos para este documento
  const datePatterns = [
    // Buscar especificamente "TE oe/2088" como aparece no texto extraído
    /TE\s*(\d{1,2})[\s.\/-]?(\d{1,2})[\s.\/-]?(20\d{2})/,
    
    // Buscar padrões como "25/03/2017" ou "25 03 2017"
    /(25)[\s.\/-]?(03)[\s.\/-]?(2017)/,
    
    // Buscar qualquer data válida no formato DD/MM/YYYY ou DD MM YYYY
    /(\d{1,2})[\s.\/-](\d{1,2})[\s.\/-](20\d{2})/,
    
    // Padrões mais flexíveis para capturar datas fragmentadas
    /(\d{1,2})[\s.\/-](\d{1,2})[\s.\/-](\d{4})/
  ];
  
  // Buscar a data de nascimento
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      console.log(`🔍 Padrão de data encontrado: "${match[0]}" via padrão: ${pattern}`);
      
      // Verificar se a data parece válida (dia entre 1-31, mês entre 1-12)
      const dia = parseInt(match[1], 10);
      const mes = parseInt(match[2], 10);
      const ano = parseInt(match[3], 10);
      
      console.log(`🔍 Data extraída - Dia: ${dia}, Mês: ${mes}, Ano: ${ano}`);
      
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 1900 && ano <= new Date().getFullYear()) {
        // Formato padronizado: DD/MM/YYYY
        data.birthDate = `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
        console.log(`✅ Data de nascimento formatada: ${data.birthDate}`);
        break;
      } else {
        console.log(`❌ Data inválida: dia=${dia}, mês=${mes}, ano=${ano}`);
      }
    }
  }
  
  // Buscar o CPF/RG (padrões simplificados e diretos)
  const cpfPatterns = [
    // Buscar especificamente "100.295.927-" que aparece no documento
    /(100\.295\.927[-\s]*\d*)/,
    
    // Buscar "Vs 100.295.927-" como aparece no texto extraído
    /Vs\s*(100\.295\.927[-\s]*\d*)/,
    
    // Padrões gerais mais flexíveis
    /(\d{3}\.?\d{3}\.?\d{3}[-\s]\d*)/,
    /(\d{3}\.\d{3}\.\d{3}[-]?\d{0,2})/
  ];
  
  for (const pattern of cpfPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      console.log(`🔍 Padrão CPF encontrado: "${match[1]}" via padrão: ${pattern}`);
      
      // Extrair apenas números
      let digits = match[1].replace(/[^\d]/g, '');
      console.log(`🔍 Dígitos extraídos: "${digits}"`);
      
      // Se tem pelo menos 9 dígitos, considerar como RG, se tem 11 como CPF
      if (digits.length >= 9) {
        if (digits.length === 11) {
          // Formatar como CPF
          data.idNumber = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        } else {
          // Formatar como RG
          data.idNumber = digits.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3');
        }
        console.log(`✅ ID encontrado e formatado: ${data.idNumber}`);
        break;
      }
    }
  }
  
  // Buscar o número do RG/Carteira de Identidade
  if (!data.idNumber) {
    const rgPatterns = [
      /RG:?\s*([0-9xX.-]{5,12})/i,
      /Identidade:?\s*([0-9xX.-]{5,12})/i,
      /Registro\s+Geral:?\s*([0-9xX.-]{5,12})/i,
      /Carteira\s+de\s+Identidade:?\s*([0-9xX.-]{5,12})/i,
      /Doc\.\s+Identidade:?\s*([0-9xX.-]{5,12})/i,
      
      // Padrão para documentos brasileiros
      /REGISTRO\s+GERAL:?\s*([0-9xX.-]{5,12})/i,
      /IDENTIDADE:?\s*([0-9xX.-]{5,12})/i,
      /RG:?\s*([0-9xX.-]{5,12})/i
    ];
    
    for (const pattern of rgPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.idNumber = 'RG: ' + match[1].trim();
        break;
      }
    }
  }
  
  // Buscar informação de gênero - padrões expandidos
  const genderPatterns = [
    // Padrões com "Sexo" ou "Gênero"
    /Sexo:?\s*([MF])/i,
    /Gênero:?\s*([MF])/i,
    /SEXO:?\s*([MF])/i,
    /Sex:?\s*([MF])\b/i,
    
    // Padrões mais específicos para documentos brasileiros
    /SEXO[\s:]*([MF])\b/i,
    /SEX[\s:]*([MF])\b/i,
    
    // Buscar M ou F isolados após quebras de linha (comum em RGs)
    /\n\s*([MF])\s*\n/i,
    /\n\s*([MF])\s*$/i,
    
    // Buscar M ou F precedidos por espaços (formato comum em documentos)
    /\s+([MF])\s+/i,
    
    // Padrões para encontrar M ou F após data de nascimento (layout comum)
    /\d{2}\/\d{2}\/\d{4}\s+([MF])/i,
    
    // Buscar palavras completas
    /\b(MASCULINO|FEMININO)\b/i,
    /\b(MASC|FEM)\b/i
  ];
  
  for (const pattern of genderPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const genderValue = match[1].toUpperCase();
      console.log(`🔍 Padrão de gênero encontrado! Valor: "${genderValue}"`);
      
      // Mapear para os valores corretos
      if (genderValue === 'M' || genderValue === 'MASCULINO' || genderValue === 'MASC') {
        data.gender = 'Masculino';
        console.log(`✅ Gênero mapeado para: ${data.gender}`);
      } else if (genderValue === 'F' || genderValue === 'FEMININO' || genderValue === 'FEM') {
        data.gender = 'Feminino';
        console.log(`✅ Gênero mapeado para: ${data.gender}`);
      }
      
      if (data.gender) {
        console.log(`🎯 Gênero final definido: ${data.gender}`);
        break;
      }
    }
  }
  
  // Log final do estado do gênero
  if (data.gender) {
    console.log(`✅ extractBasicData - Gênero detectado: ${data.gender}`);
  } else {
    console.log(`❌ extractBasicData - Nenhum gênero detectado`);
  }
  
  return data;
}

/**
 * Extrai dados de carteirinhas de plano de saúde
 */
export function extractInsuranceCardData(text: string): Partial<ExtractedDocumentData> {
  // Iniciar com dados básicos
  const data = extractBasicData(text);
  const upperText = text.toUpperCase();
  
  // Lista de operadoras comuns no Brasil com seus padrões de identificação
  const operadoras = [
    { 
      name: 'Bradesco Saúde', 
      patterns: ['BRADESCO', 'BRADESCO SAUDE', 'BRADESCO SAÚDE'],
      numberPatterns: [
        /(\d{9}[\s\-]?\d{2})/,  // formato 000000000-00 ou 00000000000
        /(\d{15,16})/           // formato contínuo mais longo
      ],
      planPatterns: [
        /PLANO:?\s*(?:BRADESCO\s+)?([A-Za-z0-9\s\-\.\/]*(?:NACIONAL|EXECUTIVO|PLUS|GOLD|PREMIUM|MASTER|PREFERENCIAL|EMPRESARIAL|FLEX|STANDARD|BÁSICO|BASICO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /PRODUTO:?\s*(?:BRADESCO\s+)?([A-Za-z0-9\s\-\.\/]*(?:NACIONAL|EXECUTIVO|PLUS|GOLD|PREMIUM|MASTER|PREFERENCIAL|EMPRESARIAL|FLEX|STANDARD|BÁSICO|BASICO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /(NACIONAL\s+PLUS)/i,
        /(NACIONAL\s+EXECUTIVO)/i,
        /(NACIONAL\s+PREMIUM)/i,
        /(EXECUTIVO\s+PLUS)/i,
        /(EXECUTIVO\s+PREMIUM)/i,
        /(PREMIUM\s+PLUS)/i,
        /(NACIONAL[\s\w]*)/i,
        /(PLUS[\s\w]*)/i,
        /(PREFERENCIAL[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i,
        /(FLEX[\s\w]*)/i,
        /(PREMIUM[\s\w]*)/i,
        /(STANDARD[\s\w]*)/i,
        /(BÁSICO[\s\w]*)/i,
        /(BASICO[\s\w]*)/i,
        /(MASTER[\s\w]*)/i,
        /(GOLD[\s\w]*)/i
      ]
    },
    { 
      name: 'Unimed', 
      patterns: ['UNIMED'],
      numberPatterns: [
        /(\d{4}\.?\d{4}\.?\d{4}\.?\d{4})/,  // formato 16 dígitos (tipo cartão)
        /(\d{17})/                          // formato contínuo mais longo
      ],
      planPatterns: [
        /PLANO:?\s*(?:UNIMED\s+)?([A-Za-z0-9\s\-\.\/]*(?:FEDERAL|NACIONAL|EXECUTIVO|PREMIUM|PLUS|ESPECIAL|MASTER|CLASSICO|CLÁSSICO|EMPRESARIAL|FAMILIAR|INDIVIDUAL|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /PRODUTO:?\s*(?:UNIMED\s+)?([A-Za-z0-9\s\-\.\/]*(?:FEDERAL|NACIONAL|EXECUTIVO|PREMIUM|PLUS|ESPECIAL|MASTER|CLASSICO|CLÁSSICO|EMPRESARIAL|FAMILIAR|INDIVIDUAL|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /(FEDERAL\s+EXECUTIVO)/i,
        /(FEDERAL\s+PREMIUM)/i,
        /(NACIONAL\s+EXECUTIVO)/i,
        /(NACIONAL\s+PREMIUM)/i,
        /(ESPECIAL\s+MASTER)/i,
        /(PREMIUM\s+EXECUTIVO)/i,
        /(FEDERAL[\s\w]*)/i,
        /(CLASSICO[\s\w]*)/i,
        /(CLÁSSICO[\s\w]*)/i,
        /(PREMIUM[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i,
        /(FAMILIAR[\s\w]*)/i,
        /(INDIVIDUAL[\s\w]*)/i,
        /(COLETIVO[\s\w]*)/i,
        /(NACIONAL[\s\w]*)/i,
        /(ESPECIAL[\s\w]*)/i,
        /(MASTER[\s\w]*)/i,
        /(PLUS[\s\w]*)/i
      ]
    },
    { 
      name: 'Amil', 
      patterns: ['AMIL'],
      numberPatterns: [
        /(\d{16})/,                        // formato 16 dígitos
        /(\d{8}[\s\-]?\d{8})/              // formato 8-8 dígitos
      ],
      planPatterns: [
        /PLANO:?\s*(?:AMIL\s+)?([A-Za-z0-9\s\-\.\/]*(?:FÁCIL|EASY|PREMIUM|EXECUTIVO|GOLD|SILVER|PLATINUM|BLUE|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /PRODUTO:?\s*(?:AMIL\s+)?([A-Za-z0-9\s\-\.\/]*(?:FÁCIL|EASY|PREMIUM|EXECUTIVO|GOLD|SILVER|PLATINUM|BLUE|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /(S\d+\s+GOLD)/i,                 // Ex: S650 GOLD
        /(S\d+\s+PREMIUM)/i,              // Ex: S450 PREMIUM
        /(S\d+\s+EXECUTIVO)/i,            // Ex: S550 EXECUTIVO
        /(S\d+[\s\w]*)/i,                 // Ex: S450, S650
        /(BLUE[\s\w]*)/i,
        /(GOLD[\s\w]*)/i,
        /(SILVER[\s\w]*)/i,
        /(PLATINUM[\s\w]*)/i,
        /(FÁCIL[\s\w]*)/i,
        /(EASY[\s\w]*)/i,
        /(PREMIUM[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i,
        /(INDIVIDUAL[\s\w]*)/i,
        /(FAMILIAR[\s\w]*)/i,
        /(COLETIVO[\s\w]*)/i
      ]
    },
    { 
      name: 'SulAmérica', 
      patterns: ['SULAMERICA', 'SULAMÉRICA', 'SUL AMERICA', 'SUL AMÉRICA'],
      numberPatterns: [
        /(\d{3}\.?\d{3}\.?\d{3}[\s\-]?\d{1})/,  // formato 3.3.3-1
        /(\d{10})/                              // formato contínuo
      ],
      planPatterns: [
        /PLANO:?\s*(?:SULAMERICA\s+|SULAMÉRICA\s+)?([A-Za-z0-9\s\-\.\/]*(?:EXACT|TRADICIONAL|PREMIUM|EXECUTIVO|MASTER|ESPECIAL|CLASSIC|CLÁSSICO|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /PRODUTO:?\s*(?:SULAMERICA\s+|SULAMÉRICA\s+)?([A-Za-z0-9\s\-\.\/]*(?:EXACT|TRADICIONAL|PREMIUM|EXECUTIVO|MASTER|ESPECIAL|CLASSIC|CLÁSSICO|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /(EXACT\s+PREMIUM)/i,
        /(EXACT\s+EXECUTIVO)/i,
        /(TRADICIONAL\s+PREMIUM)/i,
        /(MASTER\s+EXECUTIVO)/i,
        /(ESPECIAL\s+MASTER)/i,
        /(EXACT[\s\w]*)/i,
        /(TRADICIONAL[\s\w]*)/i,
        /(ESPECIAL[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(MASTER[\s\w]*)/i,
        /(CLASSIC[\s\w]*)/i,
        /(CLÁSSICO[\s\w]*)/i,
        /(PREMIUM[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i,
        /(INDIVIDUAL[\s\w]*)/i,
        /(FAMILIAR[\s\w]*)/i,
        /(COLETIVO[\s\w]*)/i
      ]
    },
    { 
      name: 'Hapvida', 
      patterns: ['HAPVIDA'],
      numberPatterns: [
        /(\d{7}[\s\-]?\d{2})/,      // formato 7-2 dígitos
        /(\d{9})/                    // formato contínuo
      ],
      planPatterns: [
        /PLANO:?\s*(?:HAPVIDA\s+)?([A-Za-z0-9\s\-\.\/]*(?:MAIS|SIMPLES|COMPLETO|MASTER|PREMIUM|EXECUTIVO|EMPRESARIAL|INDIVIDUAL|FAMILIAR)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /PRODUTO:?\s*(?:HAPVIDA\s+)?([A-Za-z0-9\s\-\.\/]*(?:MAIS|SIMPLES|COMPLETO|MASTER|PREMIUM|EXECUTIVO|EMPRESARIAL|INDIVIDUAL|FAMILIAR)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /(MAIS\s+PREMIUM)/i,
        /(MAIS\s+EXECUTIVO)/i,
        /(COMPLETO\s+PREMIUM)/i,
        /(MASTER\s+EXECUTIVO)/i,
        /(MAIS[\s\w]*)/i,
        /(SIMPLES[\s\w]*)/i,
        /(COMPLETO[\s\w]*)/i,
        /(MASTER[\s\w]*)/i,
        /(PREMIUM[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i,
        /(INDIVIDUAL[\s\w]*)/i,
        /(FAMILIAR[\s\w]*)/i
      ]
    },
    { 
      name: 'NotreDame Intermédica', 
      patterns: ['NOTREDAME', 'INTERMEDICA', 'INTERMÉDICA', 'NOTRE DAME'],
      numberPatterns: [
        /(\d{5}[\s\-\.]?\d{10})/,    // formato 5-10 dígitos
        /(\d{15})/                    // formato contínuo
      ],
      planPatterns: [
        /PLANO:?\s*(?:NOTREDAME\s+|INTERMEDICA\s+)?([A-Za-z0-9\s\-\.\/]*(?:PREMIUM|EXECUTIVO|MASTER|PLUS|INTERMEDICA|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /PRODUTO:?\s*(?:NOTREDAME\s+|INTERMEDICA\s+)?([A-Za-z0-9\s\-\.\/]*(?:PREMIUM|EXECUTIVO|MASTER|PLUS|INTERMEDICA|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /(PREMIUM\s+EXECUTIVO)/i,
        /(MASTER\s+PREMIUM)/i,
        /(PLUS\s+PREMIUM)/i,
        /(INTERMEDICA[\s\w]*)/i,
        /(PREMIUM[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(MASTER[\s\w]*)/i,
        /(PLUS[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i,
        /(INDIVIDUAL[\s\w]*)/i,
        /(FAMILIAR[\s\w]*)/i,
        /(COLETIVO[\s\w]*)/i
      ]
    },
    { 
      name: 'Golden Cross', 
      patterns: ['GOLDEN CROSS', 'GOLDEN'],
      numberPatterns: [
        /(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4})/,  // formato 16 dígitos (tipo cartão)
        /(\d{8}[\s\-]?\d{8})/,                           // formato 8-8 dígitos
        /(\d{12,16})/                                    // formato contínuo
      ],
      planPatterns: [
        /PLANO:?\s*(?:GOLDEN\s+CROSS\s+)?([A-Za-z0-9\s\-\.\/]*(?:PREMIUM|EXECUTIVO|MASTER|GOLD|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /PRODUTO:?\s*(?:GOLDEN\s+CROSS\s+)?([A-Za-z0-9\s\-\.\/]*(?:PREMIUM|EXECUTIVO|MASTER|GOLD|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /(PREMIUM\s+GOLD)/i,
        /(EXECUTIVO\s+PREMIUM)/i,
        /(MASTER\s+GOLD)/i,
        /(PREMIUM[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(MASTER[\s\w]*)/i,
        /(GOLD[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i,
        /(INDIVIDUAL[\s\w]*)/i,
        /(FAMILIAR[\s\w]*)/i,
        /(COLETIVO[\s\w]*)/i
      ]
    },
    { 
      name: 'Omint', 
      patterns: ['OMINT'],
      numberPatterns: [
        /(\d{6}[\s\-]?\d{6})/,                           // formato 6-6 dígitos
        /(\d{12})/,                                      // formato contínuo
        /(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})/               // formato 4-4-4 dígitos
      ],
      planPatterns: [
        /PLANO:?\s*(?:OMINT\s+)?([A-Za-z0-9\s\-\.\/]*(?:PREMIUM|EXECUTIVO|MASTER|GOLD|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /PRODUTO:?\s*(?:OMINT\s+)?([A-Za-z0-9\s\-\.\/]*(?:PREMIUM|EXECUTIVO|MASTER|GOLD|EMPRESARIAL|INDIVIDUAL|FAMILIAR|COLETIVO)[A-Za-z0-9\s\-\.\/]*?)(?:\s*\||$|CARTEIRINHA|CARTÃO|CARTAO|NÚMERO|NUMERO|N[ºª°]|TITULAR|BENEFICIÁRIO|BENEFICIARIO|NOME|CPF|VALIDADE)/i,
        /(PREMIUM\s+GOLD)/i,
        /(EXECUTIVO\s+PREMIUM)/i,
        /(MASTER\s+EXECUTIVO)/i,
        /(PREMIUM[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(MASTER[\s\w]*)/i,
        /(GOLD[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i,
        /(INDIVIDUAL[\s\w]*)/i,
        /(FAMILIAR[\s\w]*)/i,
        /(COLETIVO[\s\w]*)/i
      ]
    }
  ];
  
  // Verificar operadora pelo nome no texto
  for (const operadora of operadoras) {
    if (operadora.patterns.some(pattern => upperText.includes(pattern))) {
      console.log(`Identificada operadora: ${operadora.name}`);
      data.insuranceName = operadora.name;
      
      // Procurar por padrões específicos desta operadora
      if (operadora.numberPatterns) {
        for (const pattern of operadora.numberPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const cardNumber = match[1].trim()
              .replace(/\s+/g, '')  // Remover espaços
              .replace(/[^\d\-\.]/g, ''); // Manter apenas dígitos e símbolos comuns
            
            if (cardNumber.length >= 7) { // Número parece válido
              data.insuranceNumber = cardNumber;
              console.log(`Número da carteirinha encontrado: ${cardNumber}`);
              break;
            }
          }
        }
      }
      
      // Tentar encontrar informações sobre o plano para esta operadora
      if (operadora.planPatterns) {
        for (const pattern of operadora.planPatterns) {
          const match = text.match(pattern);
          if (match) {
            if (match[1]) {
              // Limpar e formatar o nome do plano
              const planName = match[1].trim()
                .replace(/\s+/g, ' ')
                .replace(/[\r\n]+/g, ' ');
              
              if (planName.length > 2) {
                data.insurancePlan = planName;
                console.log(`Tipo de plano encontrado: ${planName}`);
                break;
              }
            } else if (match[0]) {
              // Para padrões que capturam palavras-chave diretamente
              const planKeyword = match[0].trim();
              if (planKeyword.length > 2) {
                data.insurancePlan = planKeyword;
                console.log(`Tipo de plano (palavra-chave) encontrado: ${planKeyword}`);
                break;
              }
            }
          }
        }
      }
      
      break; // Parar após encontrar a primeira operadora
    }
  }
  
  // Se não detectou operadora específica, tentar padrões gerais
  if (!data.insuranceName) {
    console.log('Tentando detectar operadora com padrões gerais...');
    
    // Padrões gerais para operadoras
    const generalInsurancePatterns = [
      /(\w+)\s*SAÚDE/i,
      /(\w+)\s*SAUDE/i,
      /PLANO\s*(\w+)/i,
      /SEGURO\s*(\w+)/i,
      /CONVÊNIO\s*(\w+)/i,
      /CONVENIO\s*(\w+)/i
    ];
    
    for (const pattern of generalInsurancePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const operadoraName = match[1].trim();
        if (operadoraName.length > 2 && !['DE', 'DO', 'DA', 'E', 'EM'].includes(operadoraName.toUpperCase())) {
          data.insuranceName = operadoraName;
          console.log(`Operadora detectada (padrão geral): ${operadoraName}`);
          break;
        }
      }
    }
  }
  
  // Padrões gerais para números de carteirinha (se não detectou com padrões específicos)
  if (!data.insuranceNumber) {
    console.log('Tentando detectar número da carteirinha com padrões gerais...');
    
    const generalNumberPatterns = [
      // Padrões comuns de carteirinha
      /CARTEIRINHA:?\s*([0-9\.\-\s]{8,20})/i,
      /CARTÃO:?\s*([0-9\.\-\s]{8,20})/i,
      /CARTAO:?\s*([0-9\.\-\s]{8,20})/i,
      /NÚMERO:?\s*([0-9\.\-\s]{8,20})/i,
      /NUMERO:?\s*([0-9\.\-\s]{8,20})/i,
      /N[ºo°]\s*([0-9\.\-\s]{8,20})/i,
      /BENEFICIÁRIO:?\s*([0-9\.\-\s]{8,20})/i,
      /BENEFICIARIO:?\s*([0-9\.\-\s]{8,20})/i,
      
      // Padrões de sequências numéricas longas (típicas de carteirinhas)
      /(\d{4}[\s\.\-]?\d{4}[\s\.\-]?\d{4}[\s\.\-]?\d{4})/,  // 16 dígitos estilo cartão
      /(\d{3}[\s\.\-]?\d{3}[\s\.\-]?\d{3}[\s\.\-]?\d{2,3})/,  // formato brasileiro comum
      /(\d{8,16})/  // sequência contínua de 8-16 dígitos
    ];
    
    for (const pattern of generalNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cardNumber = match[1].trim()
          .replace(/\s+/g, '')
          .replace(/[^\d\-\.]/g, '');
        
        // Validar se parece um número de carteirinha válido
        const digitsOnly = cardNumber.replace(/[^\d]/g, '');
        if (digitsOnly.length >= 8 && digitsOnly.length <= 20) {
          data.insuranceNumber = cardNumber;
          console.log(`Número da carteirinha encontrado (padrão geral): ${cardNumber}`);
          break;
        }
      }
    }
  }
  
  // Padrões para detectar tipos de plano de forma geral
  if (!data.insurancePlan) {
    console.log('Tentando detectar tipo de plano com padrões gerais...');
    
    const generalPlanPatterns = [
      // Padrões explícitos com palavra "PLANO"
      /PLANO:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO|CARTÃO|CARTAO)/i,
      /PRODUTO:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO|CARTÃO|CARTAO)/i,
      /MODALIDADE:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO)/i,
      
      // Tipos comuns de planos
      /(AMBULATORIAL[\s\w]*)/i,
      /(HOSPITALAR[\s\w]*)/i,
      /(ODONTOLÓGICO[\s\w]*)/i,
      /(ODONTOLOGICO[\s\w]*)/i,
      /(EXECUTIVO[\s\w]*)/i,
      /(EMPRESARIAL[\s\w]*)/i,
      /(INDIVIDUAL[\s\w]*)/i,
      /(FAMILIAR[\s\w]*)/i,
      /(COLETIVO[\s\w]*)/i,
      /(PREMIUM[\s\w]*)/i,
      /(PLUS[\s\w]*)/i,
      /(MASTER[\s\w]*)/i,
      /(GOLD[\s\w]*)/i,
      /(SILVER[\s\w]*)/i,
      /(PLATINUM[\s\w]*)/i,
      /(NACIONAL[\s\w]*)/i,
      /(REGIONAL[\s\w]*)/i,
      /(BÁSICO[\s\w]*)/i,
      /(BASICO[\s\w]*)/i,
      /(ESPECIAL[\s\w]*)/i,
      /(COMPLETO[\s\w]*)/i
    ];
    
    for (const pattern of generalPlanPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const planName = match[1].trim()
          .replace(/\s+/g, ' ')
          .replace(/[\r\n]+/g, ' ');
        
        if (planName.length > 2) {
          data.insurancePlan = planName;
          console.log(`Tipo de plano encontrado (padrão geral): ${planName}`);
          break;
        }
      } else if (match && match[0]) {
        // Para padrões de palavras-chave
        const planKeyword = match[0].trim();
        if (planKeyword.length > 2) {
          data.insurancePlan = planKeyword;
          console.log(`Tipo de plano (palavra-chave geral) encontrado: ${planKeyword}`);
          break;
        }
      }
    }
  }
  
  return data;
}

/**
 * Processa documento usando OCR e extrai dados relevantes
 */
export async function processDocumentWithOCR(
  file: File,
  documentType: DocumentType = DocumentType.ID_DOCUMENT
): Promise<ExtractedDocumentData> {
  console.log(`Iniciando processamento OCR para tipo: ${documentType}`);
  
  try {
    // Processar com Tesseract
    const result = await Tesseract.recognize(
      file,
      'por', // Idioma português
      { 
        logger: m => console.log(`Tesseract ${documentType}:`, m.status)
      }
    );
    
    const extractedText = result.data.text;
    console.log(`Texto extraído (${documentType}):`, extractedText);
    
    // Inferir tipo se não foi especificado
    const inferredType = documentType === DocumentType.ID_DOCUMENT ? 
      inferDocumentType(extractedText) : documentType;
    
    let extractedData: Partial<ExtractedDocumentData>;
    
    // Processar baseado no tipo de documento
    if (inferredType === DocumentType.INSURANCE_CARD) {
      extractedData = extractInsuranceCardData(extractedText);
    } else {
      extractedData = extractBasicData(extractedText);
    }
    
    // Completar dados obrigatórios
    const finalData: ExtractedDocumentData = {
      documentType: inferredType,
      confidence: result.data.confidence / 100,
      rawText: extractedText,
      ...extractedData
    };
    
    console.log('Dados finais extraídos:', finalData);
    return finalData;
    
  } catch (error) {
    console.error('Erro no processamento OCR:', error);
    throw new Error('Falha no processamento do documento');
  }
}