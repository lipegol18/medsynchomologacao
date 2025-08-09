import { z } from "zod";

// Validações personalizadas para campos comuns
export const validations = {
  // CPF - Validação completa com dígitos verificadores
  cpf: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF inválido")
    .refine((cpf) => {
      // Remove caracteres não numéricos
      const cleaned = cpf.replace(/\D/g, "");
      
      // Verifica se tem 11 dígitos
      if (cleaned.length !== 11) return false;
      
      // Verifica se não são todos os dígitos iguais
      if (/^(\d)\1{10}$/.test(cleaned)) return false;
      
      // Valida primeiro dígito verificador
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned[i]) * (10 - i);
      }
      let digit1 = 11 - (sum % 11);
      if (digit1 > 9) digit1 = 0;
      
      // Valida segundo dígito verificador
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned[i]) * (11 - i);
      }
      let digit2 = 11 - (sum % 11);
      if (digit2 > 9) digit2 = 0;
      
      return parseInt(cleaned[9]) === digit1 && parseInt(cleaned[10]) === digit2;
    }, "CPF inválido"),

  // CNPJ - Validação completa com dígitos verificadores
  cnpj: z.string()
    .min(14, "CNPJ deve ter 14 dígitos")
    .max(18, "CNPJ inválido")
    .refine((cnpj) => {
      const cleaned = cnpj.replace(/\D/g, "");
      
      if (cleaned.length !== 14) return false;
      if (/^(\d)\1{13}$/.test(cleaned)) return false;
      
      // Validação dos dígitos verificadores
      const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned[i]) * weights1[i];
      }
      let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      
      sum = 0;
      for (let i = 0; i < 13; i++) {
        sum += parseInt(cleaned[i]) * weights2[i];
      }
      let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      
      return parseInt(cleaned[12]) === digit1 && parseInt(cleaned[13]) === digit2;
    }, "CNPJ inválido"),

  // Email - Validação robusta
  email: z.string()
    .email("Email inválido")
    .min(5, "Email muito curto")
    .max(100, "Email muito longo")
    .refine((email) => {
      // Verifica se não tem espaços
      return !email.includes(" ");
    }, "Email não pode conter espaços"),

  // Telefone Celular - Validação específica para celular brasileiro com +55
  phone: z.string()
    .min(13, "Telefone celular deve ter pelo menos 13 caracteres")
    .max(17, "Telefone celular muito longo")
    .refine((phone) => {
      // Remove todos os caracteres não numéricos exceto o sinal de +
      const cleanedPhone = phone.replace(/[^\d+]/g, "");
      
      // Verifica se começa com +55
      if (!cleanedPhone.startsWith("+55")) {
        return false;
      }
      
      // Remove o +55 e verifica se restam 11 dígitos (DDD + 9 dígitos)
      const phoneNumber = cleanedPhone.substring(3);
      if (phoneNumber.length !== 11) {
        return false;
      }
      
      // Verifica se o primeiro dígito após o DDD é 9 (celular)
      const ddd = phoneNumber.substring(0, 2);
      const firstDigit = phoneNumber.substring(2, 3);
      
      // DDD válidos no Brasil (11 a 89)
      const dddNum = parseInt(ddd);
      if (dddNum < 11 || dddNum > 89) {
        return false;
      }
      
      // Primeiro dígito deve ser 9 para celular
      if (firstDigit !== "9") {
        return false;
      }
      
      return true;
    }, "Formato deve ser +55 + DDD + 9 dígitos (ex: +5521999999999)"),

  // CEP - Validação para formato brasileiro
  cep: z.string()
    .min(8, "CEP deve ter 8 dígitos")
    .max(9, "CEP inválido")
    .refine((cep) => {
      const cleaned = cep.replace(/\D/g, "");
      return cleaned.length === 8;
    }, "CEP deve ter 8 dígitos"),

  // CRM - Validação básica
  crm: z.union([
    z.string().transform((val) => {
      const num = parseInt(val.replace(/\D/g, ""));
      return isNaN(num) ? 0 : num;
    }),
    z.number()
  ]).refine((val) => {
    const num = typeof val === "string" ? parseInt(val) : val;
    return num > 0 && num <= 9999999;
  }, "CRM deve ser um número válido entre 1 e 9999999"),

  // Data de nascimento - Validação de idade mínima e máxima
  birthDate: z.string()
    .refine((date) => {
      if (!date) return false;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 0 && age - 1 <= 150;
      }
      return age >= 0 && age <= 150;
    }, "Data de nascimento inválida"),

  // Nome completo - Validação básica
  fullName: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo")
    .refine((name) => {
      // Verifica se tem pelo menos nome e sobrenome
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2 && parts.every(part => part.length >= 1);
    }, "Informe nome e sobrenome"),

  // Código ANVISA - Validação básica
  anvisaCode: z.string()
    .optional()
    .refine((code) => {
      if (!code) return true; // Campo opcional
      const cleaned = code.replace(/\D/g, "");
      return cleaned.length >= 8 && cleaned.length <= 20;
    }, "Código ANVISA deve ter entre 8 e 20 dígitos"),

  // Senha - Validação robusta
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(100, "Senha muito longa")
    .refine((password) => {
      // Pelo menos uma letra minúscula
      return /[a-z]/.test(password);
    }, "Senha deve conter pelo menos uma letra minúscula")
    .refine((password) => {
      // Pelo menos uma letra maiúscula
      return /[A-Z]/.test(password);
    }, "Senha deve conter pelo menos uma letra maiúscula")
    .refine((password) => {
      // Pelo menos um número
      return /\d/.test(password);
    }, "Senha deve conter pelo menos um número")
    .refine((password) => {
      // Pelo menos um caractere especial
      return /[!@#$%^&*(),.?":{}|<>]/.test(password);
    }, "Senha deve conter pelo menos um caractere especial"),
};

