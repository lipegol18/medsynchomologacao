import { FlowDebugger } from '../utils/flow-debugger';

/**
 * Passo 2: Pré-processamento e limpeza do texto extraído
 * Normaliza o texto para facilitar a detecção de padrões
 */
export class TextPreprocessor {
  
  /**
   * Executa limpeza completa do texto OCR
   * @param rawText Texto bruto extraído do OCR
   * @returns string Texto limpo e normalizado
   */
  static cleanText(rawText: string): string {
    FlowDebugger.enter('text-preprocessor.ts', 'cleanText', { originalLength: rawText.length });
    
    console.log('🧹 Iniciando limpeza do texto OCR...');
    console.log('📄 Texto original (primeiros 200 chars):', rawText.substring(0, 200));
    
    FlowDebugger.data('text-preprocessor.ts', 'cleanText', 'Texto original preview', rawText.substring(0, 200));
    
    let cleanedText = rawText
      .toUpperCase()                                        // Converter para maiúsculas
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")    // Remover acentos
      .replace(/[ \t]+/g, " ")                             // Normalizar espaços/tabs (preserva quebras de linha)
      .replace(/\n\s*\n/g, "\n")                           // Remove linhas vazias duplas
      .trim();                                              // Remover espaços início/fim

    FlowDebugger.data('text-preprocessor.ts', 'cleanText', 'Texto limpo', {
      originalLength: rawText.length,
      cleanedLength: cleanedText.length,
      preview: cleanedText.substring(0, 200),
      lineCount: cleanedText.split('\n').length
    });

    console.log('✅ Texto limpo (primeiros 200 chars):', cleanedText.substring(0, 200));
    console.log('📊 Estatísticas: Original:', rawText.length, 'chars → Limpo:', cleanedText.length, 'chars');
    console.log('📋 Linhas preservadas:', cleanedText.split('\n').length, 'linhas');
    
    FlowDebugger.exit('text-preprocessor.ts', 'cleanText', { cleanedLength: cleanedText.length });
    return cleanedText;
  }

  /**
   * Versão alternativa que preserva totalmente a estrutura de linhas
   * Para casos onde a estrutura é crítica para extração
   * @param rawText Texto bruto extraído do OCR
   * @returns string Texto com estrutura preservada
   */
  static cleanTextPreservingStructure(rawText: string): string {
    console.log('🧹 Limpeza preservando estrutura de linhas...');
    
    let cleanedText = rawText
      .toUpperCase()                                        // Converter para maiúsculas
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")    // Remover acentos
      .replace(/[ \t]+/g, " ")                             // Apenas normalizar espaços horizontais
      .replace(/^\s+|\s+$/gm, "")                          // Trim cada linha individualmente
      .replace(/\n{3,}/g, "\n\n");                         // Máximo 2 quebras consecutivas

    console.log('✅ Estrutura preservada - Linhas:', cleanedText.split('\n').length);
    return cleanedText;
  }

  /**
   * Extrai linhas do texto para análise estruturada
   * @param text Texto limpo
   * @returns string[] Array de linhas não vazias
   */
  static extractLines(text: string): string[] {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log('📋 Extraídas', lines.length, 'linhas de texto');
    return lines;
  }

  /**
   * Remove caracteres especiais mantendo apenas letras, números e espaços
   * @param text Texto a ser limpo
   * @returns string Texto sem caracteres especiais
   */
  static removeSpecialCharacters(text: string): string {
    return text.replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Extrai todos os números do texto (útil para análise posterior)
   * @param text Texto limpo
   * @returns string[] Array com todos os números encontrados
   */
  static extractAllNumbers(text: string): string[] {
    const numbers = text.match(/\d+/g) || [];
    console.log('🔢 Números encontrados no texto:', numbers.length);
    return numbers;
  }

  /**
   * Cria versão do texto adequada para busca de padrões
   * @param text Texto original
   * @returns string Texto otimizado para regex
   */
  static prepareForPatternMatching(text: string): string {
    return text
      .replace(/[\-\.\(\)\[\]]/g, ' ')  // Substituir pontuação por espaços
      .replace(/\s+/g, ' ')             // Normalizar espaços
      .trim();
  }
}