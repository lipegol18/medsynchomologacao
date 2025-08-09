// Arquivo para queries SQL diretas, sem usar Drizzle ORM
import { pool } from './db';

/**
 * Cria um pedido médico diretamente usando SQL nativo
 * Evita completamente problemas com mapeamento de colunas do ORM
 */
export async function createMedicalOrderDirect(orderData: any) {
  console.log("MODO DIRETO: Criando pedido médico com SQL nativo");
  console.log("Dados recebidos:", orderData);
  
  try {
    // Preparar arrays vazios
    const emptyArray = '{}';
    
    // Status padrão
    const statusCode = orderData.statusCode || "em_preenchimento";
    
    // Query SQL com nome exato das colunas do banco de dados
    const query = `
      INSERT INTO medical_orders (
        patient_id, 
        user_id, 
        hospital_id, 
        procedure_id, 
        procedure_date, 
        report_content,
        clinical_indication, 
        status_code, 
        cid_laterality, 
        procedure_laterality, 
        cid_code_id,
        -- Procedimentos gerenciados via medical_order_procedures 
        opme_item_ids, 
        opme_item_quantities, 
        procedure_type,
        exam_images_url, 
        exam_image_count, 
        medical_report_url, 
        additional_notes, 
        complexity
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;
    
    // Executar a query com parâmetros posicionais
    const result = await pool.query(query, [
      orderData.patientId,
      orderData.userId,
      orderData.hospitalId,
      orderData.procedureId || null,
      orderData.procedureDate || null,
      orderData.reportContent || null,
      orderData.clinicalIndication || '',
      statusCode,
      orderData.cidLaterality || null,
      orderData.procedureLaterality || null,
      orderData.cidCodeId || null,
      // Procedimentos inseridos via medical_order_procedures
      orderData.opmeItemIds?.length ? orderData.opmeItemIds : emptyArray,
      orderData.opmeItemQuantities?.length ? orderData.opmeItemQuantities : emptyArray,
      orderData.procedureType || 'eletiva',
      orderData.exam_images_url?.length ? orderData.exam_images_url : emptyArray,
      orderData.exam_image_count || 0,
      orderData.medical_report_url || null,
      orderData.additional_notes || null,
      orderData.complexity || null
    ]);
    
    if (result.rows && result.rows.length > 0) {
      console.log("MODO DIRETO: Pedido criado com sucesso:", result.rows[0]);
      return result.rows[0];
    } else {
      throw new Error("Nenhum registro foi retornado após a inserção");
    }
  } catch (error) {
    console.error("MODO DIRETO: Erro ao criar pedido:", error);
    throw error;
  }
}