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
  title: string;
  procedureType: string;
  procedureLaterality: string;
  complexity: string;
  statusId: number;
  patientId: number;
  patientName: string;
  patientPhone: string;
  hospitalId: number;
  hospitalName: string;
  hospitalCnes: string;
  createdAt: string;
}

interface SurgeryAppointmentFormProps {
  appointment?: SurgeryAppointmentWithDetails | null;
  mode: 'create' | 'edit';
  preSelectedOrderId?: number | null;
  onClose: () => void;
}

export function SurgeryAppointmentForm({ appointment, mode, preSelectedOrderId, onClose }: SurgeryAppointmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | null>(null);
  
  console.log('SurgeryAppointmentForm renderizado:', { mode, appointment });
  console.log('Query enabled:', mode === 'create');
  console.log('selectedOrder atual:', selectedOrder);

  // Buscar pedidos médicos disponíveis para agendamento
  const { data: availableOrders = [], isLoading: isLoadingOrders, error } = useQuery({
    queryKey: ['/api/surgery-appointments/available-orders'],
    enabled: mode === 'create',
    queryFn: async () => {
      console.log('Fazendo requisição para /api/surgery-appointments/available-orders');
      const response = await fetch('/api/surgery-appointments/available-orders', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Erro na requisição:', response.status, response.statusText);
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Dados recebidos:', data);
      return data;
    }
  });

  // Debug para verificar se há erros
  useEffect(() => {
    if (mode === 'create') {
      console.log('Modo criação ativado - buscando pedidos disponíveis...');
    }
    if (error) {
      console.error('Erro ao buscar pedidos disponíveis:', error);
    }
    if (availableOrders.length > 0) {
      console.log('Pedidos disponíveis carregados:', availableOrders);
    } else if (mode === 'create' && !isLoadingOrders) {
      console.log('Nenhum pedido disponível encontrado');
    }
  }, [error, availableOrders, mode, isLoadingOrders]);

  const form = useForm<SurgeryAppointmentFormData>({
    resolver: zodResolver(surgeryAppointmentFormSchema),
    defaultValues: {
      medicalOrderId: appointment?.medicalOrderId || 0,
      hospitalId: appointment?.hospitalId || null,
      scheduledDate: appointment?.scheduledDate ? new Date(appointment.scheduledDate).toISOString().split('T')[0] : '',
      scheduledTime: appointment?.scheduledTime || '',
      estimatedDuration: appointment?.estimatedDuration || 120,
      surgeryType: appointment?.surgeryType || 'eletiva',
      status: appointment?.status || 'agendado',
      surgeryRoom: appointment?.surgeryRoom || '',
      preOperativeNotes: appointment?.preOperativeNotes || '',
      priority: appointment?.priority || 1,
      notes: appointment?.notes || '',
      cancellationReason: appointment?.cancellationReason || '',
    },
  });

  // Inicializar selectedOrder quando os dados são carregados
  useEffect(() => {
    if (mode === 'create' && availableOrders.length > 0) {
      // Prioritar preSelectedOrderId se fornecido
      if (preSelectedOrderId) {
        const preSelectedOrder = availableOrders.find(o => o.id === preSelectedOrderId);
        if (preSelectedOrder) {
          setSelectedOrder(preSelectedOrder);
          form.setValue('medicalOrderId', preSelectedOrderId);
          console.log('🎯 Pedido pré-selecionado automaticamente:', preSelectedOrder);
          return;
        }
      }
      
      // Fallback: verificar se há um pedido selecionado no formulário
      const selectedOrderId = form.getValues('medicalOrderId');
      if (selectedOrderId) {
        const order = availableOrders.find(o => o.id === selectedOrderId);
        if (order) {
          setSelectedOrder(order);
        }
      }
    }
  }, [availableOrders, mode, preSelectedOrderId, form]);

  // Função para buscar duração estimada baseada nos procedimentos CBHPM
  const fetchEstimatedDuration = async (orderId: number) => {
    try {
      console.log(`🕒 Buscando duração estimada para pedido ${orderId}`);
      const response = await apiRequest(`/api/surgery-appointments/estimated-duration/${orderId}`, 'GET');
      
      if (response.estimatedDuration) {
        console.log(`⏱️ Duração estimada recebida: ${response.estimatedDuration} minutos`);
        console.log(`📋 Baseada em ${response.proceduresCount} procedimento(s):`, response.procedures);
        
        // Atualizar o campo de duração no formulário
        form.setValue('estimatedDuration', response.estimatedDuration);
        
        toast({
          title: 'Duração Calculada',
          description: `Duração estimada: ${response.estimatedDuration} minutos (baseada em ${response.proceduresCount} procedimento(s) CBHPM)`,
        });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar duração estimada:', error);
      // Manter duração padrão se houver erro
    }
  };

  // Efeito para carregar duração estimada quando um pedido é selecionado
  useEffect(() => {
    if (selectedOrder && mode === 'create') {
      console.log(`🎯 Pedido selecionado: ${selectedOrder.id} - ${selectedOrder.title}`);
      fetchEstimatedDuration(selectedOrder.id);
    }
  }, [selectedOrder, mode]);





  // Mutation para criar agendamento
  const createMutation = useMutation({
    mutationFn: async (data: SurgeryAppointmentFormData) => {
      const payload: InsertSurgeryAppointment = {
        ...data,
        patientId: selectedOrder?.patientId || 1,
        scheduledDate: new Date(`${data.scheduledDate}T${data.scheduledTime}:00.000Z`),
        hospitalId: data.hospitalId || null,
        doctorId: 84, // Usuário atual
        createdBy: 84, // Usuário atual
      };

      return apiRequest('/api/surgery-appointments', 'POST', payload);
    },
    onSuccess: () => {
      toast({
        title: 'Agendamento criado',
        description: 'O agendamento foi criado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/surgery-appointments'] });
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
        scheduledDate: new Date(`${data.scheduledDate}T${data.scheduledTime}:00.000Z`),
        hospitalId: data.hospitalId || null,
      };

      return apiRequest(`/api/surgery-appointments/${appointment?.id}`, 'PUT', payload);
    },
    onSuccess: () => {
      toast({
        title: 'Agendamento atualizado',
        description: 'O agendamento foi atualizado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/surgery-appointments'] });
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
    if (mode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-3">
      {/* Formulário */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">

          {/* Seleção do pedido médico e hospital - Layout compacto */}
          {mode === 'create' && (
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="h-4 w-4" />
                  Selecionar Pedido Médico
                </CardTitle>
                <CardDescription className="text-xs">
                  Escolha o pedido médico para o qual deseja agendar a cirurgia
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="medicalOrderId"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-medium">Pedido Médico</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const orderId = parseInt(value);
                            field.onChange(orderId);
                            const order = availableOrders.find(o => o.id === orderId);
                            if (order) {
                              console.log('Pedido selecionado:', order);
                              setSelectedOrder(order);
                              // Buscar duração estimada imediatamente
                              fetchEstimatedDuration(orderId);
                            }
                          }}
                          value={field.value ? field.value.toString() : ''}
                          disabled={isLoadingOrders}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecione um pedido médico" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingOrders ? (
                              <SelectItem value="loading" disabled>
                                Carregando pedidos...
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
                  
                  {/* Informações do Hospital */}
                  <div className="space-y-1">
                    <FormLabel className="text-xs font-medium">Hospital</FormLabel>
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/10 h-8">
                      {selectedOrder ? (
                        <>
                          <span className="text-sm">🏥</span>
                          <span className="font-medium text-xs truncate">{selectedOrder.hospitalName}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">Selecione um pedido médico primeiro</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Layout principal - Grid 2x2 para melhor aproveitamento do espaço */}
          <div className="grid grid-cols-2 gap-3">
            {/* Informações do Agendamento */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Informações do Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Cirurgia</FormLabel>
                        <FormControl>
                          <BrazilianDateInput 
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
                      <FormItem>
                        <FormLabel>Horário</FormLabel>
                        <FormControl>
                          <BrazilianTimeInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="HH:MM"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração Estimada (minutos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={15}
                            max={720}
                            step={15}
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
                      <FormItem>
                        <FormLabel>Tipo de Cirurgia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
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

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a prioridade" />
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
                </div>

                <FormField
                  control={form.control}
                  name="surgeryRoom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sala Cirúrgica</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Sala 1, Centro Cirúrgico A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Coluna direita - Observações */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="preOperativeNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Pré-operatórias</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Instruções, preparativos, exames necessários..."
                          className="min-h-[140px] resize-none"
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
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Informações adicionais sobre o agendamento..."
                          className="min-h-[140px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('status') === 'cancelado' && (
                  <FormField
                    control={form.control}
                    name="cancellationReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo do Cancelamento</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Explique o motivo do cancelamento..."
                            className="min-h-[100px] resize-none"
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



          {/* Botões de ação */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : mode === 'create' ? 'Criar Agendamento' : 'Atualizar Agendamento'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}