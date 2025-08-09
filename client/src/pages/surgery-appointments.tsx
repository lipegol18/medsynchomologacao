import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SurgeryAppointmentFormCompact } from '@/components/surgery-appointment-form-compact';
import { CalendarView } from '@/components/calendar-view';
import { ArrowLeft } from 'lucide-react';
import type { SurgeryAppointment } from '@shared/schema';

export default function SurgeryAppointments() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<SurgeryAppointment | null>(null);

  const { data: appointments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/surgery-appointments'],
    queryFn: async () => {
      const response = await fetch('/api/surgery-appointments');
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      return response.json() as Promise<SurgeryAppointment[]>;
    },
  });

  // Estado para armazenar o ID do pedido pré-selecionado
  const [preSelectedOrderId, setPreSelectedOrderId] = useState<number | null>(null);

  // Detectar se deve abrir o modal de criação automaticamente
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoCreate = urlParams.get('create');
    const orderId = urlParams.get('orderId');
    
    console.log('🔗 Parâmetros da URL detectados:', {
      currentUrl: window.location.href,
      autoCreate,
      orderId
    });
    
    if (autoCreate === 'true') {
      console.log('📝 Modal será aberto automaticamente');
      
      // Definir o pedido pré-selecionado se fornecido
      if (orderId) {
        const orderIdInt = parseInt(orderId);
        console.log('🎯 Definindo pedido pré-selecionado:', orderIdInt);
        setPreSelectedOrderId(orderIdInt);
      }
      
      // Abrir automaticamente o modal de criação
      setSelectedAppointment(null);
      setIsDialogOpen(true);
      
      // Limpar os parâmetros da URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      console.log('✅ Modal aberto e URL limpa');
    }
  }, []);

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setIsDialogOpen(true);
  };

  const handleEditAppointment = (appointment: SurgeryAppointment) => {
    setSelectedAppointment(appointment);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAppointment(null);
    setPreSelectedOrderId(null); // Limpar o ID pré-selecionado
  };

  const handleSuccess = () => {
    refetch();
    handleCloseDialog();
  };

  const handleUpdateAppointment = async (appointmentId: number, updates: Partial<SurgeryAppointment>) => {
    console.log('🔄 handleUpdateAppointment called:', { appointmentId, updates });
    
    try {
      const response = await fetch(`/api/surgery-appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      console.log('📡 API response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      const updatedAppointment = await response.json();
      console.log('✅ Appointment updated successfully:', updatedAppointment);

      // Atualiza a lista de agendamentos
      refetch();
    } catch (error) {
      console.error('❌ Error updating appointment:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando agendamentos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Erro ao carregar agendamentos</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Agenda Cirúrgica</h1>
            <p className="text-gray-600 mt-2">Gerencie seus agendamentos de cirurgia</p>
          </div>
        </div>
      </div>

      <CalendarView 
        appointments={appointments}
        onNewAppointment={handleCreateAppointment}
        onEditAppointment={handleEditAppointment}
        onUpdateAppointment={handleUpdateAppointment}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {selectedAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
          </DialogHeader>
          <SurgeryAppointmentFormCompact
            appointment={selectedAppointment}
            mode={selectedAppointment ? 'edit' : 'create'}
            preSelectedOrderId={preSelectedOrderId}
            onClose={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}