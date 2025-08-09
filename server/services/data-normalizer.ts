import { ExtractedDocumentData } from './google-vision';
import { db } from '../db';
import { healthInsuranceProviders } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface NormalizedDocumentData extends ExtractedDocumentData {
  // Campos normalizados
  normalizedCpf?: string;
  normalizedBirthDate?: string;
  normalizedName?: string;
  normalizedOperadora?: string;
  
  // Metadados de confiança
  confidence?: {
    cpf?: number;
    birthDate?: number;
    name?: number;
    operadora?: number;
    overall?: number;
  };
  
  // Informações sobre busca da operadora
  operadoraFoundByAns?: {
    name: string | null;
    ansCodeFound: string | null;
    ansCodeExtracted: string | null;
    method: 'ANS_DATABASE_LOOKUP' | 'ANS_NOT_FOUND' | 'NAME_DATABASE_LOOKUP' | 'NAME_MAPPING_FALLBACK';
  };
  
  // Sugestões se dados não foram encontrados exatamente
  suggestions?: {
    operadoras?: string[];
    planos?: string[];
  };
}

/**
 * Normaliza CPF para formato padrão xxx.xxx.xxx-xx
 */
export function normalizeCpf(cpf: string): { normalized: string; isValid: boolean; confidence: number } {
  if (!cpf) return { normalized: '', isValid: false, confidence: 0 };
  
  // Extrair apenas números
  const digits = cpf.replace(/\D/g, '');
  
  // Verificar se tem 11 dígitos
  if (digits.length !== 11) {
    return { normalized: cpf, isValid: false, confidence: 0.3 };
  }
  
  // Verificar se não é sequência repetida (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(digits)) {
    return { normalized: cpf, isValid: false, confidence: 0.1 };
  }
  
  // Formatar para padrão xxx.xxx.xxx-xx
  const formatted = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  
  // Validar dígitos verificadores
  const isValid = validateCpfDigits(digits);
  const confidence = isValid ? 1.0 : 0.6;
  
  return { normalized: formatted, isValid, confidence };
}

/**
 * Valida dígitos verificadores do CPF
 */
function validateCpfDigits(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  let digit1 = remainder < 2 ? 0 : remainder;
  
  if (digit1 !== parseInt(cpf.charAt(9))) return false;
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  let digit2 = remainder < 2 ? 0 : remainder;
  
  return digit2 === parseInt(cpf.charAt(10));
}

/**
 * Normaliza data para formato ISO (YYYY-MM-DD)
 */
export function normalizeBirthDate(date: string): { normalized: string; isValid: boolean; confidence: number } {
  if (!date) return { normalized: '', isValid: false, confidence: 0 };
  
  // Tentar diferentes formatos
  const patterns = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // dd/mm/yyyy
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // dd-mm-yyyy
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // yyyy-mm-dd (já normalizado)
  ];
  
  for (const pattern of patterns) {
    const match = date.match(pattern);
    if (match) {
      let day: number, month: number, year: number;
      
      if (pattern === patterns[2]) {
        // Formato yyyy-mm-dd
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        // Formatos dd/mm/yyyy ou dd-mm-yyyy
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      
      // Validar data
      const isValidDate = (
        day >= 1 && day <= 31 &&
        month >= 1 && month <= 12 &&
        year >= 1900 && year <= new Date().getFullYear()
      );
      
      if (isValidDate) {
        const normalized = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        return { normalized, isValid: true, confidence: 1.0 };
      }
    }
  }
  
  return { normalized: date, isValid: false, confidence: 0.2 };
}

/**
 * Normaliza nome removendo acentos e padronizando case
 */
