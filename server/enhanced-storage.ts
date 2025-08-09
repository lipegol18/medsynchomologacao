import { storage } from './storage';
import { relationalOrderService } from './relational-services';
import { type InsertMedicalOrder, type MedicalOrder } from '@shared/schema';

export class EnhancedOrderStorage {
  
  async createMedicalOrderWithRelations(
    orderData: InsertMedicalOrder,
    relations: {
      cidIds?: number[];
      opmeItems?: { id: number; quantity: number }[];
      supplierIds?: number[];
    }
  ): Promise<MedicalOrder> {
    
    // Criar o pedido básico
    const newOrder = await storage.createMedicalOrder(orderData);
    
    // Adicionar relacionamentos se fornecidos
    if (relations.cidIds && relations.cidIds.length > 0) {
      await relationalOrderService.updateOrderCids(newOrder.id, relations.cidIds);
    }
    
    if (relations.opmeItems && relations.opmeItems.length > 0) {
      await relationalOrderService.updateOrderOpmeItems(newOrder.id, relations.opmeItems);
    }
    
    if (relations.supplierIds && relations.supplierIds.length > 0) {
      await relationalOrderService.updateOrderSuppliers(newOrder.id, relations.supplierIds);
    }
    
    return newOrder;
  }
  
  async updateMedicalOrderWithRelations(
    orderId: number,
    orderData: Partial<InsertMedicalOrder>,
    relations?: {
      cidIds?: number[];
      opmeItems?: { id: number; quantity: number }[];
      supplierIds?: number[];
    }
  ): Promise<MedicalOrder | undefined> {
    
    // Atualizar dados básicos do pedido
    const updatedOrder = await storage.updateMedicalOrder(orderId, orderData);
    
    // Atualizar relacionamentos se fornecidos
    if (relations) {
      if (relations.cidIds !== undefined) {
        await relationalOrderService.updateOrderCids(orderId, relations.cidIds);
      }
      
      if (relations.opmeItems !== undefined) {
        await relationalOrderService.updateOrderOpmeItems(orderId, relations.opmeItems);
      }
      
      if (relations.supplierIds !== undefined) {
        await relationalOrderService.updateOrderSuppliers(orderId, relations.supplierIds);
      }
    }
    
    return updatedOrder;
  }
  
  async getMedicalOrderWithRelations(orderId: number): Promise<{
    order: MedicalOrder | undefined;
    cidIds: number[];
    opmeItems: { opmeItemId: number; quantity: number }[];
    supplierIds: number[];
  } | undefined> {
    
    const order = await storage.getMedicalOrder(orderId);
    if (!order) return undefined;
    
    const [cidIds, opmeItems, supplierIds] = await Promise.all([
      relationalOrderService.getOrderCids(orderId),
      relationalOrderService.getOrderOpmeItems(orderId),
      relationalOrderService.getOrderSuppliers(orderId)
    ]);
    
    return {
      order,
      cidIds,
      opmeItems,
      supplierIds
    };
  }
}

export const enhancedOrderStorage = new EnhancedOrderStorage();