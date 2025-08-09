import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Building, User, Stethoscope, AlertCircle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { DropdownList } from '@/components/ui/dropdown-list';
import { BrazilianDateInput } from '@/components/ui/brazilian-date-input';
import { BrazilianTimeInput } from '@/components/ui/brazilian-time-input';
import type { SurgeryAppointment, InsertSurgeryAppointment } from '@shared/schema';

// Schema para validação do formulário
const surgeryAppointmentFormSchema = z.object({
  medicalOrderId: z.number().min(1, 'Selecione um pedido médico'),
  hospitalId: z.number().nullable().optional(),
  scheduledDate: z.string().min(1, 'Data é obrigatória'),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de horário inválido (HH:MM)'),
  estimatedDuration: z.number().min(15, 'Duração mínima é 15 minutos').max(720, 'Duração máxima é 12 horas'),
  surgeryType: z.enum(['eletiva', 'urgencia']),
  status: z.enum(['agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'reagendado']),
  surgeryRoom: z.string().optional(),
  preOperativeNotes: z.string().optional(),
  priority: z.number().min(1).max(4),
  notes: z.string().optional(),
  cancellationReason: z.string().optional(),
});

type SurgeryAppointmentFormData = z.infer<typeof surgeryAppointmentFormSchema>;

interface SurgeryAppointmentWithDetails extends SurgeryAppointment {
  medicalOrderTitle: string;
  medicalOrderProcedureType: string;
  medicalOrderComplexity: string;
  patientName: string;
  patientPhone: string;
  hospitalName: string;
  hospitalCnes: string;
  doctorName: string;
  doctorCrm: string;
}

interface AvailableOrder {
  id: number;
  patientId: number;
  patientName: string;
  patientPhone: string | null;
  hospitalId: number | null;
  hospitalName: string | null;
  procedureType: string | null;
  procedureLaterality: string | null;
  statusId: number;
  createdAt: string;
  procedureDate: string | null;
}

interface SurgeryAppointmentFormProps {
  appointment?: SurgeryAppointmentWithDetails | null;
  mode: 'create' | 'edit';
  preSelectedOrderId?: number | null;
  onClose: () => void;
}

export function SurgeryAppointmentFormCompact({ appointment, mode, preSelectedOrderId, onClose }: SurgeryAppointmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | null>(null);
  const [actualMode, setActualMode] = useState<'create' | 'edit'>(mode);
  const [existingAppointment, setExistingAppointment] = useState<SurgeryAppointmentWithDetails | null>(appointment || null);

  // Log inicial para verificar se o componente está recebendo os props corretos
  console.log('🚀 SurgeryAppointmentFormCompact inicializado:', {
    mode,
    preSelectedOrderId,
    appointment
  });
  
  // Buscar pedidos médicos disponíveis para agendamento
  const { data: availableOrders = [], isLoading: isLoadingOrders, error } = useQuery({
    queryKey: ['/api/surgery-appointments/available-orders'],
    enabled: actualMode === 'create',
    queryFn: async () => {
      const response = await fetch('/api/surgery-appointments/available-orders', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    }
  });

  // Verificar se já existe agendamento para o pedido médico pré-selecionado
  const { data: existingAppointmentData, isLoading: isCheckingExisting } = useQuery({
    queryKey: ['/api/surgery-appointments/by-medical-order', preSelectedOrderId],
    enabled: !!preSelectedOrderId && mode === 'create',
    queryFn: async () => {
      const response = await fetch(`/api/surgery-appointments/by-medical-order/${preSelectedOrderId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Nenhum agendamento encontrado
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    }
  });

  const form = useForm<SurgeryAppointmentFormData>({
    resolver: zodResolver(surgeryAppointmentFormSchema),
    defaultValues: {
      medicalOrderId: (existingAppointment?.medicalOrderId || appointment?.medicalOrderId || preSelectedOrderId || 0),
      hospitalId: (existingAppointment?.hospitalId || appointment?.hospitalId || null),
      scheduledDate: existingAppointment?.scheduledDate ? new Date(existingAppointment.scheduledDate).toISOString().split('T')[0] : 
                    appointment?.scheduledDate ? new Date(appointment.scheduledDate).toISOString().split('T')[0] : '',
      scheduledTime: existingAppointment?.scheduledTime || appointment?.scheduledTime || '',
      estimatedDuration: existingAppointment?.estimatedDuration || appointment?.estimatedDuration || 120,
      surgeryType: existingAppointment?.surgeryType || appointment?.surgeryType || 'eletiva',
      status: existingAppointment?.status || appointment?.status || 'agendado',
      surgeryRoom: existingAppointment?.surgeryRoom || appointment?.surgeryRoom || '',
      preOperativeNotes: existingAppointment?.preOperativeNotes || appointment?.preOperativeNotes || '',
      priority: existingAppointment?.priority || appointment?.priority || 1,
      notes: existingAppointment?.notes || appointment?.notes || '',
      cancellationReason: existingAppointment?.cancellationReason || appointment?.cancellationReason || '',
    },
  });

  // Verificar se existe agendamento e alterar modo automaticamente
  useEffect(() => {
    if (existingAppointmentData && preSelectedOrderId && mode === 'create') {
      console.log('🔄 Agendamento existente encontrado, mudando para modo edit:', existingAppointmentData);
      setActualMode('edit');
      setExistingAppointment(existingAppointmentData);
      
      // Atualizar título do modal
      const titleElement = document.getElementById('appointment-modal-title');
      if (titleElement) {
        titleElement.textContent = 'Reagendar Cirurgia';
      }
      
      // Preencher formulário com dados existentes
      form.reset({
        medicalOrderId: existingAppointmentData.medicalOrderId,
        hospitalId: existingAppointmentData.hospitalId,
        scheduledDate: new Date(existingAppointmentData.scheduledDate).toISOString().split('T')[0],
        scheduledTime: existingAppointmentData.scheduledTime,
        estimatedDuration: existingAppointmentData.estimatedDuration,
        surgeryType: existingAppointmentData.surgeryType,
        status: existingAppointmentData.status,
        surgeryRoom: existingAppointmentData.surgeryRoom || '',
        preOperativeNotes: existingAppointmentData.preOperativeNotes || '',
        priority: existingAppointmentData.priority,
        notes: existingAppointmentData.notes || '',
        cancellationReason: existingAppointmentData.cancellationReason || '',
      });

      toast({
        title: "Reagendamento",
        description: "Agendamento existente encontrado. Você pode editar os dados abaixo.",
      });
    }
  }, [existingAppointmentData, preSelectedOrderId, mode, form, toast]);

  // Inicializar selectedOrder quando os dados são carregados
  useEffect(() => {
    console.log('🔍 Formulário - useEffect executado:', {
      actualMode,
      availableOrdersLength: availableOrders.length,
      preSelectedOrderId,
      availableOrders
    });
    
    if (actualMode === 'create' && availableOrders.length > 0) {
      if (preSelectedOrderId) {
        console.log('🎯 Buscando pedido pré-selecionado:', preSelectedOrderId);
        const preSelectedOrder = availableOrders.find(o => o.id === preSelectedOrderId);
        console.log('🎯 Pedido encontrado:', preSelectedOrder);
        
        if (preSelectedOrder) {
          setSelectedOrder(preSelectedOrder);
          form.setValue('medicalOrderId', preSelectedOrderId);
          console.log('✅ Pedido médico pré-selecionado:', preSelectedOrderId);
          return;
        } else {
          console.log('❌ Pedido pré-selecionado não encontrado na lista');
        }
      }
      
      const selectedOrderId = form.getValues('medicalOrderId');
      if (selectedOrderId) {
        const order = availableOrders.find(o => o.id === selectedOrderId);
        if (order) {
          setSelectedOrder(order);
        }
      }
    }
  }, [availableOrders, actualMode, preSelectedOrderId, form]);

  // Mutation para criar agendamento
  const createMutation = useMutation({
    mutationFn: async (data: SurgeryAppointmentFormData) => {
      const payload: InsertSurgeryAppointment = {
        ...data,
        patientId: selectedOrder?.patientId || 1,
        scheduledDate: new Date(`${data.scheduledDate}T${data.scheduledTime}:00`),
        hospitalId: data.hospitalId || null,
        // doctorId será definido pelo backend usando req.user.id
        // createdBy será definido pelo backend usando req.user.id
      };

      return apiRequest('/api/surgery-appointments', 'POST', payload);
    },
    onSuccess: () => {
      toast({
        title: 'Agendamento criado',
        description: 'O agendamento foi criado com sucesso.',
      });
      // Invalidar múltiplas queries para atualizar todas as interfaces
      queryClient.invalidateQueries({ queryKey: ['/api/surgery-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/surgery-appointments/available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      // Invalidar query específica do pedido médico se disponível
      if (selectedOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/surgery-appointments/by-medical-order', selectedOrder.id] });
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar agendamento
  const updateMutation = useMutation({
    mutationFn: async (data: SurgeryAppointmentFormData) => {
      const payload = {
        ...data,
        scheduledDate: new Date(`${data.scheduledDate}T${data.scheduledTime}:00`),
        hospitalId: data.hospitalId || null,
      };

      const appointmentId = existingAppointment?.id || appointment?.id;
      return apiRequest(`/api/surgery-appointments/${appointmentId}`, 'PUT', payload);
    },
    onSuccess: () => {
      toast({
        title: 'Agendamento atualizado',
        description: 'O agendamento foi atualizado com sucesso.',
      });
      // Invalidar múltiplas queries para atualizar todas as interfaces
      queryClient.invalidateQueries({ queryKey: ['/api/surgery-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/surgery-appointments/available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      // Invalidar query específica do pedido médico
      const orderId = existingAppointment?.medicalOrderId || appointment?.medicalOrderId;
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['/api/surgery-appointments/by-medical-order', orderId] });
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar agendamento',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SurgeryAppointmentFormData) => {
    if (actualMode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isCheckingExisting;

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">

          {/* Seleção do pedido médico e hospital - Layout ultra compacto */}
          {mode === 'create' && (
            <Card className="border-blue-200">
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Stethoscope className="h-4 w-4" />
                  Selecionar Pedido Médico
                </CardTitle>
                <CardDescription className="text-xs">
                  Escolha o pedido médico para o qual deseja agendar a cirurgia
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-1 pb-2">
                <div className="grid grid-cols-2 gap-1">
                  <FormField
                    control={form.control}
                    name="medicalOrderId"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-xs font-medium">Pedido Médico</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const orderId = parseInt(value);
                            field.onChange(orderId);
                            const order = availableOrders.find(o => o.id === orderId);
                            if (order) {
                              setSelectedOrder(order);
                            }
                          }}
                          value={field.value ? field.value.toString() : ''}
                          disabled={isLoadingOrders}
                        >
                          <FormControl>
                            <SelectTrigger className="h-7">
                              <SelectValue placeholder="Selecione um pedido" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingOrders ? (
                              <SelectItem value="loading" disabled>
                                Carregando...
                              </SelectItem>
                            ) : availableOrders.length > 0 ? (
                              availableOrders.map((order) => (
                                <SelectItem key={order.id} value={order.id.toString()}>
                                  #{order.id} - {order.patientName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-orders" disabled>
                                Nenhum pedido disponível
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-0">
                    <FormLabel className="text-xs font-medium">Hospital</FormLabel>
                    <div className="flex items-center gap-2 p-1 border rounded-md bg-muted/10 h-7">
                      {selectedOrder ? (
                        <>
                          <span className="text-xs">🏥</span>
                          <span className="font-medium text-xs truncate">{selectedOrder.hospitalName}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">Selecione pedido primeiro</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Layout principal - Grid 2x2 com layout super compacto */}
          <div className="grid grid-cols-2 gap-2">
            {/* Coluna 1: Informações do Agendamento */}
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Informações do Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0 pb-2">
                {/* Data e Horário */}
                <div className="grid grid-cols-2 gap-1">
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-xs font-medium">Data da Cirurgia</FormLabel>
                        <FormControl>
                          <BrazilianDateInput 
                            className="h-7 text-xs" 
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="dd/mm/aaaa"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduledTime"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-xs font-medium">Horário</FormLabel>
                        <FormControl>
                          <BrazilianTimeInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="HH:MM"
                            className="h-7 text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Duração, Tipo e Status */}
                <div className="grid grid-cols-3 gap-1">
                  <FormField
                    control={form.control}
                    name="estimatedDuration"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-xs font-medium">Duração (min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={15}
                            max={720}
                            step={15}
                            className="h-7 text-xs"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surgeryType"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-xs font-medium">Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-7">
                              <SelectValue placeholder="Eletiva" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="eletiva">Eletiva</SelectItem>
                            <SelectItem value="urgencia">Urgência</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-xs font-medium">Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-7">
                              <SelectValue placeholder="Agendado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="agendado">Agendado</SelectItem>
                            <SelectItem value="confirmado">Confirmado</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                            <SelectItem value="reagendado">Reagendado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Prioridade e Sala */}
                <div className="grid grid-cols-2 gap-1">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-xs font-medium">Prioridade</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString() || '1'}
                        >
                          <FormControl>
                            <SelectTrigger className="h-7">
                              <SelectValue placeholder="Baixa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Baixa</SelectItem>
                            <SelectItem value="2">Média</SelectItem>
                            <SelectItem value="3">Alta</SelectItem>
                            <SelectItem value="4">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surgeryRoom"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-xs font-medium">Sala Cirúrgica</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Sala 1" className="h-7 text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coluna 2: Observações */}
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0 pb-2">
                <FormField
                  control={form.control}
                  name="preOperativeNotes"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-xs font-medium">Observações Pré-operatórias</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Instruções, preparativos..."
                          className="min-h-[45px] resize-none text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-xs font-medium">Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Informações adicionais..."
                          className="min-h-[45px] resize-none text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campo de cancelamento só aparece se status for cancelado */}
                {form.watch('status') === 'cancelado' && (
                  <FormField
                    control={form.control}
                    name="cancellationReason"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-medium">Motivo do Cancelamento</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva o motivo do cancelamento..."
                            className="min-h-[50px] resize-none text-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Botões de ação - Compactos */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} size="sm">
              <Save className="h-4 w-4 mr-1" />
              {isLoading 
                ? (mode === 'create' ? 'Criando...' : 'Atualizando...')
                : (mode === 'create' ? 'Criar Agendamento' : 'Atualizar Agendamento')
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}