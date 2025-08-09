import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Hash, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProcedureReceivedValue {
  id: number;
  code: string;
  name: string;
  quantityApproved: number;
  receivedValue: number;
  isMain: boolean;
}

interface ReceivedValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  onValuesComplete: () => void;
}

export function ReceivedValuesModal({ 
  isOpen, 
  onClose, 
  orderId, 
  onValuesComplete 
}: ReceivedValuesModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [procedureValues, setProcedureValues] = useState<ProcedureReceivedValue[]>([]);

  // Buscar procedimentos do pedido
  const { data: procedures, isLoading } = useQuery({
    queryKey: ['/api/medical-orders', orderId, 'procedures'],
    queryFn: () => apiRequest(`/api/medical-orders/${orderId}/procedures`, 'GET'),
    enabled: isOpen && !!orderId,
  });

  // Inicializar estado dos procedimentos quando carregarem
  useEffect(() => {
    if (procedures) {
      // Filtrar apenas procedimentos aprovados (excluir cancelados e negados)
      const approvedProcedures = procedures.filter((proc: any) => 
        proc.quantityApproved && 
        proc.quantityApproved > 0 && 
        proc.status === 'aprovado'
      );
      
      const initialValues: ProcedureReceivedValue[] = approvedProcedures.map((proc: any) => ({
        id: proc.id,
        code: proc.code,
        name: proc.name,
        quantityApproved: proc.quantityApproved || proc.quantityRequested,
        receivedValue: proc.receivedValue || 0,
        isMain: proc.isMain || false,
      }));
      
      setProcedureValues(initialValues);
    }
  }, [procedures]);

  // Atualizar valor recebido de um procedimento
  const handleReceivedValueChange = (procedureId: number, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setProcedureValues(prev =>
      prev.map(proc =>
        proc.id === procedureId
          ? { ...proc, receivedValue: numericValue }
          : proc
      )
    );
  };

  // Mutation para salvar valores recebidos
  const saveMutation = useMutation({
    mutationFn: async (values: ProcedureReceivedValue[]) => {
      const updates = values.map(proc => ({
        procedureId: proc.id,
        receivedValue: proc.receivedValue,
      }));

      return apiRequest(`/api/medical-orders/${orderId}/received-values`, 'PUT', {
        procedures: updates,
      });
    },
    onSuccess: () => {
      toast({
        title: "Valores recebidos atualizados",
        description: "Os valores recebidos dos procedimentos foram salvos com sucesso.",
      });
      
      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId] });
      
      onValuesComplete();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Não foi possível salvar os valores recebidos.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(procedureValues);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalReceivedValue = procedureValues.reduce((total, proc) => 
    total + (proc.receivedValue * proc.quantityApproved), 0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a2332] border border-blue-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-green-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">
                Valores Recebidos dos Procedimentos
              </h2>
              <p className="text-blue-400/80 text-sm">
                Informe o valor unitário recebido para cada procedimento aprovado
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-blue-400/80 mt-2">Carregando procedimentos...</p>
          </div>
        ) : procedureValues.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-blue-400/80">Nenhum procedimento aprovado encontrado.</p>
          </div>
        ) : (
          <>
            {/* Lista de procedimentos aprovados */}
            <div className="space-y-4 mb-6">
              {procedureValues.map((procedure) => (
                <div 
                  key={procedure.id}
                  className="bg-[#0f1419] border border-blue-800/50 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Código e Principal */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-300 font-mono text-sm">
                          {procedure.code}
                        </span>
                      </div>
                      {procedure.isMain && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">
                          Principal
                        </span>
                      )}
                    </div>

                    {/* Nome do procedimento */}
                    <div className="lg:col-span-5">
                      <p className="text-white font-medium text-sm leading-relaxed">
                        {procedure.name}
                      </p>
                    </div>

                    {/* Quantidade aprovada */}
                    <div className="lg:col-span-2">
                      <Label className="text-blue-400/80 text-xs">Quantidade Aprovada</Label>
                      <div className="bg-[#1a2332] border border-blue-800/50 rounded px-3 py-2 mt-1">
                        <span className="text-white font-medium">{procedure.quantityApproved}</span>
                      </div>
                    </div>

                    {/* Valor unitário recebido */}
                    <div className="lg:col-span-3">
                      <Label className="text-blue-400/80 text-xs">Valor Unitário Recebido</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={procedure.receivedValue || ''}
                        onChange={(e) => handleReceivedValueChange(procedure.id, e.target.value)}
                        className="bg-[#1a2332] border-blue-800/50 text-white placeholder-gray-500 mt-1"
                      />
                      {procedure.receivedValue > 0 && (
                        <p className="text-green-400 text-xs mt-1">
                          Total: {formatCurrency(procedure.receivedValue * procedure.quantityApproved)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo Total */}
            <div className="bg-[#0f1419] border border-green-600/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-green-400 font-medium">
                  Valor Total Recebido:
                </span>
                <span className="text-white font-bold text-lg">
                  {formatCurrency(totalReceivedValue)}
                </span>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-blue-800 text-blue-400 hover:bg-blue-800/20"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saveMutation.isPending ? "Salvando..." : "Salvar Valores"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}