// Schemas reutilizáveis para entidades comuns
export const commonSchemas = {
  // Schema para dados pessoais básicos
  personalInfo: z.object({
    fullName: validations.fullName,
    cpf: validations.cpf,
    email: validations.email.optional(),
    phone: validations.phone.optional(),
    birthDate: validations.birthDate,
  }),

  // Schema para endereço
  address: z.object({
    address: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres").optional(),
    neighborhood: z.string().min(2, "Bairro deve ter pelo menos 2 caracteres").optional(),
    city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres").optional(),
    state: z.string().length(2, "Estado deve ter 2 caracteres").optional(),
    zipCode: validations.cep.optional(),
  }),

  // Schema para empresa
  company: z.object({
    companyName: z.string().min(3, "Nome da empresa deve ter pelo menos 3 caracteres"),
    tradeName: z.string().optional(),
    cnpj: validations.cnpj,
    email: validations.email.optional(),
    phone: validations.phone.optional(),
    website: z.string().url("Website deve ser uma URL válida").optional().or(z.literal("")),
  }),
};

// Funções utilitárias para formatação
export const formatters = {
  cpf: (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  },

  cnpj: (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  },

  phone: (value: string) => {
    // Remove todos os caracteres não numéricos exceto o sinal de +
    const cleanedPhone = value.replace(/[^\d+]/g, "");
    
    // Se não tem +55, adiciona automaticamente
    if (!cleanedPhone.startsWith("+55")) {
      const onlyNumbers = cleanedPhone.replace(/\D/g, "");
      if (onlyNumbers.length === 11) {
        return `+55 (${onlyNumbers.substring(0, 2)}) ${onlyNumbers.substring(2, 7)}-${onlyNumbers.substring(7)}`;
      }
      return value;
    }
    
    // Se tem +55, formata corretamente
    const phoneNumber = cleanedPhone.substring(3);
    if (phoneNumber.length === 11) {
      return `+55 (${phoneNumber.substring(0, 2)}) ${phoneNumber.substring(2, 7)}-${phoneNumber.substring(7)}`;
    }
    
    return value;
  },

  cep: (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2");
  },
};