import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useOrderProcedures, useAddProcedure, useRemoveProcedure, type ModernProcedure } from '@/hooks/use-modern-procedures';
import { useToast } from '@/hooks/use-toast';

interface ModernProceduresManagerProps {
  orderId: number;
  onProceduresChange?: () => void;
}

export function ModernProceduresManager({ orderId, onProceduresChange }: ModernProceduresManagerProps) {
  const { data: procedures = [], isLoading, refetch } = useOrderProcedures(orderId);
  const addProcedure = useAddProcedure();
  const removeProcedure = useRemoveProcedure();
  const { toast } = useToast();
  
  const [newProcedureId, setNewProcedureId] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);

  const handleAddProcedure = async () => {
    if (!newProcedureId) {
      toast({
        title: "Erro",
        description: "Selecione um procedimento",
        variant: "destructive",
      });
      return;
    }

    try {
      await addProcedure.mutateAsync({
        orderId,
        procedureId: parseInt(newProcedureId),
        quantityRequested: newQuantity,
      });
      
      setNewProcedureId('');
      setNewQuantity(1);
      onProceduresChange?.();
      
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
      await removeProcedure.mutateAsync({ procedureId, orderId });
      onProceduresChange?.();
      
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'negado':
        return 'bg-red-100 text-red-800';
      case 'parcial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando procedimentos...</div>;
  }

  const mainProcedures = procedures.filter(p => p.isMain);
  const secondaryProcedures = procedures.filter(p => !p.isMain);

  return (
    <div className="space-y-6">
      {/* Procedimentos Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Procedimentos Principais
            <Badge variant="outline">{mainProcedures.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mainProcedures.length === 0 ? (
            <p className="text-muted-foreground">Nenhum procedimento principal</p>
          ) : (
            <div className="space-y-3">
              {mainProcedures.map((proc) => (
                <div key={proc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-800">PRINCIPAL</Badge>
                      {getStatusIcon(proc.status)}
                      <Badge className={getStatusColor(proc.status)}>
                        {proc.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="font-medium">{proc.procedure.code}</p>
                    <p className="text-sm text-muted-foreground">{proc.procedure.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span>Solicitado: {proc.quantityRequested}</span>
                      {proc.quantityApproved && (
                        <span>Aprovado: {proc.quantityApproved}</span>
                      )}
                      {proc.procedure.porte && (
                        <span>Porte: {proc.procedure.porte}</span>
                      )}
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
          )}
        </CardContent>
      </Card>

      {/* Procedimentos Secundários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Procedimentos Secundários
            <Badge variant="outline">{secondaryProcedures.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {secondaryProcedures.length === 0 ? (
            <p className="text-muted-foreground">Nenhum procedimento secundário</p>
          ) : (
            <div className="space-y-3">
              {secondaryProcedures.map((proc) => (
                <div key={proc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">SECUNDÁRIO</Badge>
                      {getStatusIcon(proc.status)}
                      <Badge className={getStatusColor(proc.status)}>
                        {proc.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="font-medium">{proc.procedure.code}</p>
                    <p className="text-sm text-muted-foreground">{proc.procedure.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span>Solicitado: {proc.quantityRequested}</span>
                      {proc.quantityApproved && (
                        <span>Aprovado: {proc.quantityApproved}</span>
                      )}
                      {proc.procedure.porte && (
                        <span>Porte: {proc.procedure.porte}</span>
                      )}
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
          )}
        </CardContent>
      </Card>

      {/* Adicionar Novo Procedimento */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Procedimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="newProcedureId">ID do Procedimento</Label>
              <Input
                id="newProcedureId"
                type="number"
                value={newProcedureId}
                onChange={(e) => setNewProcedureId(e.target.value)}
                placeholder="Digite o ID do procedimento"
              />
            </div>
            <div className="w-32">
              <Label htmlFor="newQuantity">Quantidade</Label>
              <Input
                id="newQuantity"
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button
              onClick={handleAddProcedure}
              disabled={addProcedure.isPending || !newProcedureId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{mainProcedures.length}</div>
              <div className="text-sm text-muted-foreground">Principais</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{secondaryProcedures.length}</div>
              <div className="text-sm text-muted-foreground">Secundários</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {procedures.filter(p => p.status === 'em_analise').length}
              </div>
              <div className="text-sm text-muted-foreground">Em Análise</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {procedures.reduce((sum, p) => sum + p.quantityRequested, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Solicitado</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}