export function normalizeName(name: string): { normalized: string; confidence: number } {
  if (!name) return { normalized: '', confidence: 0 };
  
  // Remover caracteres especiais, manter apenas letras e espaços
  let normalized = name
    .replace(/[^\w\sÀ-ÿ]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normalizar espaços
    .trim();
  
  // Converter para title case
  normalized = normalized
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Não capitalizar preposições e artigos
      const lowercase = ['da', 'de', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'por'];
      if (lowercase.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  // Calcular confiança baseada no comprimento e estrutura
  const words = normalized.split(' ').filter(w => w.length > 0);
  let confidence = 0.5;
  
  if (words.length >= 2) confidence += 0.3; // Pelo menos nome e sobrenome
  if (words.length >= 3) confidence += 0.2; // Nome completo
  if (normalized.length >= 5) confidence += 0.1; // Nome não muito curto
  
  confidence = Math.min(confidence, 1.0);
  
  return { normalized, confidence };
}

/**
 * Normaliza código ANS removendo zeros à esquerda
 */
export function normalizeAnsCode(ansCode: string): string {
  // Remove zeros à esquerda, mantendo pelo menos 1 dígito
  return ansCode.replace(/^0+/, '') || '0';
}

/**
 * Busca operadora pelo código ANS no banco de dados
 */
export async function findOperadoraByAns(ansCode: string): Promise<{ id: number; name: string; confidence: number; foundCode: string } | null> {
  try {
    console.log('Buscando operadora pelo código ANS:', ansCode);
    
    // Tentar buscar primeiro com o código original (pode ter zeros à esquerda)
    let result = await db
      .select({
        id: healthInsuranceProviders.id,
        name: healthInsuranceProviders.name,
        ansCode: healthInsuranceProviders.ansCode
      })
      .from(healthInsuranceProviders)
      .where(eq(healthInsuranceProviders.ansCode, ansCode))
      .limit(1);
    
    if (result.length > 0) {
      console.log('Operadora encontrada (código original):', result[0].name, 'ID:', result[0].id, 'ANS:', result[0].ansCode);
      return { id: result[0].id, name: result[0].name, confidence: 1.0, foundCode: result[0].ansCode };
    }
    
    // Se não encontrou, tentar com código normalizado (sem zeros à esquerda)
    const normalizedAnsCode = normalizeAnsCode(ansCode);
    console.log('Tentando busca com código normalizado:', normalizedAnsCode);
    
    result = await db
      .select({
        id: healthInsuranceProviders.id,
        name: healthInsuranceProviders.name,
        ansCode: healthInsuranceProviders.ansCode
      })
      .from(healthInsuranceProviders)
      .where(eq(healthInsuranceProviders.ansCode, normalizedAnsCode))
      .limit(1);
    
    if (result.length > 0) {
      console.log('Operadora encontrada (código normalizado):', result[0].name, 'ID:', result[0].id, 'ANS:', result[0].ansCode);
      return { id: result[0].id, name: result[0].name, confidence: 1.0, foundCode: result[0].ansCode };
    }
    
    console.log('Nenhuma operadora encontrada para códigos:', ansCode, 'ou', normalizedAnsCode);
    return null;
  } catch (error) {
    console.error('Erro ao buscar operadora por código ANS:', error);
    return null;
  }
}

/**
 * Busca operadora por similaridade de nome no banco de dados
 */
export async function findOperadoraByName(operadoraName: string): Promise<{ name: string; confidence: number; foundName: string; similarity: number } | null> {
  try {
    console.log('Buscando operadora por nome:', operadoraName);
    
    const searchTerm = operadoraName.trim().toUpperCase();
    
    // Buscar todas as operadoras para comparação
    const allOperadoras = await db
      .select({
        name: healthInsuranceProviders.name
      })
      .from(healthInsuranceProviders);
    
    console.log(`Comparando "${searchTerm}" com ${allOperadoras.length} operadoras no banco`);
    
    let bestMatch: { name: string; similarity: number } | null = null;
    
    for (const operadora of allOperadoras) {
      const dbName = operadora.name.toUpperCase();
      
      // 1. Verificar correspondência exata
      if (dbName === searchTerm) {
        console.log('Correspondência exata encontrada:', operadora.name);
        return { name: operadora.name, confidence: 1.0, foundName: operadora.name, similarity: 1.0 };
      }
      
      // 2. Verificar se o termo de busca está contido no nome da operadora (prioridade alta)
      if (dbName.includes(searchTerm)) {
        const similarity = searchTerm.length / dbName.length;
        console.log(`Termo "${searchTerm}" encontrado em "${dbName}" - Similaridade: ${similarity}`);
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { name: operadora.name, similarity };
        }
      }
      
      // 3. Verificar correspondências com palavras-chave conhecidas de operadoras (prioridade máxima)
      const knownOperators: Record<string, string[]> = {
        'AMIL': ['AMIL', 'AMIL ASSISTÊNCIA MÉDICA INTERNACIONAL', 'AMIL ASSISTENCIA MEDICA INTERNACIONAL'],
        'UNIMED': ['UNIMED', 'COOPERATIVA MÉDICA'],
        'BRADESCO': ['BRADESCO', 'BRADESCO SAÚDE', 'BRADESCO SAUDE'],
        'SULAMERICA': ['SULAMERICA', 'SUL AMÉRICA', 'SULAMÉRICA', 'SUL AMERICA'],
        'NOTREDAME': ['NOTREDAME', 'NOTRE DAME', 'NOTREDAME INTERMÉDICA', 'INTERMÉDICA'],
        'GOLDEN': ['GOLDEN', 'GOLDEN CROSS'],
        'PREVENT': ['PREVENT', 'PREVENT SENIOR'],
        'CASSI': ['CASSI'],
        'HAPVIDA': ['HAPVIDA'],
        'ASSIM': ['ASSIM'],
        'PORTO': ['PORTO SAÚDE', 'PORTO SAUDE', 'PORTO SEGURO SAÚDE', 'PORTO SEGURO SAUDE']
      };
      
      // Verificar se o termo de busca corresponde a uma operadora conhecida
      for (const [key, variations] of Object.entries(knownOperators)) {
        if (searchTerm === key) {
          // Buscar qualquer nome que contenha a palavra-chave (evitar matches incorretos)
          if (dbName.includes(key) && !dbName.includes('IRMANDADE') && !dbName.includes('MISERICORDIA')) {
            console.log(`✅ Operadora conhecida encontrada por palavra-chave: ${searchTerm} -> ${operadora.name}`);
            return { name: operadora.name, confidence: 0.95, foundName: operadora.name, similarity: 0.95 };
          }
        }
        
        // Verificar se o termo é uma variação conhecida
        if (variations.some(v => v.toUpperCase() === searchTerm)) {
          // Para Porto Saúde, ser mais específico na busca
          if (key === 'PORTO') {
            if (dbName.includes('PORTO SEGURO') && dbName.includes('SAÚDE')) {
              console.log(`✅ Operadora Porto Saúde encontrada: ${searchTerm} -> ${operadora.name}`);
              return { name: operadora.name, confidence: 0.95, foundName: operadora.name, similarity: 0.95 };
            }
          } else {
            if (variations.some(v => dbName.includes(v.toUpperCase())) || dbName.includes(key)) {
              console.log(`✅ Operadora conhecida encontrada por variação: ${searchTerm} -> ${operadora.name}`);
              return { name: operadora.name, confidence: 0.95, foundName: operadora.name, similarity: 0.95 };
            }
          }
        }
      }
      
      // 4. Verificar se o nome da operadora contém o termo de busca (menor prioridade)
      if (searchTerm.includes(dbName) && dbName.length > 3) {
        const similarity = dbName.length / searchTerm.length;
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { name: operadora.name, similarity };
        }
      }
    }
    
    // Aceitar correspondências com similaridade razoável, mas aplicar threshold mais rigoroso
    if (bestMatch && bestMatch.similarity > 0.15) {
      console.log('Melhor correspondência encontrada:', bestMatch.name, 'Similaridade:', bestMatch.similarity);
      
      // Para Porto Saúde, verificar se não é um match incorreto com outras operadoras que contêm "PORTO"
      if (searchTerm.includes('PORTO') && bestMatch.name.includes('IRMANDADE')) {
        console.log('❌ Rejeitando match incorreto: PORTO SAÚDE não deve corresponder a IRMANDADE');
        return null;
      }
      
      // Aplicar penalidade se a similaridade for muito baixa para evitar matches incorretos
      const adjustedConfidence = bestMatch.similarity < 0.5 ? bestMatch.similarity * 0.8 : bestMatch.similarity;
      
      return { 
        name: bestMatch.name, 
        confidence: adjustedConfidence, 
        foundName: bestMatch.name,
        similarity: bestMatch.similarity 
      };
    }
    
    console.log('Nenhuma operadora encontrada por similaridade de nome (threshold: 0.15)');
    return null;
  } catch (error) {
    console.error('Erro ao buscar operadora por nome:', error);
    return null;
  }
}

