import { ANSDetector } from './ans-detector';
import { FlowDebugger } from '../utils/flow-debugger';

/**
 * Passo 4: Identificação da operadora
 * Detecta a operadora usando código ANS (preferencial) ou análise heurística do texto
 */
export class OperatorDetector {
  
  // Mapeamento de operadoras conhecidas com seus padrões de texto
  private static readonly KNOWN_OPERATORS = {
    'BRADESCO': {
      patterns: ['BRADESCO', 'BRADESCO SAUDE', 'BRADESCO SAÚDE'],
      priority: 1
    },
    'UNIMED': {
      patterns: ['UNIMED', 'COMPACTO', 'CORPORATIVO', 'SEGUROS UNIMED'],
      priority: 2
    },
    'SULAMERICA': {
      patterns: ['SULAMERICA', 'SULAMÉRICA', 'SUL AMERICA', 'SUL AMÉRICA'],
      priority: 1
    },
    'AMIL': {
      patterns: ['AMIL', 'MEDICUS', 'ASSISTENCIA MEDICA INTERNACIONAL'],
      priority: 1
    },
    'PORTO': {
      patterns: ['PORTO SAUDE', 'PORTO SAÚDE', 'PORTO SEGURO SAUDE', 'PORTO SEGURO SAÚDE'],
      priority: 2
    }
  };

  /**
   * Detecta operadora usando padrões de texto
   * @param cleanText Texto pré-processado
   * @returns string | null Nome da operadora detectada
   */
  static detectOperator(cleanText: string): string | null {
    console.log('🔍 Iniciando detecção de operadora por padrões de texto...');
    
    const operatorByText = this.findOperatorByTextPatterns(cleanText);
    if (operatorByText) {
      console.log('✅ Operadora identificada por padrões de texto:', operatorByText);
      return operatorByText;
    }
    
    console.log('❌ Nenhuma operadora identificada por padrões de texto');
    return null;
  }



  /**
   * Busca operadora analisando padrões de texto
   * @param cleanText Texto limpo para análise
   * @returns string | null Nome da operadora
   */
  private static findOperatorByTextPatterns(cleanText: string): string | null {
    console.log('🔍 Analisando padrões de texto para identificar operadora...');
    
    // Ordenar operadoras por prioridade (mais específicas primeiro)
    const sortedOperators = Object.entries(this.KNOWN_OPERATORS)
      .sort(([,a], [,b]) => a.priority - b.priority);
    
    for (const [operatorName, config] of sortedOperators) {
      console.log('🔍 Testando padrões para:', operatorName);
      
      for (const pattern of config.patterns) {
        if (cleanText.includes(pattern)) {
          console.log('✅ Padrão encontrado:', pattern, '→', operatorName);
          return operatorName;
        }
      }
    }
    
    console.log('❌ Nenhum padrão de operadora reconhecido');
    return null;
  }

  /**
   * Busca fuzzy match para operadoras (quando padrões exatos falham)
   * @param cleanText Texto para análise
   * @returns string | null Nome da operadora com maior similaridade
   */
  static findOperatorByFuzzyMatch(cleanText: string): string | null {
    console.log('🔍 Executando busca fuzzy para operadoras...');
    
    const allPatterns = Object.entries(this.KNOWN_OPERATORS)
      .flatMap(([name, config]) => 
        config.patterns.map(pattern => ({ name, pattern }))
      );
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const { name, pattern } of allPatterns) {
      const score = this.calculateSimilarity(cleanText, pattern);
      if (score > bestScore && score > 0.7) { // Threshold de 70%
        bestMatch = name;
        bestScore = score;
      }
    }
    
    if (bestMatch) {
      console.log('✅ Operadora encontrada por similaridade:', bestMatch, 'Score:', bestScore);
      return bestMatch;
    }
    
    return null;
  }

  /**
   * Calcula similaridade entre texto e padrão (algoritmo simples)
   * @param text Texto completo
   * @param pattern Padrão a buscar
   * @returns number Score de 0 a 1
   */
  private static calculateSimilarity(text: string, pattern: string): number {
    const words = pattern.split(' ');
    const foundWords = words.filter(word => text.includes(word));
    return foundWords.length / words.length;
  }
}