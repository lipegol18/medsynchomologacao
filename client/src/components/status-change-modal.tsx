import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Send, 
  Check, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Stethoscope
} from "lucide-react";

interface StatusOption {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  requiresModal?: boolean; // Para casos que precisam de modal adicional (aprovação parcial, valores recebidos)
}

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  currentStatus: string;
  currentStatusLabel: string;
  onStatusChange: (orderId: number, newStatus: string) => void;
  onPartialApproval?: (orderId: number) => void;
  onReceivedValues?: (orderId: number) => void;
  onEditOrder?: (order: any) => void;
  order?: any; // Adicionar objeto order completo
}

// Definição do workflow de estados com próximas etapas lógicas
const workflowSteps: Record<string, StatusOption[]> = {
  'em_preenchimento': [],
  'aguardando_envio': [
    { 
      key: 'em_avaliacao', 
      label: 'Em Análise', 
      description: 'Operadora está analisando o pedido médico', 
      icon: Clock, 
      color: 'text-blue-400' 
    },
    { 
      key: 'cancelado', 
      label: 'Cancelar Pedido', 
      description: 'Cancelar antes da análise da operadora', 
      icon: X, 
      color: 'text-red-400' 
    }
  ],
  'em_avaliacao': [
    { 
      key: 'aceito', 
      label: 'Autorizar Integralmente', 
      description: 'Operadora aprovou todos os itens do pedido', 
      icon: Check, 
      color: 'text-green-400' 
    },
    { 
      key: 'autorizado_parcial', 
      label: 'Autorização Parcial', 
      description: 'Operadora aprovou apenas alguns itens do pedido', 
      icon: CheckCircle, 
      color: 'text-purple-400',
      requiresModal: true
    },

    { 
      key: 'cancelado', 
      label: 'Negar Pedido', 
      description: 'Operadora recusou o pedido médico', 
      icon: X, 
      color: 'text-red-400' 
    }
  ],
  'aceito': [
    { 
      key: 'cirurgia_realizada', 
      label: 'Cirurgia Realizada', 
      description: 'Procedimento cirúrgico foi executado com sucesso', 
      icon: Stethoscope, 
      color: 'text-accent' 
    },
    { 
      key: 'cancelado', 
      label: 'Cancelar Cirurgia', 
      description: 'Cancelar cirurgia previamente agendada', 
      icon: X, 
      color: 'text-red-400' 
    }
  ],
  'autorizado_parcial': [
    { 
      key: 'cirurgia_realizada', 
      label: 'Cirurgia Realizada', 
      description: 'Procedimento cirúrgico foi executado com sucesso', 
      icon: Stethoscope, 
      color: 'text-accent' 
    },
    { 
      key: 'cancelado', 
      label: 'Cancelar Cirurgia', 
      description: 'Cancelar cirurgia previamente agendada', 
      icon: X, 
      color: 'text-red-400' 
    }
  ],

  'cirurgia_realizada': [
    { 
      key: 'recebido', 
      label: 'Marcar como Recebido', 
      description: 'Confirmar recebimento dos valores da operadora', 
      icon: DollarSign, 
      color: 'text-green-400',
      requiresModal: true
    }
  ]
};

export function StatusChangeModal({
  isOpen,
  onClose,
  orderId,
  currentStatus,
  currentStatusLabel,
  onStatusChange,
  onPartialApproval,
  onReceivedValues,
  onEditOrder,
  order
}: StatusChangeModalProps) {
  const availableOptions = workflowSteps[currentStatus] || [];

  const handleOptionClick = (option: StatusOption) => {
    if (option.requiresModal) {
      // Casos especiais que requerem modais adicionais
      if (option.key === 'autorizado_parcial' && onPartialApproval) {
        onPartialApproval(orderId);
      } else if (option.key === 'recebido' && onReceivedValues) {
        onReceivedValues(orderId);
      }
    } else {
      // Mudança direta de status
      onStatusChange(orderId, option.key);
    }
    onClose();
  };

  // Caso especial para pedidos incompletos
  if (currentStatus === 'em_preenchimento') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#1a2332] border-blue-800/50 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-blue-400">Pedido Incompleto #{orderId}</DialogTitle>
            <DialogDescription className="text-gray-300">
              Status atual: <span className="font-medium text-white">{currentStatusLabel}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <p className="text-lg text-white mb-2">Pedido Necessita Preenchimento</p>
            <p className="text-sm text-gray-400 mb-4">
              Este pedido não pode ser enviado para análise pois ainda está incompleto.
            </p>
            <p className="text-sm text-blue-300">
              Complete o preenchimento para que possa ser enviado para a operadora.
            </p>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-blue-800/30">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-900/30"
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                if (onEditOrder && order) {
                  onEditOrder(order);
                }
                onClose();
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Editar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (availableOptions.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#1a2332] border-blue-800/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-400">Status do Pedido #{orderId}</DialogTitle>
            <DialogDescription className="text-gray-300">
              Status atual: <span className="font-medium text-white">{currentStatusLabel}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <p className="text-lg text-white mb-2">Pedido Finalizado</p>
            <p className="text-sm text-gray-400">
              Este pedido atingiu seu estado final e não pode ser alterado.
            </p>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-blue-800/50 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-blue-400">Alterar Status do Pedido #{orderId}</DialogTitle>
          <DialogDescription className="text-gray-300">
            Status atual: <span className="font-medium text-white">{currentStatusLabel}</span>
            <br />
            Escolha a próxima etapa do processo:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {availableOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <Card 
                key={option.key}
                className="cursor-pointer border-blue-800/50 bg-[#1e293b]/80 hover:bg-blue-900/30 transition-colors"
                onClick={() => handleOptionClick(option)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <IconComponent className={`h-5 w-5 ${option.color} mt-1 flex-shrink-0`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{option.label}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{option.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="flex justify-end pt-4 border-t border-blue-800/30">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}