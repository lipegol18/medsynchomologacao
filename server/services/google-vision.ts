import vision from '@google-cloud/vision';
import fs from 'fs';

// Função para extrair número da carteirinha específico por operadora
function extractCardNumber(text: string, operadora?: string): string | undefined {
  console.log('🔍 Iniciando extração de número da carteirinha para operadora:', operadora);
  console.log('📄 Texto para análise:', text.substring(0, 200) + '...');
  
  // Normalizar texto e operadora
  const normalizedText = text.replace(/\s+/g, ' ').toUpperCase();
  const normalizedOperadora = operadora?.toUpperCase() || '';
  
  // Encontrar todos os números no texto de forma mais específica
  const allNumberMatches = [];
  
  // 1. Números com espaços (formato carteirinha): "11581786 7" e "0 994 910825083001 5"
  const numbersWithSpaces = text.match(/\d{8,12}\s+\d{1,4}/g) || [];
  allNumberMatches.push(...numbersWithSpaces.map(num => num.replace(/\s/g, '')));
  
  // 1.1. Padrão específico Unimed: "0 994 910825083001 5" (1+3+12+1 dígitos)
  const unimedPatterns = text.match(/\d\s+\d{3}\s+\d{12}\s+\d/g) || [];
  allNumberMatches.push(...unimedPatterns.map(num => num.replace(/\s/g, '')));
  
  // 1.2. Padrão específico Porto Seguro: "4869 7908 0000 0247" (4+4+4+4 dígitos)
  const portoPatterns = text.match(/\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/g) || [];
  allNumberMatches.push(...portoPatterns.map(num => num.replace(/\s/g, '')));
  
  // 2. Números longos contínuos (15+ dígitos)
  const longNumbers = text.match(/\d{15,}/g) || [];
  allNumberMatches.push(...longNumbers);
  
  // 3. Números médios contínuos (9-14 dígitos) - mas não datas
  const mediumNumbers = text.match(/\d{9,14}/g) || [];
  allNumberMatches.push(...mediumNumbers.filter(num => {
    // Excluir se parece ser parte de uma data (4 dígitos no início)
    return !text.includes(`${num.slice(0, 4)}/`) && !text.includes(`${num.slice(-4)}/`);
  }));
  
  // 4. Números formatados com hífens
  const formattedNumbers = text.match(/\d{3,4}[\-]\d{3,4}[\-]\d{4,6}/g) || [];
  allNumberMatches.push(...formattedNumbers.map(num => num.replace(/[\-]/g, '')));
  
  // Limpar e filtrar
  const allNumbers = allNumberMatches
    .filter(num => num.length >= 9) // Mínimo 9 dígitos
    .filter((num, index, array) => array.indexOf(num) === index); // Remover duplicatas
  
  console.log('🔢 Todos os números encontrados:', allNumbers);
  
  // Identificar CNS (15 dígitos que seguem o padrão brasileiro)
  const cnsNumbers = allNumbers.filter(num => num.length === 15 && isValidCNS(num));
  console.log('🏥 Números CNS identificados:', cnsNumbers);
  
  // Detectar operadora se não foi informada
  let detectedOperadora = normalizedOperadora;
  if (!detectedOperadora) {
    if (normalizedText.includes('SULAMERICA') || normalizedText.includes('SUL AMERICA')) {
      detectedOperadora = 'SUL AMERICA';
      console.log('🏥 Operadora detectada por texto: SUL AMERICA');
    } else if (normalizedText.includes('BRADESCO')) {
      detectedOperadora = 'BRADESCO';
      console.log('🏥 Operadora detectada por texto: BRADESCO');
    } else if (normalizedText.includes('AMIL') || normalizedText.includes('MEDICUS')) {
      detectedOperadora = 'AMIL';
      console.log('🏥 Operadora detectada por texto: AMIL (via AMIL ou MEDICUS)');
    } else if (normalizedText.includes('UNIMED')) {
      detectedOperadora = 'UNIMED';
      console.log('🏥 Operadora detectada por texto: UNIMED');
    } else if (normalizedText.includes('PORTO')) {
      detectedOperadora = 'PORTO';
      console.log('🏥 Operadora detectada por texto: PORTO');
    }
  }
  
  // Estratégias específicas por operadora
  if (detectedOperadora.includes('BRADESCO')) {
    return extractBradescoCardNumber(normalizedText, allNumbers, cnsNumbers);
  }
  
  if (detectedOperadora.includes('SUL AMERICA')) {
    return extractSulAmericaCardNumber(normalizedText, allNumbers, cnsNumbers);
  }
  
  if (detectedOperadora.includes('AMIL')) {
    return extractAmilCardNumber(normalizedText, allNumbers, cnsNumbers);
  }
  
  if (detectedOperadora.includes('UNIMED')) {
    return extractUnimedCardNumber(normalizedText, allNumbers, cnsNumbers);
  }
  
  if (detectedOperadora.includes('PORTO')) {
    return extractPortoCardNumber(normalizedText, allNumbers, cnsNumbers);
  }
  
  // Estratégia genérica para operadoras não mapeadas
  return extractGenericCardNumber(normalizedText, allNumbers, cnsNumbers);
}

