import { useState } from 'react';
import { ManufacturerManager } from '@/components/ManufacturerManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ManufacturerDemo() {
  const [orderId, setOrderId] = useState<number>(205); // Usar pedido 205 como padrão que tem dados

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Demonstração - Sistema de Fabricantes
          </h1>
          <p className="text-gray-600">
            Gerenciamento de fabricantes por pedido médico com API completa (GET, POST, PUT, DELETE)
          </p>
        </div>

        {/* Seletor de Pedido */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selecionar Pedido Médico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="ID do pedido médico"
                  value={orderId}
                  onChange={(e) => setOrderId(parseInt(e.target.value) || 205)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setOrderId(205)}
                  size="sm"
                >
                  Pedido 205
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setOrderId(192)}
                  size="sm"
                >
                  Pedido 192
                </Button>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Pedidos de teste disponíveis: 205 (Luis Marcelo), 192 (outros pacientes)
            </div>
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recursos Implementados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Endpoints da API</h4>
                <div className="space-y-1 text-sm">
                  <Badge variant="outline" className="mr-2">GET</Badge>
                  <span>Listar fabricantes do pedido</span>
                  <br />
                  <Badge variant="outline" className="mr-2">POST</Badge>
                  <span>Adicionar fabricante individual</span>
                  <br />
                  <Badge variant="outline" className="mr-2">PUT</Badge>
                  <span>Atualização em lote (batch)</span>
                  <br />
                  <Badge variant="outline" className="mr-2">DELETE</Badge>
                  <span>Remover fabricante específico</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recursos do Sistema</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>✅ Autenticação obrigatória</div>
                  <div>✅ Validação de entrada de dados</div>
                  <div>✅ Constraint UNIQUE (evita duplicatas)</div>
                  <div>✅ Foreign key com CASCADE delete</div>
                  <div>✅ Transações para operações batch</div>
                  <div>✅ Cache invalidation automática</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estrutura da Tabela */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Estrutura da Tabela</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-white p-4 rounded-lg text-sm font-mono">
              <div className="text-green-400 mb-2">medical_order_supplier_manufacturers</div>
              <div className="ml-2 space-y-1">
                <div><span className="text-blue-400">id</span> <span className="text-yellow-400">SERIAL PRIMARY KEY</span></div>
                <div><span className="text-blue-400">order_id</span> <span className="text-yellow-400">INTEGER NOT NULL REFERENCES medical_orders(id) ON DELETE CASCADE</span></div>
                <div><span className="text-blue-400">manufacturer_name</span> <span className="text-yellow-400">TEXT NOT NULL</span></div>
                <div><span className="text-blue-400">created_at</span> <span className="text-yellow-400">TIMESTAMP DEFAULT NOW()</span></div>
                <div><span className="text-blue-400">updated_at</span> <span className="text-yellow-400">TIMESTAMP DEFAULT NOW()</span></div>
                <div className="mt-2 text-purple-400">UNIQUE (order_id, manufacturer_name)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Componente Principal */}
        <div className="flex justify-center">
          <ManufacturerManager orderId={orderId} />
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sistema MedSync - Gerenciamento Médico Inteligente</p>
          <p>Implementação completa do sistema de fabricantes por pedido médico</p>
        </div>
      </div>
    </div>
  );
}