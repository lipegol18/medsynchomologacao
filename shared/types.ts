// Definição de tipos para o sistema MedSync

// Interface para pedidos médicos (medical_orders)
export interface MedicalOrder {
  // Identificação básica
  id?: number; // opcional para novos pedidos
  patientId: number;
  userId: number;
  hospitalId: number | null;

  // Dados do procedimento
  procedureId: number;
  procedureType: "eletiva" | "urgencia" | null;
  procedureDate?: string | null;
  procedureLaterality: "direito" | "esquerdo" | "bilateral" | "indeterminado" | null;
  procedureCbhpmId?: number | null;
  procedureCbhpmQuantity?: number;

  // Diagnóstico
  clinicalIndication: string;
  cidCodeId?: number[] | null;
  
  // Procedimentos secundários
  secondaryProcedureIds?: number[];
  secondaryProcedureQuantities?: number[];
  secondaryProcedureLateralities?: string[];

  // Materiais OPME
  opmeItemIds?: number[];
  opmeItemQuantities?: number[];
  
  // Documentos e imagens
  exam_images_url?: string[] | null;
  exam_image_count?: number | null;
  medical_report_url?: string | null;
  reportContent?: string | null;
  
  // Status e observações
  statusCode: string;
  additionalNotes?: string | null;
  complexity?: string | null;
  
  // Campo adicional para sugestão de justificativa clínica
  clinicalJustification?: string | null;
  
  // Campos para CIDs unificados
  cidCodes?: string[];
  cidDescriptions?: string[];
  
  // Metadados
  createdAt?: string;
  updatedAt?: string;
}

// Interface para a resposta da API de pedidos médicos
export interface MedicalOrderResponse extends MedicalOrder {
  // Campos específicos da resposta
  created_at: string;
  updated_at: string;
  
  // Campos em snake_case do banco de dados
  patient_id: number;
  user_id: number;
  hospital_id: number | null;
  procedure_id: number;
  procedure_date: string | null;
  report_content: string | null;
  clinical_indication: string;
  cid_code_id: number | null;
  cid_laterality: string | null;
  procedure_cbhpm_id: number | null;
  procedure_cbhpm_quantity: number;
  status_code: string;
  additional_notes: string | null;
  procedure_type: "eletiva" | "urgencia" | null;
  clinical_justification?: string | null;
}