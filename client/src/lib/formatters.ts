/**
 * Utilitários de formatação para diferentes tipos de códigos e dados
 */

/**
 * Formata um código CBHPM automaticamente no padrão X.XX.XX.XX-X
 * @param value - Valor a ser formatado (pode conter números e caracteres especiais)
 * @returns Código formatado no padrão CBHPM ou string original se não for numérico
 */
export const formatCBHPMCode = (value: string): string => {
  // Remove todos os caracteres que não são números
  const numbers = value.replace(/\D/g, '');
  
  // Se não há números, retorna vazio
  if (!numbers) return '';
  
  // Limita a 9 dígitos no máximo (formato: XXXXXXXXX)
  const limitedNumbers = numbers.slice(0, 9);
  
  // Aplica a máscara progressivamente: X.XX.XX.XX-X
  let formatted = limitedNumbers;
  
  if (limitedNumbers.length > 1) {
    formatted = limitedNumbers.slice(0, 1) + '.' + limitedNumbers.slice(1);
  }
  if (limitedNumbers.length > 3) {
    formatted = limitedNumbers.slice(0, 1) + '.' + limitedNumbers.slice(1, 3) + '.' + limitedNumbers.slice(3);
  }
  if (limitedNumbers.length > 5) {
    formatted = limitedNumbers.slice(0, 1) + '.' + limitedNumbers.slice(1, 3) + '.' + limitedNumbers.slice(3, 5) + '.' + limitedNumbers.slice(5);
  }
  if (limitedNumbers.length > 7) {
    formatted = limitedNumbers.slice(0, 1) + '.' + limitedNumbers.slice(1, 3) + '.' + limitedNumbers.slice(3, 5) + '.' + limitedNumbers.slice(5, 7) + '-' + limitedNumbers.slice(7);
  }
  
  return formatted;
};

/**
 * Verifica se uma string contém apenas números (ignorando pontos e hífens)
 * @param value - Valor a ser verificado
 * @returns true se contém apenas números
 */
export const isNumericCode = (value: string): boolean => {
  return /^\d+$/.test(value.replace(/[.\-]/g, ''));
};

/**
 * Manipulador de entrada para campos que precisam de formatação automática de códigos CBHPM
 * @param value - Valor digitado pelo usuário
 * @param setValue - Função para atualizar o estado
 */
export const handleCBHPMCodeInput = (
  value: string, 
  setValue: (value: string) => void
): void => {
  // Se o valor contém apenas números, aplica a formatação automática
  if (isNumericCode(value)) {
    setValue(formatCBHPMCode(value));
  } else {
    // Caso contrário, permite entrada livre
    setValue(value);
  }
};

/**
 * Remove a formatação de um código CBHPM, retornando apenas os números
 * @param formattedCode - Código formatado (ex: "3.16.03.01-7")
 * @returns Código sem formatação (ex: "31603017")
 */
export const removeCBHPMFormatting = (formattedCode: string): string => {
  return formattedCode.replace(/[.\-]/g, '');
};

/**
 * Valida se um código CBHPM está no formato correto
 * @param code - Código a ser validado
 * @returns true se está no formato válido X.XX.XX.XX-X
 */
export const isValidCBHPMFormat = (code: string): boolean => {
  const cbhpmPattern = /^\d\.\d{2}\.\d{2}\.\d{2}-\d$/;
  return cbhpmPattern.test(code);
};

/**
 * Formata um código CID-10 automaticamente no padrão correto
 * @param value - Valor a ser formatado (pode conter letras e números)
 * @returns Código formatado no padrão CID-10 (ex: M75, M75.1, M75.12)
 */
export const formatCID10Code = (value: string): string => {
  // Remove espaços e converte para maiúsculo
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  
  // Se não há conteúdo, retorna vazio
  if (!cleaned) return '';
  
  // Verifica se começa com letra (padrão CID-10)
  if (!/^[A-Z]/.test(cleaned)) {
    return cleaned; // Retorna como está se não começar com letra
  }
  
  // Se já está formatado corretamente (ex: M17.0), retorna como está
  if (/^[A-Z]\d{2}(\.\d+)?$/.test(cleaned)) {
    return cleaned;
  }
  
  // Extrai a letra inicial e os números
  const letter = cleaned.charAt(0);
  const numbers = cleaned.slice(1).replace(/\D/g, ''); // Remove tudo que não é número
  
  // Limita a 3 dígitos no máximo
  const limitedNumbers = numbers.slice(0, 3);
  
  // Aplica a formatação progressiva
  let formatted = letter + limitedNumbers;
  
  // Se tem mais de 2 dígitos, adiciona ponto antes do terceiro
  if (limitedNumbers.length > 2) {
    formatted = letter + limitedNumbers.slice(0, 2) + '.' + limitedNumbers.slice(2);
  }
  
  return formatted;
};

/**
 * Verifica se uma string é um código CID-10 válido
 * @param value - Valor a ser verificado
 * @returns true se é um código CID-10 válido
 */
export const isCID10Code = (value: string): boolean => {
  // Padrão: Letra + 2 dígitos obrigatórios + até 1 dígito opcional após ponto
  const cid10Pattern = /^[A-Z]\d{2}(\.\d)?$/;
  return cid10Pattern.test(value.toUpperCase());
};

/**
 * Manipulador de entrada para campos que precisam de formatação automática de códigos CID-10
 * @param value - Valor digitado pelo usuário
 * @param setValue - Função para atualizar o estado
 */
export const handleCID10CodeInput = (
  value: string, 
  setValue: (value: string) => void
): void => {
  // Se o valor começa com letra, aplica formatação CID-10
  if (/^[A-Za-z]/.test(value)) {
    setValue(formatCID10Code(value));
  } else {
    // Caso contrário, permite entrada livre
    setValue(value);
  }
};

/**
 * Remove a formatação de um código CID-10, retornando apenas letra e números
 * @param formattedCode - Código formatado (ex: "M75.1")
 * @returns Código sem formatação (ex: "M751")
 */
export const removeCID10Formatting = (formattedCode: string): string => {
  return formattedCode.replace(/\./g, '').toUpperCase();
};

/**
 * Valida se um código CID-10 está no formato correto
 * @param code - Código a ser validado
 * @returns true se está no formato válido (ex: M75, M75.1)
 */
export const isValidCID10Format = (code: string): boolean => {
  return isCID10Code(code);
};