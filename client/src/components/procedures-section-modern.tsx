import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Plus, 
  Trash2, 
  FileText, 
  Package, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useOrderProcedures, useAddProcedure, useRemoveProcedure } from '@/hooks/use-modern-procedures';
import { toast } from '@/hooks/use-toast';

interface ProceduresSectionModernProps {
  currentOrderData: any;
  onOrderDataChange: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ProceduresSectionModern({ 
  currentOrderData, 
  onOrderDataChange, 
  onNext, 
  onPrevious 
}: ProceduresSectionModernProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcedureId, setSelectedProcedureId] = useState<number | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  // Usar nova API de procedimentos
  const { data: orderProcedures = [], isLoading, refetch } = useOrderProcedures(currentOrderData.id);
  const addProcedure = useAddProcedure();
  const removeProcedure = useRemoveProcedure();
  
  // Buscar procedimentos disponíveis
  const { data: availableProcedures = [] } = useQuery({
    queryKey: ['/api/procedures'],
    queryFn: () => fetch('/api/procedures').then(res => res.json()),
  });

  const filteredProcedures = availableProcedures.filter((proc: any) =>
    proc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProcedure = async () => {
    if (!selectedProcedureId) {
      toast({
        title: "Erro",
        description: "Selecione um procedimento",
        variant: "destructive",
      });
      return;
    }

    try {
      await addProcedure.mutateAsync({
        orderId: currentOrderData.id,
        procedureId: selectedProcedureId,
        quantityRequested: selectedQuantity,
      });
      
      setSelectedProcedureId(null);
      setSelectedQuantity(1);
      setSearchTerm('');
      
      toast({
        title: "Sucesso",
        description: "Procedimento adicionado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao adicionar procedimento",
        variant: "destructive",
      });
    }
  };

  const handleRemoveProcedure = async (procedureId: number) => {
    try {
      await removeProcedure.mutateAsync({ 
        procedureId, 
        orderId: currentOrderData.id 
      });
      
      toast({
        title: "Sucesso",
        description: "Procedimento removido com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao remover procedimento",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'negado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'parcial':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const mainProcedures = orderProcedures.filter(p => p.isMain);
  const secondaryProcedures = orderProcedures.filter(p => !p.isMain);

  return (
    <div className="space-y-6">
      {/* Procedimentos Selecionados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Procedimentos Selecionados
            <Badge variant="outline">{orderProcedures.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderProcedures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum procedimento selecionado</p>
              <p className="text-sm">Adicione procedimentos usando a busca abaixo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Procedimentos Principais */}
              {mainProcedures.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">PRINCIPAL</Badge>
                    {mainProcedures.length}
                  </h4>
                  <div className="space-y-2">
                    {mainProcedures.map((proc) => (
                      <div key={proc.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(proc.status)}
                            <span className="font-medium">{proc.procedure.code}</span>
                            <Badge variant="outline">{proc.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{proc.procedure.name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Qtd: {proc.quantityRequested}</span>
                            {proc.procedure.porte && <span>Porte: {proc.procedure.porte}</span>}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveProcedure(proc.id)}
                          disabled={removeProcedure.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedimentos Secundários */}
              {secondaryProcedures.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Badge variant="outline">SECUNDÁRIO</Badge>
                    {secondaryProcedures.length}
                  </h4>
                  <div className="space-y-2">
                    {secondaryProcedures.map((proc) => (
                      <div key={proc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(proc.status)}
                            <span className="font-medium">{proc.procedure.code}</span>
                            <Badge variant="outline">{proc.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{proc.procedure.name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Qtd: {proc.quantityRequested}</span>
                            {proc.procedure.porte && <span>Porte: {proc.procedure.porte}</span>}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveProcedure(proc.id)}
                          disabled={removeProcedure.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Busca e Adição de Procedimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Adicionar Procedimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Campo de busca */}
            <div>
              <Label htmlFor="procedure-search">Buscar Procedimento</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="procedure-search"
                  placeholder="Digite o nome ou código do procedimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Resultados da busca */}
            {searchTerm && (
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {filteredProcedures.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhum procedimento encontrado
                  </div>
                ) : (
                  filteredProcedures.slice(0, 10).map((procedure: any) => (
                    <div
                      key={procedure.id}
                      className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                        selectedProcedureId === procedure.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedProcedureId(procedure.id)}
                    >
                      <div className="font-medium">{procedure.code}</div>
                      <div className="text-sm text-muted-foreground">{procedure.name}</div>
                      {procedure.porte && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Porte: {procedure.porte}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Quantidade e botão adicionar */}
            {selectedProcedureId && (
              <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <Label>Procedimento Selecionado</Label>
                  <p className="text-sm font-medium">
                    {availableProcedures.find(p => p.id === selectedProcedureId)?.code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {availableProcedures.find(p => p.id === selectedProcedureId)?.name}
                  </p>
                </div>
                <div className="w-32">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button
                  onClick={handleAddProcedure}
                  disabled={addProcedure.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Justificativa Clínica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Justificativa Clínica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Descreva a justificativa clínica para os procedimentos solicitados..."
            value={currentOrderData.clinicalJustification || ''}
            onChange={(e) => onOrderDataChange({
              ...currentOrderData,
              clinicalJustification: e.target.value
            })}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Anterior
        </Button>
        <Button 
          onClick={onNext}
          disabled={orderProcedures.length === 0}
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}