/**
 * Normaliza nome da operadora usando mapeamentos conhecidos (fallback final)
 */
export function normalizeOperadora(operadora: string): { normalized: string; confidence: number } {
  if (!operadora) return { normalized: '', confidence: 0 };
  
  const mappings: Record<string, string> = {
    // Bradesco variações
    'BRADESCO': 'Bradesco Saúde',
    'BRADESCO SAUDE': 'Bradesco Saúde',
    'BRADESCO SAÚDE': 'Bradesco Saúde',
    
    // Unimed variações
    'UNIMED': 'Unimed',
    
    // Amil variações
    'AMIL': 'Amil',
    
    // SulAmérica variações
    'SULAMERICA': 'SulAmérica',
    'SULAMÉRICA': 'SulAmérica',
    'SUL AMERICA': 'SulAmérica',
    'SUL AMÉRICA': 'SulAmérica',
    
    // Hapvida variações
    'HAPVIDA': 'Hapvida',
    
    // NotreDame variações
    'NOTREDAME': 'NotreDame Intermédica',
    'NOTRE DAME': 'NotreDame Intermédica',
    'INTERMEDICA': 'NotreDame Intermédica',
    'INTERMÉDICA': 'NotreDame Intermédica',
    
    // Golden Cross variações
    'GOLDEN CROSS': 'Golden Cross',
    'GOLDEN': 'Golden Cross',
    
    // Omint variações
    'OMINT': 'Omint',
  };
  
  const upperOperadora = operadora.toUpperCase();
  
  // Busca exata
  if (mappings[upperOperadora]) {
    return { normalized: mappings[upperOperadora], confidence: 0.9 };
  }
  
  // Busca parcial
  for (const [key, value] of Object.entries(mappings)) {
    if (upperOperadora.includes(key) || key.includes(upperOperadora)) {
      return { normalized: value, confidence: 0.8 };
    }
  }
  
  // Se não encontrou, retornar o original formatado
  const formatted = operadora
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return { normalized: formatted, confidence: 0.5 };
}

