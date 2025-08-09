import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma data no formato brasileiro (DD/MM/YYYY)
 * @param date Objeto Date ou string ISO
 * @returns Data formatada no padrão brasileiro
 */
export function formatDateBR(date: Date | string): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formata um CPF adicionando pontos e traços (000.000.000-00)
 * @param cpf String com números do CPF (sem pontuação)
 * @returns CPF formatado ou string vazia se inválido
 */
export function formatCPF(cpf: string): string {
  if (!cpf) return '';
  cpf = cpf.replace(/\D/g, '');
  
  if (cpf.length === 0) return '';
  
  if (cpf.length <= 3) {
    return cpf;
  } else if (cpf.length <= 6) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  } else if (cpf.length <= 9) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  } else {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
  }
}

/**
 * Aplica máscara dinâmica de CPF durante a digitação
 * @param value Valor atual do campo
 * @returns Valor formatado com máscara
 */
export function applyCPFMask(value: string): string {
  // Remove tudo que não é número
  const cleanValue = value.replace(/\D/g, '');
  
  // Aplica a máscara progressivamente
  if (cleanValue.length === 0) return '';
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 6) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3)}`;
  if (cleanValue.length <= 9) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6)}`;
  return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6, 9)}-${cleanValue.slice(9, 11)}`;
}

/**
 * Aplica máscara dinâmica de telefone durante a digitação
 * @param value Valor atual do campo
 * @returns Valor formatado com máscara
 */
export function applyPhoneMask(value: string): string {
  // Remove tudo que não é número
  const cleanValue = value.replace(/\D/g, '');
  
  // Aplica a máscara progressivamente
  if (cleanValue.length === 0) return '';
  if (cleanValue.length <= 2) return `(${cleanValue}`;
  if (cleanValue.length <= 6) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
  if (cleanValue.length <= 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 6)}-${cleanValue.slice(6)}`;
  } else {
    // Celular: (XX) XXXXX-XXXX
    return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;
  }
}

/**
 * Formata um CNPJ adicionando pontos, barra e traço (00.000.000/0000-00)
 * @param cnpj String com números do CNPJ (sem pontuação)
 * @returns CNPJ formatado ou string original se inválido
 */
export function cnpjMask(cnpj: string): string {
  cnpj = cnpj.replace(/\D/g, '');
  
  if (cnpj.length === 0) return '';
  
  if (cnpj.length <= 2) {
    return cnpj;
  } else if (cnpj.length <= 5) {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  } else if (cnpj.length <= 8) {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  } else if (cnpj.length <= 12) {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  } else {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
  }
}

/**
 * Formata um número de telefone brasileiro ((00) 00000-0000)
 * @param phone String com números do telefone (sem pontuação)
 * @returns Telefone formatado ou string original se inválido
 */
export function phoneMask(phone: string): string {
  phone = phone.replace(/\D/g, '');
  
  if (phone.length === 0) return '';
  
  if (phone.length <= 2) {
    return `(${phone}`;
  } else if (phone.length <= 6) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
  } else if (phone.length <= 10) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  } else {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`;
  }
}

/**
 * Remove caracteres não numéricos de uma string
 */
export function onlyNumbers(str: string): string {
  return str.replace(/\D/g, '');
}

/**
 * Valida um CPF brasileiro
 * @param cpf CPF a ser validado (com ou sem formatação)
 * @returns true se o CPF for válido, false caso contrário
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = onlyNumbers(cpf);
  
  // Verificar se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Algoritmo de validação do CPF
  let sum = 0;
  let remainder;
  
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

/**
 * Verificar se um CPF já existe no sistema
 * @param cpf CPF a ser verificado (com ou sem formatação)
 * @param currentPatientId ID do paciente atual (para excluir da verificação em caso de edição)
 * @returns Promise que resolve para true se o CPF já existe, false caso contrário
 */
export async function checkCPFExists(cpf: string, currentPatientId?: number): Promise<boolean> {
  try {
    // Limpar o CPF para garantir consistência na busca
    const cleanCPF = onlyNumbers(cpf);
    if (!cleanCPF || cleanCPF.length !== 11) return false;
    
    // Fazer uma requisição para verificar se o CPF já existe
    const response = await fetch(`/api/patients/cpf/${cleanCPF}/exists${currentPatientId ? `?excludeId=${currentPatientId}` : ''}`);
    
    if (!response.ok) {
      console.error('Erro ao verificar CPF:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Erro ao verificar CPF:', error);
    return false;
  }
}
