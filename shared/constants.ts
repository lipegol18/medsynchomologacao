/**
 * Arquivo de constantes compartilhadas entre aplicações web e mobile 
 */

// Endpoints da API
export const API_ENDPOINTS = {
  // Status
  STATUS: '/api/status',
  
  // Pacientes
  PATIENTS: '/api/patients',
  PATIENT_BY_ID: (id: number) => `/api/patients/${id}`,
  
  // Procedimentos CBHPM
  PROCEDURES: '/api/procedures',
  PROCEDURE_BY_ID: (id: number) => `/api/procedures/${id}`,
  PROCEDURES_SEARCH: (term: string) => `/api/procedures/search?term=${encodeURIComponent(term)}`,
  
  // Itens OPME
  OPME_ITEMS: '/api/opme-items',
  OPME_ITEM_BY_ID: (id: number) => `/api/opme-items/${id}`,
  OPME_ITEMS_SEARCH: (term: string) => `/api/opme-items?search=${encodeURIComponent(term)}`,
  
  // Ordens Médicas
  MEDICAL_ORDERS: '/api/medical-orders',
  MEDICAL_ORDER_BY_ID: (id: number) => `/api/medical-orders/${id}`,
  MEDICAL_ORDERS_BY_PATIENT: (patientId: number) => `/api/medical-orders?patientId=${patientId}`,
  MEDICAL_ORDER_UPDATE_STATUS: (id: number) => `/api/medical-orders/${id}/status`,
  MEDICAL_ORDER_IN_PROGRESS: '/api/medical-orders/in-progress',
  MEDICAL_ORDER_IN_PROGRESS_BY_USER: (userId: number) => `/api/medical-orders/in-progress/user/${userId}`,
  MEDICAL_ORDER_IN_PROGRESS_BY_PATIENT: (patientId: number) => `/api/medical-orders/in-progress/patient/${patientId}`,
  
  // Itens da Ordem
  ORDER_ITEMS: (orderId: number) => `/api/medical-orders/${orderId}/items`,
  ORDER_ITEM_BY_ID: (id: number) => `/api/order-items/${id}`,
  
  // Documentos Escaneados
  SCANNED_DOCUMENTS: '/api/scanned-documents',
  PATIENT_SCANNED_DOCUMENTS: (patientId: number) => `/api/patients/${patientId}/scanned-documents`,
  
  // Hospitais
  HOSPITALS: '/api/hospitals',
  HOSPITAL_BY_ID: (id: number) => `/api/hospitals/${id}`
};

// Estados de ordens médicas
export const ORDER_STATUS = {
  EM_PREENCHIMENTO: 'Em Preenchimento',
  EM_AVALIACAO: 'Em Avaliação',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
  AGUARDANDO_ENVIO: 'Aguardando Envio',
  ENVIADO: 'Enviado',
  CANCELADO: 'Cancelado'
};

// Valores de status de ordens médicas para API (legacy - será removido)
export const ORDER_STATUS_VALUES = {
  EM_PREENCHIMENTO: 'em_preenchimento',
  EM_AVALIACAO: 'em_avaliacao',
  ACEITO: 'aceito',
  RECUSADO: 'recusado',
  AGUARDANDO_ENVIO: 'aguardando_envio',
  ENVIADO: 'enviado',
  CANCELADO: 'cancelado'
};

// IDs dos status de ordens médicas para nova estrutura relacional
export const ORDER_STATUS_IDS = {
  EM_PREENCHIMENTO: 1,      // "Incompleta"
  EM_AVALIACAO: 2,          // "Em análise"
  ACEITO: 3,                // "Autorizado"
  AUTORIZADO_PARCIAL: 4,    // "Autorizado Parcial"
  PENDENCIA: 5,             // "Pendência"
  CIRURGIA_REALIZADA: 6,    // "Cirurgia realizada"
  CANCELADO: 7,             // "Cancelada"
  AGUARDANDO_ENVIO: 8,      // "Aguardando Envio"
  RECEBIDO: 9               // "Recebido"
};

// Caráter do procedimento para exibição
export const PROCEDURE_TYPES = {
  ELETIVA: 'Cirurgia Eletiva',
  URGENCIA: 'Cirurgia de Urgência'
};

// Valores de caráter do procedimento para API
export const PROCEDURE_TYPE_VALUES = {
  ELETIVA: 'eletiva',
  URGENCIA: 'urgencia'
};

// Tipos de documentos
export const DOCUMENT_TYPES = {
  MEDICAL_REPORT: 'Laudo Médico',
  PRESCRIPTION: 'Prescrição Médica',
  EXAM_RESULT: 'Resultado de Exame',
  HOSPITALIZATION_FORM: 'Formulário de Internação',
  OTHER: 'Outro'
};

// Gêneros de pacientes
export const PATIENT_GENDERS = {
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  OTHER: 'Outro',
  NOT_INFORMED: 'Não Informado'
};

// Formatadores
export const FORMATTERS = {
  // Formata CPF: 12345678901 -> 123.456.789-01
  formatCpf: (cpf: string): string => {
    if (!cpf) return '';
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return cpf;
    return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },
  
  // Formata CNPJ: 12345678901234 -> 12.345.678/0001-23
  formatCnpj: (cnpj: string): string => {
    if (!cnpj) return '';
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return cnpj;
    return cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  },
  
  // Formata telefone: 21999999999 -> (21) 99999-9999
  formatPhone: (phone: string): string => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return phone;
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  },
  
  // Formata data: 2025-05-07 -> 07/05/2025
  formatDate: (date: string): string => {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },
  
  // Calcula idade a partir da data de nascimento
  calculateAge: (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  }
};

// Mensagens de erro comuns
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  SERVER_ERROR: 'Erro no servidor. Por favor, tente novamente mais tarde.',
  NOT_FOUND: 'Recurso não encontrado.',
  INVALID_DATA: 'Dados inválidos. Verifique os campos e tente novamente.',
  UNAUTHORIZED: 'Não autorizado. Faça login para continuar.',
  CONFLICT: 'Conflito. Este registro já existe.'
};