/**
 * Função principal para normalizar todos os dados extraídos (versão assíncrona)
 */
export async function normalizeExtractedData(data: ExtractedDocumentData): Promise<NormalizedDocumentData> {
  const normalized: NormalizedDocumentData = { ...data };
  
  // Inicializar objeto de confiança
  normalized.confidence = {};
  
  // Normalizar CPF
  if (data.cpf || data.idNumber) {
    const cpfResult = normalizeCpf(data.cpf || data.idNumber || '');
    normalized.normalizedCpf = cpfResult.normalized;
    normalized.confidence.cpf = cpfResult.confidence;
  }
  
  // Normalizar data de nascimento
  if (data.dataNascimento || data.birthDate) {
    const dateResult = normalizeBirthDate(data.dataNascimento || data.birthDate || '');
    normalized.normalizedBirthDate = dateResult.normalized;
    normalized.confidence.birthDate = dateResult.confidence;
  }
  
  // Normalizar nome
  if (data.nomeTitular || data.fullName) {
    const nameResult = normalizeName(data.nomeTitular || data.fullName || '');
    normalized.normalizedName = nameResult.normalized;
    normalized.confidence.name = nameResult.confidence;
  }
  
  // Normalizar operadora - ESTRATÉGIA HIERÁRQUICA
  if (data.ansCode) {
    // 1ª PRIORIDADE: Buscar por código ANS
    console.log('Tentando buscar operadora pelo código ANS:', data.ansCode);
    const operadoraByAns = await findOperadoraByAns(data.ansCode);
    if (operadoraByAns) {
      normalized.normalizedOperadora = operadoraByAns.name;
      normalized.confidence.operadora = operadoraByAns.confidence;
      normalized.operadoraFoundByAns = {
        name: operadoraByAns.name,
        ansCodeFound: operadoraByAns.foundCode,
        ansCodeExtracted: data.ansCode,
        method: 'ANS_DATABASE_LOOKUP'
      };
      console.log('Operadora resolvida pelo ANS:', operadoraByAns.name, 'Código no banco:', operadoraByAns.foundCode);
    } else {
      console.log('Código ANS não encontrado no banco, tentando busca por nome');
      normalized.operadoraFoundByAns = {
        ansCodeExtracted: data.ansCode,
        method: 'ANS_NOT_FOUND',
        name: null,
        ansCodeFound: null
      };
      
      // 2ª PRIORIDADE: Buscar por nome extraído da carteirinha
      if (data.operadora) {
        const operadoraByName = await findOperadoraByName(data.operadora);
        if (operadoraByName && operadoraByName.confidence > 0.5) {
          normalized.normalizedOperadora = operadoraByName.name;
          normalized.confidence.operadora = operadoraByName.confidence;
          normalized.operadoraFoundByAns.method = 'NAME_DATABASE_LOOKUP';
          normalized.operadoraFoundByAns.name = operadoraByName.name;
          console.log('Operadora encontrada por nome no banco:', operadoraByName.name, 'Confiança:', operadoraByName.confidence);
        } else {
          // 3ª PRIORIDADE: Usar mapeamentos conhecidos
          const operadoraResult = normalizeOperadora(data.operadora);
          normalized.normalizedOperadora = operadoraResult.normalized;
          normalized.confidence.operadora = operadoraResult.confidence * 0.6; // Menor confiança
          normalized.operadoraFoundByAns.method = 'NAME_MAPPING_FALLBACK';
          normalized.operadoraFoundByAns.name = operadoraResult.normalized;
          console.log('Operadora mapeada por fallback:', operadoraResult.normalized);
        }
      }
    }
  } else if (data.operadora) {
    // SEM CÓDIGO ANS: Estratégia de busca por nome
    console.log('Sem código ANS, buscando operadora por nome:', data.operadora);
    
    // 1ª TENTATIVA: Buscar por similaridade no banco de dados
    const operadoraByName = await findOperadoraByName(data.operadora);
    if (operadoraByName && operadoraByName.confidence > 0.4) {
      normalized.normalizedOperadora = operadoraByName.name;
      normalized.confidence.operadora = operadoraByName.confidence;
      normalized.operadoraFoundByAns = {
        method: 'NAME_DATABASE_LOOKUP',
        name: operadoraByName.name,
        ansCodeExtracted: null,
        ansCodeFound: null
      };
      console.log('Operadora encontrada por similaridade no banco:', operadoraByName.name, 'Confiança:', operadoraByName.confidence);
    } else {
      // 2ª TENTATIVA: Usar mapeamentos conhecidos
      const operadoraResult = normalizeOperadora(data.operadora);
      normalized.normalizedOperadora = operadoraResult.normalized;
      normalized.confidence.operadora = operadoraResult.confidence;
      normalized.operadoraFoundByAns = {
        method: 'NAME_MAPPING_FALLBACK',
        name: operadoraResult.normalized,
        ansCodeExtracted: null,
        ansCodeFound: null
      };
      console.log('Operadora mapeada por fallback:', operadoraResult.normalized);
    }
  }
  
  // Calcular confiança geral
  if (normalized.confidence) {
    const confidenceValues = Object.values(normalized.confidence).filter(v => typeof v === 'number');
    normalized.confidence.overall = confidenceValues.length > 0 
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length 
      : 0;
  }
  
  console.log('Dados normalizados:', {
    original: data,
    normalized: {
      cpf: normalized.normalizedCpf,
      birthDate: normalized.normalizedBirthDate,
      name: normalized.normalizedName,
      operadora: normalized.normalizedOperadora,
    },
    confidence: normalized.confidence
  });
  
  return normalized;
}