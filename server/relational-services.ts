import { db } from './db';
import { 
  medicalOrderCids, 
  medicalOrderOpmeItems, 
  medicalOrderSuppliers, 
  medicalOrderProcedures,
  medicalOrderSurgicalApproaches,
  procedures,
  type InsertMedicalOrderCid, 
  type InsertMedicalOrderOpmeItem, 
  type InsertMedicalOrderSupplier,
  type InsertMedicalOrderProcedure,
  type MedicalOrderProcedure
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class RelationalOrderService {
  // Gerenciar CIDs do pedido
  async updateOrderCids(orderId: number, cidIds: number[]): Promise<void> {
    // Remover CIDs existentes
    await db.delete(medicalOrderCids).where(eq(medicalOrderCids.orderId, orderId));
    
    // Inserir novos CIDs
    if (cidIds.length > 0) {
      const cidsToInsert: InsertMedicalOrderCid[] = cidIds.map(cidId => ({
        orderId,
        cidCodeId: cidId
      }));
      await db.insert(medicalOrderCids).values(cidsToInsert);
    }
  }

  async getOrderCids(orderId: number): Promise<Array<{ id: number; code: string; description: string; category?: string; }>> {
    try {
      const orderCids = await db
        .select({ cidCodeId: medicalOrderCids.cidCodeId })
        .from(medicalOrderCids)
        .where(eq(medicalOrderCids.orderId, orderId));
      
      // Buscar dados completos dos CIDs
      const { cidCodes } = await import('@shared/schema');
      const enrichedCids = await Promise.all(
        orderCids.map(async (oc) => {
          try {
            const [cidData] = await db
              .select()
              .from(cidCodes)
              .where(eq(cidCodes.id, oc.cidCodeId));
            
            return cidData ? {
              id: cidData.id,
              code: cidData.code,
              description: cidData.description,
              category: cidData.category
            } : null;
          } catch (error) {
            console.error(`Erro ao buscar CID ${oc.cidCodeId}:`, error);
            return null;
          }
        })
      );
      
      const validCids = enrichedCids.filter(cid => cid !== null) as Array<{ id: number; code: string; description: string; category?: string; }>;
      console.log(`Encontrados ${validCids.length} CIDs para pedido ${orderId}`);
      return validCids;
    } catch (error) {
      console.error(`Erro ao buscar CIDs para pedido ${orderId}:`, error);
      return [];
    }
  }

  // Gerenciar OPME Items do pedido
  async updateOrderOpmeItems(orderId: number, opmeItems: { opmeItemId: number; quantity: number; procedureId?: number }[]): Promise<void> {
    console.log(`=== Atualizando itens OPME para pedido ${orderId} ===`);
    console.log('Itens OPME recebidos:', opmeItems);
    
    // Remover itens OPME existentes
    await db.delete(medicalOrderOpmeItems).where(eq(medicalOrderOpmeItems.orderId, orderId));
    
    // Inserir novos itens OPME
    if (opmeItems.length > 0) {
      const itemsToInsert: InsertMedicalOrderOpmeItem[] = opmeItems.map(item => ({
        orderId,
        procedureId: item.procedureId || null, // Tornar procedureId opcional
        opmeItemId: item.opmeItemId,
        quantity: item.quantity
      }));
      await db.insert(medicalOrderOpmeItems).values(itemsToInsert);
      console.log(`Inseridos ${itemsToInsert.length} itens OPME`);
    }
  }

  async getOrderOpmeItems(orderId: number): Promise<Array<{ item: any; quantity: number }>> {
    try {
      const orderItems = await db
        .select({
          opmeItemId: medicalOrderOpmeItems.opmeItemId,
          quantity: medicalOrderOpmeItems.quantity
        })
        .from(medicalOrderOpmeItems)
        .where(eq(medicalOrderOpmeItems.orderId, orderId));
      
      // Buscar dados completos dos itens OPME
      const { opmeItems } = await import('@shared/schema');
      const enrichedItems = await Promise.all(
        orderItems.map(async (item) => {
          try {
            const [itemData] = await db
              .select()
              .from(opmeItems)
              .where(eq(opmeItems.id, item.opmeItemId));
            
            return itemData ? {
              item: itemData,
              quantity: item.quantity
            } : null;
          } catch (error) {
            console.error(`Erro ao buscar item OPME ${item.opmeItemId}:`, error);
            return null;
          }
        })
      );
      
      const validItems = enrichedItems.filter(item => item !== null) as Array<{ item: any; quantity: number }>;
      console.log(`Encontrados ${validItems.length} itens OPME para pedido ${orderId}`);
      return validItems;
    } catch (error) {
      console.error(`Erro ao buscar itens OPME para pedido ${orderId}:`, error);
      return [];
    }
  }

  // Gerenciar Suppliers do pedido
  async updateOrderSuppliers(orderId: number, supplierIds: number[]): Promise<void> {
    // Remover fornecedores existentes
    await db.delete(medicalOrderSuppliers).where(eq(medicalOrderSuppliers.orderId, orderId));
    
    // Inserir novos fornecedores
    if (supplierIds.length > 0) {
      const suppliersToInsert: InsertMedicalOrderSupplier[] = supplierIds.map(supplierId => ({
        orderId,
        supplierId
      }));
      await db.insert(medicalOrderSuppliers).values(suppliersToInsert);
    }
  }

  async getOrderSuppliers(orderId: number): Promise<Array<{ id: number; companyName: string; tradeName: string | null; cnpj: string; municipalityId: number; address: string | null; phone: string | null; email: string | null; active: boolean; }>> {
    try {
      const orderSuppliers = await db
        .select({
          supplierId: medicalOrderSuppliers.supplierId
        })
        .from(medicalOrderSuppliers)
        .where(eq(medicalOrderSuppliers.orderId, orderId));
      
      // Buscar dados completos dos fornecedores
      const { suppliers } = await import('@shared/schema');
      const enrichedSuppliers = await Promise.all(
        orderSuppliers.map(async (os) => {
          try {
            const [supplierData] = await db
              .select()
              .from(suppliers)
              .where(eq(suppliers.id, os.supplierId));
            
            return supplierData ? {
              id: supplierData.id,
              companyName: supplierData.companyName,
              tradeName: supplierData.tradeName,
              cnpj: supplierData.cnpj,
              municipalityId: supplierData.municipalityId,
              address: supplierData.address,
              phone: supplierData.phone,
              email: supplierData.email,
              active: supplierData.active
            } : null;
          } catch (error) {
            console.error(`Erro ao buscar fornecedor ${os.supplierId}:`, error);
            return null;
          }
        })
      );
      
      const validSuppliers = enrichedSuppliers.filter(supplier => supplier !== null) as Array<{ id: number; companyName: string; tradeName: string | null; cnpj: string; municipalityId: number; address: string | null; phone: string | null; email: string | null; active: boolean; }>;
      console.log(`Encontrados ${validSuppliers.length} fornecedores para pedido ${orderId}`);
      return validSuppliers;
    } catch (error) {
      console.error(`Erro ao buscar fornecedores para pedido ${orderId}:`, error);
      return [];
    }
  }

  // === GESTÃO DE PROCEDIMENTOS CBHPM ===
  
  async updateOrderProcedures(orderId: number, procedures: Array<{
    procedureId: number;
    quantityRequested: number;
    isMain?: boolean;
  }>): Promise<void> {
    console.log(`=== Atualizando procedimentos para pedido ${orderId} ===`);
    
    // Remover procedimentos existentes
    await db.delete(medicalOrderProcedures).where(eq(medicalOrderProcedures.orderId, orderId));
    
    // Inserir novos procedimentos
    if (procedures.length > 0) {
      // Buscar dados de porte para determinar o procedimento principal
      const { procedures: proceduresTable } = await import('@shared/schema');
      const proceduresWithPorte = await Promise.all(
        procedures.map(async (proc) => {
          const [procedureData] = await db
            .select({ porte: proceduresTable.porte })
            .from(proceduresTable)
            .where(eq(proceduresTable.id, proc.procedureId));
          
          return {
            ...proc,
            porte: procedureData?.porte || null
          };
        })
      );

      // Função para converter porte em valor numérico
      const getPorteValue = (porte: string | null): number => {
        if (!porte) return 0;
        
        // Extrair número do porte (ex: "10B" -> 10, "02A" -> 2)
        const match = porte.match(/^(\d+)/);
        if (match) {
          const baseValue = parseInt(match[1]);
          // Adicionar peso baseado na letra (A=0.1, B=0.2, C=0.3, etc.)
          const letter = porte.replace(/^\d+/, '');
          const letterValue = letter ? (letter.charCodeAt(0) - 64) * 0.1 : 0;
          return baseValue + letterValue;
        }
        return 0;
      };

      // Determinar qual procedimento tem o maior porte
      let maxPorteValue = 0;
      let mainProcedureIndex = 0;
      
      proceduresWithPorte.forEach((proc, index) => {
        const porteValue = getPorteValue(proc.porte);
        console.log(`Procedimento ${proc.procedureId}: porte ${proc.porte} = valor ${porteValue}`);
        if (porteValue > maxPorteValue) {
          maxPorteValue = porteValue;
          mainProcedureIndex = index;
        }
      });

      console.log(`Procedimento principal determinado pelo maior porte: índice ${mainProcedureIndex} (porte valor: ${maxPorteValue})`);
      
      // Criar procedimentos com marcação correta do principal
      const proceduresToInsert: InsertMedicalOrderProcedure[] = proceduresWithPorte.map((proc, index) => ({
        orderId,
        procedureId: proc.procedureId,
        quantityRequested: proc.quantityRequested,
        isMain: index === mainProcedureIndex, // Procedimento com maior porte é o principal
        status: 'em_analise'
      }));
      
      await db.insert(medicalOrderProcedures).values(proceduresToInsert);
      console.log(`Inseridos ${proceduresToInsert.length} procedimentos - Principal: ID ${proceduresWithPorte[mainProcedureIndex].procedureId}`);
    }
  }

  async getOrderProcedures(orderId: number): Promise<Array<MedicalOrderProcedure & { procedure?: any }>> {
    try {
      const orderProcedures = await db
        .select()
        .from(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.orderId, orderId));
      
      // Enriquecer com dados do procedimento CBHPM
      const enrichedProcedures = await Promise.all(
        orderProcedures.map(async (proc) => {
          try {
            const [procedureData] = await db
              .select()
              .from(procedures)
              .where(eq(procedures.id, proc.procedureId));
            
            return {
              ...proc,
              procedure: procedureData || null
            };
          } catch (error) {
            console.error(`Erro ao buscar procedimento ${proc.procedureId}:`, error);
            return {
              ...proc,
              procedure: null
            };
          }
        })
      );
      
      console.log(`Encontrados ${enrichedProcedures.length} procedimentos para pedido ${orderId}`);
      return enrichedProcedures;
    } catch (error) {
      console.error(`Erro ao buscar procedimentos para pedido ${orderId}:`, error);
      return [];
    }
  }

  async addProcedureToOrder(orderId: number, procedureId: number, quantityRequested: number = 1): Promise<MedicalOrderProcedure | null> {
    try {
      // Verificar se procedimento já existe
      const existing = await db
        .select()
        .from(medicalOrderProcedures)
        .where(and(
          eq(medicalOrderProcedures.orderId, orderId),
          eq(medicalOrderProcedures.procedureId, procedureId)
        ));

      if (existing.length > 0) {
        throw new Error("Procedimento já existe neste pedido");
      }

      // Verificar se é o primeiro procedimento (será o principal)
      const existingProcedures = await db
        .select()
        .from(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.orderId, orderId));

      const isMain = existingProcedures.length === 0;

      const [newProcedure] = await db
        .insert(medicalOrderProcedures)
        .values({
          orderId,
          procedureId,
          quantityRequested,
          status: 'em_analise',
          isMain
        })
        .returning();

      return newProcedure;
    } catch (error) {
      console.error("Erro ao adicionar procedimento:", error);
      return null;
    }
  }

  async removeProcedureFromOrder(procedureOrderId: number): Promise<boolean> {
    try {
      const procedure = await db
        .select()
        .from(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.id, procedureOrderId));

      if (procedure.length === 0) {
        return false;
      }

      const wasMain = procedure[0].isMain;
      const orderId = procedure[0].orderId;

      // Remover procedimento
      await db
        .delete(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.id, procedureOrderId));

      // Se era principal, promover outro procedimento
      if (wasMain) {
        const remainingProcedures = await db
          .select()
          .from(medicalOrderProcedures)
          .where(eq(medicalOrderProcedures.orderId, orderId));

        if (remainingProcedures.length > 0) {
          await db
            .update(medicalOrderProcedures)
            .set({ isMain: true })
            .where(eq(medicalOrderProcedures.id, remainingProcedures[0].id));
        }
      }

      return true;
    } catch (error) {
      console.error("Erro ao remover procedimento:", error);
      return false;
    }
  }

  // === GESTÃO DE CONDUTAS CIRÚRGICAS ===
  
  async updateOrderSurgicalApproaches(orderId: number, approaches: Array<{
    surgicalApproachId: number;
    isPrimary?: boolean;
    justificationUsed?: string;
    additionalNotes?: string;
  }>): Promise<void> {
    console.log(`=== Atualizando condutas cirúrgicas para pedido ${orderId} ===`);
    
    // Remover condutas existentes
    await db.delete(medicalOrderSurgicalApproaches).where(eq(medicalOrderSurgicalApproaches.medicalOrderId, orderId));
    
    // Inserir novas condutas
    if (approaches.length > 0) {
      const { medicalOrderSurgicalApproaches: moSA } = await import('@shared/schema');
      
      await db.insert(moSA).values(
        approaches.map(approach => ({
          medicalOrderId: orderId,
          surgicalApproachId: approach.surgicalApproachId,
          isPrimary: approach.isPrimary || false,
          justificationUsed: approach.justificationUsed || null,
          additionalNotes: approach.additionalNotes || null
        }))
      );
      
      console.log(`${approaches.length} condutas cirúrgicas atualizadas para pedido ${orderId}`);
    } else {
      console.log(`Nenhuma conduta cirúrgica para pedido ${orderId}`);
    }
  }

  // Limpar todos os relacionamentos de um pedido (incluindo procedimentos e condutas)
  async clearOrderRelations(orderId: number): Promise<void> {
    await Promise.all([
      db.delete(medicalOrderCids).where(eq(medicalOrderCids.orderId, orderId)),
      db.delete(medicalOrderOpmeItems).where(eq(medicalOrderOpmeItems.orderId, orderId)),
      db.delete(medicalOrderSuppliers).where(eq(medicalOrderSuppliers.orderId, orderId)),
      db.delete(medicalOrderProcedures).where(eq(medicalOrderProcedures.orderId, orderId)),
      db.delete(medicalOrderSurgicalApproaches).where(eq(medicalOrderSurgicalApproaches.medicalOrderId, orderId))
    ]);
  }
}

export const relationalOrderService = new RelationalOrderService();