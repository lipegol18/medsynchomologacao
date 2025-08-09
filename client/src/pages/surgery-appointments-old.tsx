import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calendar, Clock, User, Building, Stethoscope, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SurgeryAppointmentForm } from '@/components/surgery-appointment-form';
import { CalendarView } from '@/components/calendar-view';
import type { SurgeryAppointment } from '@shared/schema';

interface SurgeryAppointmentWithDetails extends SurgeryAppointment {
  medicalOrderTitle: string;
  medicalOrderProcedureType: string;
  medicalOrderComplexity: string;
  patientName: string;
  patientPhone: string;
  patientCns: string;
  hospitalName: string;
  hospitalCnes: string;
  doctorName: string;
  doctorCrm: string;
}

const statusColors = {
  agendado: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-green-100 text-green-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  concluido: 'bg-accent-light text-accent',
  cancelado: 'bg-red-100 text-red-800',
  reagendado: 'bg-purple-100 text-purple-800',
};

const statusLabels = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
};

const typeColors = {
  eletiva: 'bg-blue-100 text-blue-800',
  urgencia: 'bg-orange-100 text-orange-800',
  emergencia: 'bg-red-100 text-red-800',
};

const typeLabels = {
  eletiva: 'Eletiva',
  urgencia: 'Urgência',
  emergencia: 'Emergência',
};

export default function SurgeryAppointments() {
  const [selectedAppointment, setSelectedAppointment] = useState<SurgeryAppointmentWithDetails | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/surgery-appointments'],
    queryFn: async () => {
      const response = await fetch('/api/surgery-appointments');
      if (!response.ok) {
        throw new Error('Erro ao carregar agendamentos');
      }
      return response.json() as Promise<SurgeryAppointmentWithDetails[]>;
    },
  });

  const handleCreateAppointment = () => {
    setFormMode('create');
    setSelectedAppointment(null);
    setIsFormOpen(true);
  };

  const handleEditAppointment = (appointment: SurgeryAppointmentWithDetails) => {
    setFormMode('edit');
    setSelectedAppointment(appointment);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedAppointment(null);
    refetch();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const todayAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.scheduledDate);
    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.scheduledDate);
    const today = new Date();
    return appointmentDate > today;
  });

  const pastAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.scheduledDate);
    const today = new Date();
    return appointmentDate < today;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agenda Cirúrgica</h1>
          <p className="text-gray-600">Gerencie seus agendamentos de cirurgia</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateAppointment} className="flex items-center gap-2">
              <Plus size={20} />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {formMode === 'create' ? 'Novo Agendamento' : 'Editar Agendamento'}
              </DialogTitle>
            </DialogHeader>
            <SurgeryAppointmentForm
              appointment={selectedAppointment}
              mode={formMode}
              onClose={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realizados</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastAppointments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos ({appointments.length})</TabsTrigger>
          <TabsTrigger value="today">Hoje ({todayAppointments.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos ({upcomingAppointments.length})</TabsTrigger>
          <TabsTrigger value="past">Realizados ({pastAppointments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <AppointmentsList appointments={appointments} onEdit={handleEditAppointment} />
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
          <AppointmentsList appointments={todayAppointments} onEdit={handleEditAppointment} />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <AppointmentsList appointments={upcomingAppointments} onEdit={handleEditAppointment} />
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <AppointmentsList appointments={pastAppointments} onEdit={handleEditAppointment} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AppointmentsListProps {
  appointments: SurgeryAppointmentWithDetails[];
  onEdit: (appointment: SurgeryAppointmentWithDetails) => void;
}

function AppointmentsList({ appointments, onEdit }: AppointmentsListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calendar className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
          <p className="text-gray-600 text-center">
            Quando você criar agendamentos, eles aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-lg">{appointment.medicalOrderTitle}</CardTitle>
                  <Badge className={statusColors[appointment.status]}>
                    {statusLabels[appointment.status]}
                  </Badge>
                  <Badge className={typeColors[appointment.surgeryType]}>
                    {typeLabels[appointment.surgeryType]}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(appointment.scheduledDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatTime(appointment.scheduledTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Stethoscope size={14} />
                    {formatDuration(appointment.estimatedDuration)}
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(appointment)}
                  className="flex items-center gap-1"
                >
                  <Edit size={14} />
                  Editar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Paciente</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    {appointment.patientName}
                  </div>
                  {appointment.patientPhone && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs">📱</span>
                      {appointment.patientPhone}
                    </div>
                  )}
                  {appointment.patientCns && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🆔</span>
                      CNS: {appointment.patientCns}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Local</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Building size={14} />
                    {appointment.hospitalName || 'Hospital não informado'}
                  </div>
                  {appointment.surgeryRoom && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🏥</span>
                      {appointment.surgeryRoom}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {appointment.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-900 mb-1">Observações</h4>
                <p className="text-sm text-gray-600">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}