/**
 * Utilitário para validação de CRM (números de registro médico)
 * Simula uma API externa do Conselho Federal de Medicina
 */

// Lista de médicos registrados para validação de CRM
interface RegisteredDoctor {
  crm: string;
  name: string;
  city: string;
  state: string;
}

// Banco de dados simulado de médicos registrados
const registeredDoctors: RegisteredDoctor[] = [
  {
    crm: "521017039",
    name: "Daniel Pozzatti",
    city: "Rio de Janeiro",
    state: "RJ"
  },
  {
    crm: "52251289", // CRM do Dr. Sérgio Manhães
    name: "Sérgio Manhães",
    city: "Rio de Janeiro",
    state: "RJ"
  },
  {
    crm: "521234567",
    name: "Rodrigo Roitman",
    city: "Rio de Janeiro",
    state: "RJ"
  },
  {
    crm: "528765432",
    name: "Gisele Cerutti",
    city: "Rio de Janeiro",
    state: "RJ"
  },
  {
    crm: "52873456",
    name: "Jorge Duarte",
    city: "Rio de Janeiro",
    state: "RJ"
  }
];

/**
 * Verifica se um número de CRM é válido
 * @param crmStr Número do CRM como string
 * @returns Informações do médico se encontrado, ou null se CRM inválido
 */
export function validateCRM(crmStr: string): RegisteredDoctor | null {
  // Validação básica do formato de CRM
  // Nota: os CRMs geralmente têm um formato específico dependendo do estado (UF)
  // Por simplicidade, apenas verificamos se está na nossa lista
  console.log(`[CRM Validation] Validando CRM: ${crmStr}`);
  
  // Buscar nas informações registradas
  const doctor = registeredDoctors.find(d => d.crm === crmStr);
  
  if (doctor) {
    console.log(`[CRM Validation] CRM ${crmStr} válido. Médico: ${doctor.name}`);
    return doctor;
  }
  
  console.log(`[CRM Validation] CRM ${crmStr} não encontrado/inválido`);
  return null;
}

export default validateCRM;