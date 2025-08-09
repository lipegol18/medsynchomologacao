import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface ModernProcedure {
  id: number;
  orderId: number;
  procedureId: number;
  quantityRequested: number;
  quantityApproved?: number;
  status: string;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
  procedure: {
    id: number;
    code: string;
    name: string;
    description?: string;
    porte?: string;
    custoOperacional?: number;
    porteAnestesista?: string;
    numeroAuxiliares?: number;
  };
}

// Hook para buscar procedimentos de um pedido
export function useOrderProcedures(orderId: number) {
  return useQuery<ModernProcedure[]>({
    queryKey: ['/api/orders', orderId, 'procedures'],
    enabled: !!orderId,
  });
}

// Hook para adicionar procedimento
export function useAddProcedure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, procedureId, quantityRequested = 1 }: {
      orderId: number;
      procedureId: number;
      quantityRequested?: number;
    }) => {
      return apiRequest(`/api/orders/${orderId}/procedures`, {
        method: 'POST',
        body: JSON.stringify({ procedureId, quantityRequested }),
      });
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'procedures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId] });
    },
  });
}

// Hook para remover procedimento
export function useRemoveProcedure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ procedureId, orderId }: { procedureId: number; orderId: number }) => {
      return apiRequest(`/api/procedures/${procedureId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'procedures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId] });
    },
  });
}

// Hook para atualização em lote de aprovações
export function useBulkUpdateApprovals() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: number; quantityApproved: number; status: string }>) => {
      return apiRequest('/api/procedures/bulk-approval', {
        method: 'PUT',
        body: JSON.stringify({ updates }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
    },
  });
}

// Hook para relatório de aprovações
export function useApprovalReport(hospitalId?: number) {
  return useQuery({
    queryKey: ['/api/procedures/reports/approvals', hospitalId],
    queryFn: () => apiRequest(`/api/reports/approvals${hospitalId ? `?hospitalId=${hospitalId}` : ''}`),
  });
}