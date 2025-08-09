import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Manufacturer {
  id: number;
  orderId: number;
  priority: number;
  supplierId?: number;
  manufacturerName: string;
  createdAt: string;
  updatedAt: string;
}

interface ManufacturerManagerProps {
  orderId: number;
}

export function ManufacturerManager({ orderId }: ManufacturerManagerProps) {
  const [manufacturer1, setManufacturer1] = useState('');
  const [manufacturer2, setManufacturer2] = useState('');
  const [manufacturer3, setManufacturer3] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar fabricantes do pedido
  const { data: manufacturers = [], isLoading, error } = useQuery<Manufacturer[]>({
    queryKey: ['/api/medical-orders', orderId, 'manufacturers'],
    queryFn: async () => {
      const response = await fetch(`/api/medical-orders/${orderId}/manufacturers`);
      if (!response.ok) {
        throw new Error('Erro ao buscar fabricantes');
      }
      return response.json();
    },
    enabled: !!orderId
  });

  // Carregar dados existentes nos campos quando recebidos
  useEffect(() => {
    if (manufacturers.length > 0) {
      const manufacturersByPriority = manufacturers.sort((a, b) => a.priority - b.priority);
      
      setManufacturer1(manufacturersByPriority.find(m => m.priority === 1)?.manufacturerName || '');
      setManufacturer2(manufacturersByPriority.find(m => m.priority === 2)?.manufacturerName || '');
      setManufacturer3(manufacturersByPriority.find(m => m.priority === 3)?.manufacturerName || '');
    }
  }, [manufacturers]);

  // Mutation para salvar todos os fabricantes (batch update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const manufacturersToSave = [];
      
      if (manufacturer1.trim()) {
        manufacturersToSave.push({ manufacturerName: manufacturer1.trim(), priority: 1 });
      }
      if (manufacturer2.trim()) {
        manufacturersToSave.push({ manufacturerName: manufacturer2.trim(), priority: 2 });
      }
      if (manufacturer3.trim()) {
        manufacturersToSave.push({ manufacturerName: manufacturer3.trim(), priority: 3 });
      }

      const response = await fetch(`/api/medical-orders/${orderId}/manufacturers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manufacturers: manufacturersToSave })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar fabricantes');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId, 'manufacturers'] });
      toast({
        title: 'Sucesso',
        description: 'Fabricantes salvos com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar fabricantes',
        variant: 'destructive',
      });
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleClear = () => {
    setManufacturer1('');
    setManufacturer2('');
    setManufacturer3('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fabricantes - Carregando...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Carregando fabricantes...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fabricantes - Erro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">Erro ao carregar fabricantes</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fabricantes por Prioridade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fabricante Prioridade 1 */}
        <div className="space-y-2">
          <Label htmlFor="manufacturer1">Fabricante 1 (Prioridade Alta)</Label>
          <Input
            id="manufacturer1"
            value={manufacturer1}
            onChange={(e) => setManufacturer1(e.target.value)}
            placeholder="Digite o nome do fabricante de prioridade 1"
          />
        </div>

        {/* Fabricante Prioridade 2 */}
        <div className="space-y-2">
          <Label htmlFor="manufacturer2">Fabricante 2 (Prioridade Média)</Label>
          <Input
            id="manufacturer2"
            value={manufacturer2}
            onChange={(e) => setManufacturer2(e.target.value)}
            placeholder="Digite o nome do fabricante de prioridade 2"
          />
        </div>

        {/* Fabricante Prioridade 3 */}
        <div className="space-y-2">
          <Label htmlFor="manufacturer3">Fabricante 3 (Prioridade Baixa)</Label>
          <Input
            id="manufacturer3"
            value={manufacturer3}
            onChange={(e) => setManufacturer3(e.target.value)}
            placeholder="Digite o nome do fabricante de prioridade 3"
          />
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Fabricantes'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleClear}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Limpar Campos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}