// Validação básica de CNS (15 dígitos)
function isValidCNS(number: string): boolean {
  return number.length === 15 && !number.startsWith('000') && number !== '111111111111111';
}

// Bradesco: número da carteirinha aparece após o CNS, geralmente formatado com espaços
function extractBradescoCardNumber(text: string, allNumbers: string[], cnsNumbers: string[]): string | undefined {
  console.log('🏦 Estratégia Bradesco: buscar número da carteirinha após CNS');
  
  // Primeiro: tentar encontrar padrão específico após "CNS" ou "CARTÃO NACIONAL"
  const cardPatterns = [
    /CARTÃO NACIONAL DE SAÚDE[:\s]*\d{15}[\s\n]+(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/i,
    /CARTAO NACIONAL DE SAUDE[:\s]*\d{15}[\s\n]+(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/i,
    /CNS[:\s]*\d{15}[\s\n]+(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/i,
    /\d{15}[\s\n]+(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/,  // Padrão após qualquer 15 dígitos
    /(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/  // Padrão direto XXX XXX XXXXXX XXX
  ];
  
  for (const pattern of cardPatterns) {
    console.log('🔍 Testando padrão Bradesco:', pattern.source);
    const match = text.match(pattern);
    if (match && match[1]) {
      const cardNumber = match[1].replace(/\s/g, '');
      console.log('📋 Número capturado:', cardNumber, 'Tamanho:', cardNumber.length);
      if (cardNumber.length >= 12 && !cnsNumbers.includes(cardNumber)) {
        console.log('✅ Bradesco - Número da carteirinha encontrado (padrão):', cardNumber);
        return cardNumber;
      }
    } else {
      console.log('❌ Nenhum match para este padrão');
    }
  }
  
  // Tentar capturar números formatados no final do texto (estratégia alternativa)
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const numberMatch = line.match(/(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/);
    if (numberMatch) {
      const cardNumber = numberMatch[1].replace(/\s/g, '');
      if (cardNumber.length >= 12 && !cnsNumbers.includes(cardNumber)) {
        console.log('✅ Bradesco - Número da carteirinha encontrado (linha final):', cardNumber);
        return cardNumber;
      }
    }
  }
  
  // Fallback: buscar números de 15+ dígitos que não sejam CNS
  const candidateNumbers = allNumbers
    .filter(num => num.length >= 15 && !cnsNumbers.includes(num))
    .filter(num => !cnsNumbers.some(cns => num.includes(cns))); // Excluir números que contêm CNS
  
  console.log('🔍 Candidatos Bradesco (fallback):', candidateNumbers);
  
  if (candidateNumbers.length > 0) {
    const cardNumber = candidateNumbers[candidateNumbers.length - 1];
    console.log('✅ Bradesco - Número da carteirinha encontrado (fallback):', cardNumber);
    return cardNumber;
  }
  
  console.log('❌ Bradesco - Número da carteirinha não encontrado');
  return undefined;
}

// Sul América: 17 dígitos começando com 888
function extractSulAmericaCardNumber(text: string, allNumbers: string[], cnsNumbers: string[]): string | undefined {
  console.log('🏥 Estratégia Sul América: buscar 17 dígitos começando com 888');
  
  // Primeiro: tentar encontrar número que começa com 888 ou 8888
  const numbers888 = allNumbers.filter(num => 
    num.length === 17 && (num.startsWith('888') || num.startsWith('8888'))
  );
  
  if (numbers888.length > 0) {
    console.log('✅ Sul América - Número da carteirinha (888) encontrado:', numbers888[0]);
    return numbers888[0];
  }
  
  // Fallback: qualquer 17 dígitos que não seja CNS
  const candidateNumbers = allNumbers.filter(num => 
    num.length === 17 && !cnsNumbers.includes(num)
  );
  
  if (candidateNumbers.length > 0) {
    console.log('✅ Sul América - Número da carteirinha (17 dígitos) encontrado:', candidateNumbers[0]);
    return candidateNumbers[0];
  }
  
  console.log('❌ Sul América - Número da carteirinha não encontrado');
  return undefined;
}

// Amil: 9 dígitos, pode estar rotulado como "beneficiário" ou "número do beneficiário"
function extractAmilCardNumber(text: string, allNumbers: string[], cnsNumbers: string[]): string | undefined {
  console.log('🏥 Estratégia Amil: buscar número do beneficiário');
  
  // Padrões específicos para Amil
  const amilPatterns = [
    /N[úu]mero do Benefici[aá]rio[:\s\n]*(\d{8,12})/i,
    /Benefici[aá]rio[:\s\n]*(\d{8,12})/i,
    // Padrão específico para "11581786 7" após Nascimento
    /(?:Nascimento[\s\n]+\d{2}\/\d{2}\/\d{4}[\s\n]+)(\d{8})\s*(\d)/i,
    /(\d{8})\s+(\d)(?=\s*[\n\r])/,  // 8 dígitos + espaço + 1 dígito antes de quebra
  ];
  
  for (const pattern of amilPatterns) {
    console.log('🔍 Testando padrão Amil:', pattern.source);
    const match = text.match(pattern);
    if (match) {
      let cardNumber = '';
      if (match[2]) {
        // Caso com dois grupos (ex: 11581786 7)
        cardNumber = match[1] + match[2];
        console.log('📋 Amil - Capturado em dois grupos:', match[1], '+', match[2], '=', cardNumber);
      } else {
        cardNumber = match[1];
        console.log('📋 Amil - Capturado em um grupo:', cardNumber);
      }
      
      // Verificar se não é data de nascimento
      const birthDatePattern = /\d{2}\/\d{2}\/\d{4}/;
      const isNotBirthDate = !birthDatePattern.test(cardNumber);
      
      if (cardNumber.length >= 8 && !cnsNumbers.includes(cardNumber) && isNotBirthDate) {
        console.log('✅ Amil - Número do beneficiário encontrado:', cardNumber);
        return cardNumber;
      }
    } else {
      console.log('❌ Nenhum match para padrão Amil');
    }
  }
  
  // Fallback: buscar números de 8-12 dígitos que não sejam CNS
  const candidateNumbers = allNumbers.filter(num => 
    num.length >= 8 && num.length <= 12 && !cnsNumbers.includes(num)
  );
  
  if (candidateNumbers.length > 0) {
    console.log('✅ Amil - Número da carteirinha (fallback) encontrado:', candidateNumbers[0]);
    return candidateNumbers[0];
  }
  
  console.log('❌ Amil - Número da carteirinha não encontrado');
  return undefined;
}

// Unimed: 17 dígitos após nome do plano, geralmente começa com 0
function extractUnimedCardNumber(text: string, allNumbers: string[], cnsNumbers: string[]): string | undefined {
  console.log('🏥 Estratégia Unimed: buscar número da carteirinha');
  
  // Primeiro: tentar encontrar padrão específico "0 994 910825083001 5"
  const unimedSpacedPattern = /(\d)\s+(\d{3})\s+(\d{12})\s+(\d)/;
  const spacedMatch = text.match(unimedSpacedPattern);
  if (spacedMatch) {
    const cardNumber = spacedMatch[1] + spacedMatch[2] + spacedMatch[3] + spacedMatch[4];
    console.log('📋 Unimed - Capturado padrão espaçado:', spacedMatch[1], spacedMatch[2], spacedMatch[3], spacedMatch[4], '=', cardNumber);
    if (cardNumber.length === 17 && !cnsNumbers.includes(cardNumber)) {
      console.log('✅ Unimed - Número da carteirinha encontrado (padrão espaçado):', cardNumber);
      return cardNumber;
    }
  }
  
  // Padrões específicos para Unimed - formatos contínuos
  const unimedPatterns = [
    /COMPACTO[:\s]*(\d{17})/i,
    /PLANO[:\s]*[A-Z\s]*[\s\n]+(\d{17})/i
  ];
  
  for (const pattern of unimedPatterns) {
    console.log('🔍 Testando padrão Unimed:', pattern.source);
    const match = text.match(pattern);
    if (match && match[1] && !cnsNumbers.includes(match[1])) {
      console.log('✅ Unimed - Número da carteirinha encontrado (padrão):', match[1]);
      return match[1];
    }
  }
  
  // Primeiro: tentar encontrar 17 dígitos que começam com 0
  const numbers0 = allNumbers.filter(num => 
    num.length === 17 && num.startsWith('0') && !cnsNumbers.includes(num)
  );
  
  if (numbers0.length > 0) {
    console.log('✅ Unimed - Número da carteirinha (inicia com 0) encontrado:', numbers0[0]);
    return numbers0[0];
  }
  
  // Fallback: qualquer 17 dígitos que não seja CNS
  const candidateNumbers = allNumbers.filter(num => 
    num.length === 17 && !cnsNumbers.includes(num)
  );
  
  if (candidateNumbers.length > 0) {
    console.log('✅ Unimed - Número da carteirinha (17 dígitos) encontrado:', candidateNumbers[0]);
    return candidateNumbers[0];
  }
  
  console.log('❌ Unimed - Número da carteirinha não encontrado');
  return undefined;
}

// Porto Seguro: 16 dígitos após nome da operadora e paciente
function extractPortoCardNumber(text: string, allNumbers: string[], cnsNumbers: string[]): string | undefined {
  console.log('🏥 Estratégia Porto Seguro: buscar 16 dígitos');
  
  // Primeiro: tentar encontrar padrão específico "4869 7908 0000 0247"
  const portoSpacedPattern = /(\d{4})\s+(\d{4})\s+(\d{4})\s+(\d{4})/;
  const spacedMatch = text.match(portoSpacedPattern);
  if (spacedMatch) {
    const cardNumber = spacedMatch[1] + spacedMatch[2] + spacedMatch[3] + spacedMatch[4];
    console.log('📋 Porto Seguro - Capturado padrão espaçado:', spacedMatch[1], spacedMatch[2], spacedMatch[3], spacedMatch[4], '=', cardNumber);
    if (cardNumber.length === 16 && !cnsNumbers.includes(cardNumber)) {
      console.log('✅ Porto Seguro - Número da carteirinha encontrado (padrão espaçado):', cardNumber);
      return cardNumber;
    }
  }
  
  // Buscar números de 16 dígitos contínuos
  const numbers16digits = allNumbers.filter(num => num.length === 16 && !cnsNumbers.includes(num));
  
  if (numbers16digits.length > 0) {
    console.log('✅ Porto Seguro - Número da carteirinha (16 dígitos) encontrado:', numbers16digits[0]);
    return numbers16digits[0];
  }
  
  console.log('❌ Porto Seguro - Número da carteirinha não encontrado');
  return undefined;
}

// Estratégia genérica: maior número que não seja CNS
function extractGenericCardNumber(text: string, allNumbers: string[], cnsNumbers: string[]): string | undefined {
  console.log('🔧 Estratégia genérica: buscar maior número que não seja CNS');
  
  // Filtrar números que não são CNS
  const nonCnsNumbers = allNumbers.filter(num => !cnsNumbers.includes(num));
  
  if (nonCnsNumbers.length > 0) {
    // Ordenar por comprimento (maior primeiro) e retornar o maior
    const cardNumber = nonCnsNumbers.sort((a, b) => b.length - a.length)[0];
    console.log('✅ Genérico - Número da carteirinha encontrado:', cardNumber);
    return cardNumber;
  }
  
  console.log('❌ Genérico - Número da carteirinha não encontrado');
  return undefined;
}

// Função para configurar as credenciais do Google Vision
function createVisionClient() {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentials) {
    throw new Error('Credenciais do Google Cloud não encontradas');
  }

  // Se as credenciais são JSON, criar arquivo temporário
  if (credentials.startsWith('{')) {
    const tempPath = '/tmp/google-credentials.json';
    fs.writeFileSync(tempPath, credentials);
    
    return new vision.ImageAnnotatorClient({
      keyFilename: tempPath
    });
  }
  
  // Se é um caminho de arquivo, usar diretamente
  return new vision.ImageAnnotatorClient({
    keyFilename: credentials
  });
}

export interface ExtractedDocumentData {
  fullName?: string;
  idNumber?: string;
  birthDate?: string;
  gender?: string;
  // Para carteirinhas
  operadora?: string;
  ansCode?: string; // Código ANS da operadora (6 dígitos)
  numeroCarteirinha?: string;
  nomeTitular?: string;
  plano?: string;
  cpf?: string;
  cns?: string; // Cartão Nacional de Saúde (15 dígitos)
  rg?: string;
  dataNascimento?: string;
  sexo?: string;
  naturalidade?: string;
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  try {
    console.log('Iniciando extração de texto com Google Vision API...');
    
    // Criar cliente com credenciais corretas
    const client = createVisionClient();
    
    // Fazer a requisição para o Google Vision API
    const [result] = await client.textDetection({
      image: {
        content: imageBuffer
      }
    });

    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      console.log('Nenhum texto detectado na imagem');
      return '';
    }

    // O primeiro elemento contém todo o texto detectado
    const extractedText = detections[0]?.description || '';
    console.log('Texto extraído com sucesso:', extractedText.substring(0, 200) + '...');
    
    return extractedText;
  } catch (error) {
    console.error('Erro ao extrair texto com Google Vision API:', error);
    throw new Error('Erro ao processar imagem com Google Vision API');
  }
}

export function processIdentityDocument(extractedText: string): ExtractedDocumentData {
  console.log('Processando documento de identidade...');
  
  const data: ExtractedDocumentData = {};
  
  // Extrair nome - buscar especificamente pela estrutura da CNH
  console.log('Texto completo para análise:', extractedText);
  
  // Primeiro, tentar encontrar o nome após o campo NOME na CNH
  const nomeRegex = /NOME[\s\n]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+?)(?:\n|DOC\.|IDENTIDADE|FILIAÇÃO|NATURALIDADE|DATA)/i;
  const nomeMatch = extractedText.match(nomeRegex);
  
  if (nomeMatch && nomeMatch[1]) {
    const cleanName = nomeMatch[1].trim();
    // Verificar se não é uma palavra-chave de documento
    if (cleanName.length > 3 && !cleanName.match(/^(FILIAÇÃO|NATURALIDADE|DATA|REGISTRO|GERAL|CPF)$/i)) {
      data.fullName = cleanName;
      console.log('Nome encontrado via regex NOME:', data.fullName);
    }
  }
  
  // Se não encontrou, tentar buscar por padrão de nome completo (3+ palavras com letras maiúsculas)
  if (!data.fullName) {
    const namePattern = /^([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+.*?)$/gm;
    const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      if (namePattern.test(line)) {
        // Verificar se não é texto governamental
        const excludeWords = [
          'REPUBLICA', 'FEDERATIVA', 'BRASIL', 'GOVERNO', 'DETRAN', 'ESTADO',
          'MINISTERIO', 'TRANSPORTES', 'SENATRAN', 'NACIONAL', 'TERRITORIO', 
          'VALIDA', 'HABILITACAO', 'CARTEIRA', 'TODO', 'SECRETARIA', 'TRANSITO',
          'INFRAESTRUTURA', 'DEPARTAMENTO', 'CNN', 'EMISSOR'
        ];
        
        if (!excludeWords.some(word => line.includes(word)) && line.length > 10) {
          data.fullName = line;
          console.log('Nome encontrado via padrão:', data.fullName);
          break;
        }
      }
    }
  }
  
  // Se ainda não encontrou, buscar linha por linha depois de "NOME"
  if (!data.fullName) {
    const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let foundNome = false;
    
    for (const line of lines) {
      if (line === 'NOME') {
        foundNome = true;
        continue;
      }
      
      if (foundNome && line.length > 5 && /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+$/i.test(line)) {
        // Verificar se não é uma palavra-chave de documento
        if (!line.includes('DOC') && 
            !line.includes('IDENTIDADE') && 
            !line.match(/^(FILIAÇÃO|NATURALIDADE|DATA|REGISTRO|GERAL|CPF)$/i)) {
          data.fullName = line;
          console.log('Nome encontrado após linha NOME:', data.fullName);
          break;
        }
      }
    }
  }
  
  // Extrair CPF
  const cpfMatch = extractedText.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
  if (cpfMatch) {
    data.idNumber = cpfMatch[1];
    console.log('CPF encontrado:', data.idNumber);
  }
  
  // Extrair RG
  const rgMatches = [
    /RG[:\s]*(\d+[\.\-]?\d*)/i,
    /REGISTRO[:\s]+(\d+[\.\-]?\d*)/i,
    /IDENTIDADE[:\s]+(\d+[\.\-]?\d*)/i
  ];
  
  for (const pattern of rgMatches) {
    const match = extractedText.match(pattern);
    if (match && match[1]) {
      data.rg = match[1];
      console.log('RG encontrado:', data.rg);
      break;
    }
  }
  
  // Extrair data de nascimento
  const datePatterns = [
    /NASCIMENTO[:\s\/Birth\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /NASC[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /Date of Birth[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/
  ];
  
  for (const pattern of datePatterns) {
    const match = extractedText.match(pattern);
    if (match && match[1]) {
      // Converter data para formato YYYY-MM-DD
      const [day, month, year] = match[1].split('/');
      data.birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log('Data de nascimento encontrada:', data.birthDate);
      break;
    }
  }
  
  // Extrair gênero/sexo
  const genderPatterns = [
    /SEXO[:\s\/Sex\s]*(M|F|MASCULINO|FEMININO)/i,
    /\b(MASCULINO|FEMININO)\b/i,
    /SEXO[:\s]*([MF])\b/i,
    /Sex[:\s]*([MF])\b/i
  ];
  
  for (const pattern of genderPatterns) {
    const match = extractedText.match(pattern);
    if (match && match[1]) {
      const genderValue = match[1].toUpperCase();
      if (genderValue === 'M' || genderValue === 'MASCULINO') {
        data.gender = 'M';
      } else if (genderValue === 'F' || genderValue === 'FEMININO') {
        data.gender = 'F';
      }
      console.log('Gênero encontrado:', data.gender);
      break;
    }
  }
  
  return data;
}

export function processInsuranceCard(extractedText: string): ExtractedDocumentData {
  console.log('Processando carteirinha de plano de saúde...');
  
  const data: ExtractedDocumentData = {};
  
  // 1. PRIORIDADE: Buscar código ANS (EXATAMENTE 6 dígitos únicos)
  const ansPatterns = [
    // Padrão ANS - n° 00.070-1 (formato com pontos e hífen)
    /ANS\s*-\s*n[ºª°]?\s*(\d{2})\.(\d{3})-(\d{1})/i,
    // Padrão ANS-n° 000701 (6 dígitos diretos)
    /ANS\s*-\s*n[ºª°]?\s*(\d{6})(?!\d)/i,
    // Padrão ANS: 000701 (dois pontos)
    /ANS\s*:\s*(\d{6})(?!\d)/i,
    // Padrão ANS 000701 (espaço simples)
    /(?:^|\s)ANS\s+(\d{6})(?!\d)/i,
    // Padrão n° ANS: 000701
    /n[ºª°]?\s*ANS\s*:\s*(\d{6})(?!\d)/i,
    // Padrão NUMERO ANS ou NÚMERO ANS
    /(?:NUMERO|NÚMERO)\s*ANS\s*[:\s]*(\d{6})(?!\d)/i,
    // Padrão REGISTRO ANS
    /REGISTRO\s*ANS\s*[:\s]*(\d{6})(?!\d)/i,
    // Padrão CODIGO ANS ou CÓDIGO ANS
    /(?:CODIGO|CÓDIGO)\s*ANS\s*[:\s]*(\d{6})(?!\d)/i
  ];
  
  for (const pattern of ansPatterns) {
    const match = extractedText.match(pattern);
    if (match) {
      if (match[1] && match[2] && match[3]) {
        // Formato XX.XXX-X - concatenar os grupos (deve resultar em 6 dígitos)
        const fullCode = match[1] + match[2] + match[3];
        if (fullCode.length === 6) {
          data.ansCode = fullCode;
          console.log('Código ANS encontrado (formato XX.XXX-X):', data.ansCode);
          break;
        }
      } else if (match[1] && match[1].length === 6) {
        // Formato direto de exatamente 6 dígitos
        data.ansCode = match[1];
        console.log('Código ANS encontrado (6 dígitos):', data.ansCode);
        break;
      }
    }
  }
  
  // 2. FALLBACK: Lista de operadoras conhecidas por nome (só se não achou ANS)
  if (!data.ansCode) {
    const operadoras = [
      { name: "Bradesco Saúde", keys: ["BRADESCO", "BRADESCO SAUDE"] },
      { name: "Unimed", keys: ["UNIMED"] },
      { name: "Amil", keys: ["AMIL"] },
      { name: "SulAmérica", keys: ["SULAMERICA", "SULAMÉRICA"] },
      { name: "Hapvida", keys: ["HAPVIDA"] },
      { name: "NotreDame Intermédica", keys: ["NOTREDAME", "INTERMEDICA"] },
      { name: "Golden Cross", keys: ["GOLDEN CROSS"] },
      { name: "Porto Saúde", keys: ["PORTO SAUDE", "PORTO SAÚDE", "PORTO SEGURO SAUDE", "PORTO SEGURO SAÚDE"] }
    ];
    
    // Buscar operadora por nome
    for (const operadora of operadoras) {
      if (operadora.keys.some(key => extractedText.toUpperCase().includes(key))) {
        data.operadora = operadora.name;
        console.log('Operadora encontrada por nome:', data.operadora);
        break;
      }
    }
  }
  
  // Extrair nome do titular - buscar padrões específicos
  const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Padrões específicos para Amil (carteirinha tem estrutura diferente)
  const nameIndicators = [
    /Nome[\s\n]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+?)(?:\n|Número)/i,  // Nome seguido de linha
    /(?:NOME\s*DO\s*BENEFICI[AÁ]RIO|BENEFICI[AÁ]RIO|TITULAR)[:\s]*([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]{3,})/i,
    /(?:NOME|PACIENTE)[:\s]*([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]{3,})/i
  ];
  
  for (const pattern of nameIndicators) {
    const match = extractedText.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      // Limpar quebras de linha e espaços extras
      name = name.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      
      // Verificar se não é um texto genérico
      const genericTerms = ['NUMERO', 'REDE', 'ATENDIMENTO', 'NASCIMENTO', 'BENEFICIARIO'];
      const isGeneric = genericTerms.some(term => name.toUpperCase().includes(term));
      
      if (name.length > 6 && !isGeneric) {
        data.nomeTitular = name;
        console.log('Nome do titular encontrado (padrão):', data.nomeTitular);
        break;
      }
    }
  }
  
  // Se não encontrou por padrão, buscar linha que parece ser um nome completo
  if (!data.nomeTitular) {
    for (const line of lines) {
      // Buscar linha que parece ser um nome completo (pelo menos 2 palavras)
      if (line.length > 5 && /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+$/i.test(line)) {
        const words = line.split(/\s+/).filter(w => w.length > 1);
        
        // Deve ter pelo menos 2 palavras para ser um nome completo
        if (words.length >= 2) {
          // Ignorar linhas com palavras da operadora ou outros textos padrão
          const ignoreWords = [
            'BRADESCO', 'UNIMED', 'AMIL', 'HAPVIDA', 'PLANO', 'SAUDE', 'CARTEIRINHA', 
            'SEGUROS', 'COOPERATIVA', 'ASSISTENCIA', 'MEDICAMENTO', 'CONSULTA',
            'APARTAMENTO', 'ENFERMARIA', 'AMBULATORIAL', 'HOSPITALAR', 'PRODUTO',
            'NACIONAL', 'REGIONAL', 'ESTADUAL', 'DOCUMENTO', 'IDENTIDADE'
          ];
          
          if (!ignoreWords.some(word => line.toUpperCase().includes(word))) {
            data.nomeTitular = line;
            console.log('Nome do titular encontrado:', data.nomeTitular);
            break;
          }
        }
      }
    }
  }
  
  // Mover a extração da carteirinha para o final (será feita após detectar a operadora)
  
  // Extrair CNS (15 dígitos) primeiro
  const cnsMatch = extractedText.match(/(?:CNS[:\s]*)?(\d{15})/);
  if (cnsMatch && isValidCNS(cnsMatch[1])) {
    data.cns = cnsMatch[1];
    console.log('CNS encontrado:', data.cns);
  }
  
  // Extrair CPF (apenas se formatado corretamente com pontos e hífen, ou rotulado como CPF)
  const cpfPatterns = [
    /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i,  // CPF: 123.456.789-00
    /(\d{3}\.\d{3}\.\d{3}-\d{2})/,               // 123.456.789-00 (formatado)
  ];
  
  for (const pattern of cpfPatterns) {
    const cpfMatch = extractedText.match(pattern);
    if (cpfMatch && cpfMatch[1]) {
      const cleanCpf = cpfMatch[1].replace(/\D/g, '');
      // Verificar se é exatamente 11 dígitos e não é parte do CNS
      if (cleanCpf.length === 11 && (!data.cns || !data.cns.includes(cleanCpf))) {
        data.cpf = cpfMatch[1];
        console.log('CPF encontrado:', data.cpf);
        break;
      }
    }
  }
  
  // Extrair data de nascimento
  const dateMatch = extractedText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    data.dataNascimento = dateMatch[1];
    console.log('Data de nascimento encontrada:', data.dataNascimento);
  }
  
  // Extrair tipo de plano com padrões avançados
  console.log('🔍 Iniciando busca por tipo de plano no texto:', extractedText.substring(0, 200));
  console.log('🔍 Texto completo para debug:', JSON.stringify(extractedText));
  const planPatterns = [
    // Padrões específicos para Porto Saúde (PRIORIDADE MÁXIMA)
    /(PRATA\s+MAIS\s+RC)/i,
    /(OURO\s+MAIS\s+RC)/i,
    /(BRONZE\s+MAIS\s+RC)/i,
    /(DIAMANTE\s+MAIS\s+RC)/i,
    // Padrão genérico Porto Saúde
    /([A-Z]+\s+MAIS\s+RC)/i,
    
    // Padrão SUPER SIMPLES - apenas SAUDE TOP ou SAÚDE TOP (sua sugestão implementada)
    /(SAUDE\s+TOP)/i,
    /(SAÚDE\s+TOP)/i,
    // Padrão ainda mais flexível - qualquer "SAUDE" seguido eventualmente de "TOP"
    /(SAUDE[\s\S]*?TOP)/i,
    /(SAÚDE[\s\S]*?TOP)/i,
    
    // Padrões específicos para BRADESCO SAÚDE TOP (PRIORIDADE MÁXIMA - considera quebras de linha)
    /(BRADESCO[\s\n]+SAÚ?DE[\s\n]+TOP)/i,
    /(SAÚ?DE[\s\n]+TOP)/i,
    // Padrão específico para "EMPRESARIAL SAUDE TOP" que aparece na carteirinha
    /EMPRESARIAL[\s\n]+(SAÚ?DE[\s\n]+TOP)/i,
    // Padrão mais amplo para detectar SAUDE TOP em qualquer contexto (com quebras de linha)
    /(SAÚ?DE[\s\n]+TOP)(?:[\s\n]+\w+)*/i,
    
    // Padrões específicos da Unimed (incluindo COMPACTO)
    /(?:CORPORATIVO\s+)?(COMPACTO)(?:\s+ENF)?(?:\s+CP)?/i,
    /(?:UNIMED\s+)?(PRÁTICO|VERSÁTIL|DINÂMICO|LÍDER|SÊNIOR|BÁSICO|ESSENCIAL|AFINIDADE|ADESÃO|COMPACTO|EFETIVO|COMPLETO|SUPERIOR|UNICO|CUIDAR\s+MAIS)/i,
    
    // Padrões específicos do Bradesco (genéricos)
    /(?:PLANO|PRODUTO)[:\s]*(?:BRADESCO\s+)?([A-Z\s]*(?:NACIONAL|EXECUTIVO|PLUS|GOLD|PREMIUM|MASTER|TOP)[A-Z\s]*)/i,
    
    // Padrões específicos da Unimed (genéricos)
    /(?:PLANO|PRODUTO)[:\s]*(?:UNIMED\s+)?([A-Z\s]*(?:FEDERAL|NACIONAL|EXECUTIVO|PREMIUM|PLUS|ESPECIAL|MASTER)[A-Z\s]*)/i,
    
    // Padrões específicos da SulAmérica
    /(?:PLANO|PRODUTO)[:\s]*(?:SULAMERICA\s+)?([A-Z\s]*(?:EXACT|TRADICIONAL|PREMIUM|EXECUTIVO|MASTER)[A-Z\s]*)/i,
    
    // Padrões específicos da Amil
    /(?:PLANO|PRODUTO)[:\s]*(?:AMIL\s+)?([A-Z\s]*(?:FÁCIL|EASY|PREMIUM|EXECUTIVO|GOLD)[A-Z\s]*)/i,
    
    // Padrões específicos para MEDICUS (AMIL)
    /(MEDICUS)\s+(NACIONAL|PLUS|EXECUTIVO|PREMIUM|\d+)/i,
    /PLANO[:\s]+(MEDICUS)\s*(\d+)?/i,
    
    // Padrões específicos da Hapvida
    /(?:PLANO|PRODUTO)[:\s]*(?:HAPVIDA\s+)?([A-Z\s]*(?:MAIS|PREMIUM|EXECUTIVO|MASTER)[A-Z\s]*)/i,
    
    // Padrões específicos da NotreDame
    /(?:PLANO|PRODUTO)[:\s]*(?:NOTREDAME\s+)?([A-Z\s]*(?:PREMIUM|EXECUTIVO|MASTER|PLUS)[A-Z\s]*)/i,
    
    // Padrões específicos da Golden Cross
    /(?:PLANO|PRODUTO)[:\s]*(?:GOLDEN\s+CROSS\s+)?([A-Z\s]*(?:PREMIUM|EXECUTIVO|MASTER|GOLD)[A-Z\s]*)/i,
    
    // Padrões específicos da Omint
    /(?:PLANO|PRODUTO)[:\s]*(?:OMINT\s+)?([A-Z\s]*(?:PREMIUM|EXECUTIVO|MASTER|GOLD)[A-Z\s]*)/i,
    
    // Padrões genéricos para tipos comuns
    /(?:PLANO|PRODUTO)[:\s]*([A-Z\s]*(?:BÁSICO|PREMIUM|EXECUTIVO|CLASSIC|GOLD|SILVER|MASTER|PLUS|ESPECIAL|NACIONAL|FEDERAL)[A-Z\s]*)/i,
    
    // Padrões com códigos alfanuméricos (ex: S650 GOLD)
    /(?:PLANO|PRODUTO)[:\s]*([A-Z]\d+\s+[A-Z]+)/i,
    
    // Padrão mais específico para planos após "Plano/Serviço ANS"
    /PLANO\/SERVIÇO\s+ANS[:\s]*([A-Z][A-Z\s\-]{3,40})/i,
    
    // Padrão geral para qualquer plano após PLANO: (mais restritivo)
    /PLANO[:\s]*([A-Z]+(?:\s+[A-Z]+)*(?:\s+\w{2,4})?)/i
  ];
  
  for (const pattern of planPatterns) {
    console.log('🔍 Testando padrão:', pattern.source);
    const match = extractedText.match(pattern);
    if (match) {
      console.log('✅ Match encontrado:', match);
      let planName = '';
      
      // Para os novos padrões específicos da Unimed, usar o grupo correto
      if (match[1]) {
        planName = match[1].trim();
        
        // Para padrões MEDICUS, combinar com o segundo grupo se existir
        if (match[2] && pattern.source.includes('MEDICUS')) {
          planName = `${match[1]} ${match[2]}`.trim();
        }
      } else if (match[0]) {
        // Para o padrão COMPACTO específico que captura a palavra inteira
        planName = match[0].replace(/(?:CORPORATIVO\s+)?/i, '').replace(/(?:\s+ENF)?(?:\s+CP)?/i, '').trim();
      }
      
      console.log('📝 Nome do plano extraído:', planName);
      
      if (planName) {
        // Para padrões específicos do Bradesco SAÚDE TOP, manter o nome completo
        if (!pattern.source.includes('SAÚ?DE\\s+TOP')) {
          // Limpar o nome do plano removendo palavras desnecessárias apenas para outros padrões
          planName = planName.replace(/^(BRADESCO|UNIMED|AMIL|SULAMERICA|HAPVIDA|NOTREDAME|GOLDEN\s+CROSS|OMINT)\s+/i, '');
        }
        planName = planName.replace(/\s+/g, ' ').trim();
        
        // Verificar se é um nome de plano válido (não muito curto)
        if (planName.length >= 3) {
          data.plano = planName;
          console.log('✅ Plano encontrado e definido:', data.plano);
          break;
        }
      }
    } else {
      console.log('❌ Nenhum match para o padrão');
    }
  }
  
  // Extrair número da carteirinha após detectar a operadora
  console.log('🔍 Tentando extrair número da carteirinha. Operadora detectada:', data.operadora);
  const cardNumber = extractCardNumber(extractedText, data.operadora);
  if (cardNumber) {
    data.numeroCarteirinha = cardNumber;
    console.log('✅ Número da carteirinha encontrado:', data.numeroCarteirinha);
  } else {
    console.log('❌ Número da carteirinha não encontrado');
  }
  
  return data;
}