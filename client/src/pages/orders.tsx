import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PartialApprovalModal } from "@/components/partial-approval-modal";
import { ReceivedValuesModal } from "@/components/received-values-modal";
import { SurgeryAppointmentFormCompact } from "@/components/surgery-appointment-form-compact";
import { StatusChangeModal } from "@/components/status-change-modal";
import { SupplierApprovalModal } from "@/components/supplier-approval-modal";
import { Calendar, CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, FileText, Eye, FileCheck, AlertCircle, Clock, Phone, Search, Filter, X, ChevronDown, Check, Edit2, Plus, Trash2, Loader2, Download, CheckCircle, ArrowRight, Undo2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { t } from "@/lib/i18n";
import { addOrdersTranslations } from "@/lib/translations/orders";
import { useToast } from "@/hooks/use-toast";

// Adicionar traduções
addOrdersTranslations();

// Status dos pedidos
const orderStatus = {
  "em_preenchimento": { label: "Incompleta", color: "bg-orange-700/70 text-orange-200" },
  "em_avaliacao": { label: "Em análise", color: "bg-blue-700/70 text-blue-200" },
  "aceito": { label: "Autorizado", color: "bg-green-700/70 text-green-200" },
  "autorizado_parcial": { label: "Autorizado Parcial", color: "bg-purple-700/70 text-purple-200" },
  "cirurgia_realizada": { label: "Cirurgia realizada", color: "bg-accent-light text-accent" },
  "cancelado": { label: "Cancelada", color: "bg-red-700/70 text-red-200" },
  "aguardando_envio": { label: "Aguardando Envio", color: "bg-purple-700/70 text-purple-200" },
  "recebido": { label: "Recebido", color: "bg-green-700/70 text-green-200" }
};

// Locale para formatação de datas
const dateLocales = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": es
};

export default function Orders() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.roleId === 1;
  
  // Estado para armazenar locale atual
  const [currentLocale, setCurrentLocale] = useState<"pt-BR" | "en-US" | "es-ES">("pt-BR");
  
  // Estado para dados de pedidos
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [filteredOrdersData, setFilteredOrdersData] = useState<any[]>([]);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  
  // Estados para controlar carregamento e erros
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Estado para lista de hospitais (para o filtro)
  const [hospitalsList, setHospitalsList] = useState<any[]>([]);
  
  // Estado para armazenar agendamentos cirúrgicos por pedido médico
  const [appointmentsByOrder, setAppointmentsByOrder] = useState<{[key: number]: any}>({});

  // Função para buscar agendamento cirúrgico de um pedido específico
  const fetchAppointmentForOrder = async (orderId: number) => {
    try {
      const response = await apiRequest(`/api/surgery-appointments/by-medical-order/${orderId}`, "GET");
      setAppointmentsByOrder(prev => ({
        ...prev,
        [orderId]: response
      }));
    } catch (error) {
      // Se não encontrar agendamento, não fazer nada (pedido pode não ter agendamento)
      console.log(`Nenhum agendamento encontrado para pedido ${orderId}`);
    }
  };

  // Função para formatar a data do procedimento considerando agendamentos
  const formatProcedureDate = (order: any) => {
    const appointment = appointmentsByOrder[order.id];
    
    // Se existe agendamento, mostrar data e hora agendada
    if (appointment && appointment.scheduledDate && appointment.scheduledTime) {
      const scheduledDate = new Date(appointment.scheduledDate);
      return `${formatDateBrazilian(scheduledDate.toISOString())} às ${appointment.scheduledTime}`;
    }
    
    // Usar lógica original para pedidos sem agendamento
    if (order.procedureDate && 
        order.procedureDate !== null && 
        order.procedureDate !== 'null' && 
        order.procedureDate !== 'undefined' &&
        order.procedureDate !== 'Data não agendada') {
      return formatDate(order.procedureDate);
    }
    
    return (order.status === 'aceito' || order.status === 'autorizado_parcial') ? 'Aguardando agendamento' : 'Aguardando aceitação';
  };
  
  // Estados para agendamento de procedimento
  const [schedulingOrderId, setSchedulingOrderId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  
  // Estados para modal de aprovação parcial
  const [partialApprovalOrderId, setPartialApprovalOrderId] = useState<number | null>(null);
  const [showPartialApprovalModal, setShowPartialApprovalModal] = useState(false);
  
  // Estados para modal de valores recebidos
  const [showReceivedValuesModal, setShowReceivedValuesModal] = useState(false);
  const [receivedValuesOrderId, setReceivedValuesOrderId] = useState<number | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: number; status: string } | null>(null);
  
  // Estados para recursos (appeals)
  const [showAppealDialog, setShowAppealDialog] = useState<boolean>(false);
  const [selectedOrderForAppeal, setSelectedOrderForAppeal] = useState<number | null>(null);
  const [appealJustification, setAppealJustification] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isCreatingAppeal, setIsCreatingAppeal] = useState<boolean>(false);

  // Estados para modal de agendamento cirúrgico
  const [showAppointmentModal, setShowAppointmentModal] = useState<boolean>(false);
  const [selectedOrderForAppointment, setSelectedOrderForAppointment] = useState<number | null>(null);

  // Estados para prompt de agendamento após autorização
  const [showSchedulingPrompt, setShowSchedulingPrompt] = useState<boolean>(false);
  const [authorizedOrderForScheduling, setAuthorizedOrderForScheduling] = useState<number | null>(null);
  
  // Estados para modal de aprovação de fornecedor
  const [showSupplierApprovalModal, setShowSupplierApprovalModal] = useState<boolean>(false);
  const [supplierApprovalOrderId, setSupplierApprovalOrderId] = useState<number | null>(null);

  // Estados para confirmação de exclusão
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);

  // Estados para modal de mudança de status
  const queryClient = useQueryClient();
  const [showStatusChangeModal, setShowStatusChangeModal] = useState<boolean>(false);
  const [statusChangeOrderId, setStatusChangeOrderId] = useState<number | null>(null);
  const [statusChangeCurrentStatus, setStatusChangeCurrentStatus] = useState<string>("");
  const [statusChangeCurrentStatusLabel, setStatusChangeCurrentStatusLabel] = useState<string>("");
  const [statusChangeOrder, setStatusChangeOrder] = useState<any>(null);
  
  // Mapeamento de statusId para status code
  const statusIdToCode = {
    1: "em_preenchimento",
    2: "em_avaliacao", 
    3: "aceito",
    4: "autorizado_parcial",
    6: "cirurgia_realizada",
    7: "cancelado",
    8: "aguardando_envio",
    9: "recebido"
  };
  
  // Ler parâmetros da URL no carregamento da página
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusIdParam = urlParams.get('statusId');
    
    if (statusIdParam) {
      const statusCode = statusIdToCode[parseInt(statusIdParam) as keyof typeof statusIdToCode];
      if (statusCode) {
        setSelectedStatus(statusCode);
      }
    }
  }, []);
  
  // Função para buscar pedidos reais do banco de dados
  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setIsError(false);
      
      // URL da API que implementamos com filtro por usuário
      const url = isAdmin 
        ? '/api/medical-orders' 
        : `/api/medical-orders?userId=${user.id}`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar pedidos: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter statusId para statusCode se necessário e ordenar pedidos
      const processedData = Array.isArray(data) ? data.map(order => ({
        ...order,
        // Se o status não está presente ou é um ID numérico, converter usando statusIdToCode
        status: order.status && typeof order.status === 'string' ? order.status : 
                statusIdToCode[order.statusId as keyof typeof statusIdToCode] || 'nao_especificado'
      })).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
      }) : [];
      
      setOrdersData(processedData);
      setFilteredOrdersData(processedData);
      
      // Extrair lista única de hospitais para o filtro
      const uniqueHospitals = Array.from(
        new Map(
          data
            .filter((order: any) => order.hospitalName)
            .map((order: any) => [order.hospitalId, { id: order.hospitalId, name: order.hospitalName }])
        ).values()
      );
      setHospitalsList(uniqueHospitals);
      
      // Buscar agendamentos para pedidos com status "aceito", "autorizado_parcial" ou outros que podem ter agendamento
      const ordersWithPossibleAppointments = processedData.filter(order => 
        ['aceito', 'autorizado_parcial', 'cirurgia_realizada', 'recebido'].includes(order.status)
      );
      
      // Buscar agendamentos para esses pedidos
      ordersWithPossibleAppointments.forEach(order => {
        fetchAppointmentForOrder(order.id);
      });
      
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar pedidos quando o componente carrega
  useEffect(() => {
    fetchOrders();
  }, [user, isAdmin]);

  // Função para buscar e atualizar apenas um pedido específico (otimização)
  const fetchOrder = async (orderId: number) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/medical-orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar pedido: ${response.status}`);
      }
      
      const updatedOrder = await response.json();
      
      // Processar o pedido atualizado
      const processedOrder = {
        ...updatedOrder,
        status: updatedOrder.status && typeof updatedOrder.status === 'string' ? updatedOrder.status : 
                statusIdToCode[updatedOrder.statusId as keyof typeof statusIdToCode] || 'nao_especificado'
      };
      
      // Atualizar apenas este pedido nos estados locais
      const updateOrderInArray = (orders: any[]) => 
        orders.map(order => 
          order.id === orderId ? processedOrder : order
        );
      
      setOrdersData(prev => updateOrderInArray(prev));
      setFilteredOrdersData(prev => updateOrderInArray(prev));
      
      // Se este pedido pode ter agendamento, buscar o agendamento
      if (['aceito', 'autorizado_parcial', 'cirurgia_realizada', 'recebido'].includes(processedOrder.status)) {
        fetchAppointmentForOrder(orderId);
      }
      
    } catch (error) {
      console.error(`Erro ao buscar pedido ${orderId}:`, error);
      // Em caso de erro, fazer fallback para buscar todos os pedidos
      fetchOrders();
    }
  };

  // Função para recarregar dados após atualização
  const reloadOrders = () => {
    fetchOrders();
  };



  // Função para aplicar filtros
  const applyFilters = () => {
    let filtered = [...ordersData];

    // Filtro por termo de busca (nome do paciente)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.patientName?.toLowerCase().includes(term) ||
        order.id.toString().includes(term)
      );
    }

    // Filtro por hospital
    if (selectedHospital) {
      filtered = filtered.filter(order => 
        order.hospitalId?.toString() === selectedHospital
      );
    }

    // Filtro por status
    if (selectedStatus) {
      filtered = filtered.filter(order => 
        order.status === selectedStatus
      );
    }

    // Manter ordenação por data de criação mais recente primeiro
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
    });

    setFilteredOrdersData(filtered);
  };

  // Aplicar filtros quando os critérios mudarem
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedHospital, selectedStatus, ordersData]);

  // Função para formatação de moeda (memoizada)
  const formatCurrency = useMemo(() => (valueInCents: number | null) => {
    if (!valueInCents) return "Aguardando recebimento";
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
  }, []);

  // Funções para limpar filtros
  const clearSearchTerm = () => setSearchTerm("");
  const clearHospitalFilter = () => setSelectedHospital("");
  const clearStatusFilter = () => setSelectedStatus("");
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedHospital("");
    setSelectedStatus("");
  };

  // Memoizar controles de filtro para evitar re-renderização desnecessária
  const hasActiveFilters = useMemo(() => 
    searchTerm || selectedHospital || selectedStatus, 
    [searchTerm, selectedHospital, selectedStatus]
  );

  // Função para criar recurso
  const createAppeal = async () => {
    if (!selectedOrderForAppeal || !appealJustification.trim()) {
      toast({
        title: "Erro",
        description: "Justificativa é obrigatória",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingAppeal(true);
      
      const response = await apiRequest(`/api/medical-orders/${selectedOrderForAppeal}/appeals`, "POST", {
        justification: appealJustification,
        rejectionReason: rejectionReason || null
      });
      
      setShowAppealDialog(false);
      setSelectedOrderForAppeal(null);
      setAppealJustification("");
      setRejectionReason("");
      
      toast({
        title: "Recurso criado",
        description: "Seu recurso foi enviado para análise da operadora",
      });
      
      // Buscar apenas este pedido para refletir mudanças (otimização)
      if (selectedOrderForAppeal) {
        fetchOrder(selectedOrderForAppeal);
      }
      
    } catch (error) {
      console.error("Erro ao criar recurso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o recurso",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAppeal(false);
    }
  };

  // Função para agendar procedimento
  const scheduleProcedure = async (orderId: number, date: string) => {
    try {
      const response = await apiRequest(`/api/medical-orders/${orderId}/schedule`, "PATCH", { 
        procedureDate: date 
      });
      
      // Atualizar o pedido específico nos estados locais
      const updateOrderInArray = (orders: any[]) => 
        orders.map(order => 
          order.id === orderId ? { ...order, procedureDate: date } : order
        );
      
      setOrdersData(prev => updateOrderInArray(prev));
      setFilteredOrdersData(prev => updateOrderInArray(prev));
      
      // Fechar modal
      setSchedulingOrderId(null);
      setScheduleDate("");
      
      toast({
        title: "Procedimento agendado",
        description: `Data do procedimento definida para ${formatDate(date)}`,
      });
    } catch (error) {
      console.error("Erro ao agendar procedimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar o procedimento",
        variant: "destructive",
      });
    }
  };

  // Função para converter valor em reais para centavos
  const parseCurrencyToCents = (value: string): number | null => {
    if (!value || value.trim() === "") return null;
    const numericValue = parseFloat(value.replace(',', '.'));
    return isNaN(numericValue) ? null : Math.round(numericValue * 100);
  };

  // Função para atualizar status do pedido
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      
      // Se for autorizado parcial, abrir modal primeiro
      if (newStatus === 'autorizado_parcial') {
        setPartialApprovalOrderId(orderId);
        setShowPartialApprovalModal(true);
        return; // Não atualizar o status ainda
      }
      
      // Se for recebido e status anterior é cirurgia_realizada, abrir modal de valores recebidos
      if (newStatus === 'recebido') {
        // Buscar o pedido atual nos dados para verificar o status anterior
        const currentOrder = ordersData.find(order => order.id === orderId) || 
                            filteredOrdersData.find(order => order.id === orderId);
        
        if (currentOrder && currentOrder.status === 'cirurgia_realizada') {
          setPendingStatusChange({ orderId, status: newStatus });
          setReceivedValuesOrderId(orderId);
          setShowReceivedValuesModal(true);
          return; // Não atualizar o status ainda - será atualizado quando modal for fechado
        }
      }
      
      const response = await apiRequest(`/api/medical-orders/${orderId}/status`, "PATCH", { status: newStatus });
      
      // Buscar apenas este pedido para obter o previousStatusId atualizado (otimização)
      await fetchOrder(orderId);
      
      toast({
        title: "Status atualizado",
        description: `Status do pedido alterado para "${orderStatus[newStatus as keyof typeof orderStatus]?.label || newStatus}"`,
      });

      // Se o status mudou para "aceito" (autorizado), mostrar modal de seleção de fornecedor
      if (newStatus === 'aceito') {
        setSupplierApprovalOrderId(orderId);
        setShowSupplierApprovalModal(true);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      
      // Em caso de erro, recarregar os dados para garantir consistência
      fetchOrders();
      
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive",
      });
    }
  };

  // Função para finalizar a aprovação parcial
  const handlePartialApprovalComplete = async () => {
    if (!partialApprovalOrderId) return;

    try {
      // Atualizar o status do pedido para autorizado_parcial
      const response = await apiRequest(`/api/medical-orders/${partialApprovalOrderId}/status`, "PATCH", { 
        status: 'autorizado_parcial' 
      });
      
      // Buscar apenas este pedido para obter o previousStatusId atualizado (otimização)
      await fetchOrder(partialApprovalOrderId);
      
      toast({
        title: "Status atualizado",
        description: "Pedido marcado como autorizado parcialmente",
      });

      // Após aprovação parcial, abrir modal de seleção de fornecedor
      setSupplierApprovalOrderId(partialApprovalOrderId);
      setShowSupplierApprovalModal(true);

    } catch (error) {
      console.error('Erro ao finalizar aprovação parcial:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive",
      });
    }
  };

  // Função para finalizar valores recebidos
  const handleReceivedValuesComplete = async () => {
    if (!pendingStatusChange) return;

    try {
      // Atualizar o status do pedido para recebido
      const response = await apiRequest(`/api/medical-orders/${pendingStatusChange.orderId}/status`, "PATCH", { 
        status: pendingStatusChange.status 
      });
      
      // Buscar apenas este pedido para obter o previousStatusId atualizado (otimização)
      await fetchOrder(pendingStatusChange.orderId);
      
      toast({
        title: "Status atualizado",
        description: `Status do pedido alterado para "${orderStatus[pendingStatusChange.status as keyof typeof orderStatus]?.label || pendingStatusChange.status}"`,
      });

    } catch (error) {
      console.error('Erro ao finalizar valores recebidos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive",
      });
    }
  };

  // Atualizar locale quando o idioma mudar
  useEffect(() => {
    const handleLanguageChange = () => {
      const lang = document.documentElement.lang || 'pt-BR';
      setCurrentLocale(lang as "pt-BR" | "en-US" | "es-ES");
    };

    // Inicializar
    handleLanguageChange();
    
    // Adicionar listener para mudanças de idioma
    window.addEventListener('languageChange', handleLanguageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);

  // Função para formatar data
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined' || dateString === null || dateString === undefined || dateString === 'Data não agendada') {
      return "Data não definida";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      return format(date, "PPP", { locale: dateLocales[currentLocale] });
    } catch (error) {
      return "Data inválida";
    }
  };

  // Função para formatar data no padrão brasileiro (dd/mm/AAAA)
  const formatDateBrazilian = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined' || dateString === null || dateString === undefined || dateString === 'Data não agendada') {
      return "Data não definida";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      return format(date, "dd/MM/yyyy");
    } catch (error) {
      return "Data inválida";
    }
  };

  // Função para calcular dias úteis entre duas datas
  const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo (0) nem sábado (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  // Função para adicionar dias úteis a uma data
  const addBusinessDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo nem sábado
        addedDays++;
      }
    }
    
    return result;
  };

  // Função para calcular dias corridos entre duas datas
  const calculateCalendarDays = (startDate: Date, endDate: Date): number => {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  };

  // Função para obter informações de contagem regressiva (em_avaliacao e cirurgia_realizada)
  const getCountdownInfo = (order: any) => {
    if (!order || (order.status !== 'em_avaliacao' && order.status !== 'cirurgia_realizada')) return null;
    
    const now = new Date();
    
    if (order.status === 'em_avaliacao') {
      // Lógica original para "em_avaliacao" - 21 dias úteis
      const analysisStart = new Date(order.updatedAt);
      const businessDaysElapsed = calculateBusinessDays(analysisStart, now);
      const remainingDays = 21 - businessDaysElapsed;
      
      // Se o prazo já esgotou (mais de 21 dias úteis)
      if (remainingDays <= 0) {
        const overdueBusinessDays = businessDaysElapsed - 21;
        return {
          text: `Prazo de resposta pelo operador esgotado há ${overdueBusinessDays} dias`,
          color: "text-red-400"
        };
      }
      
      // Se ainda está dentro do prazo
      return {
        text: `${remainingDays} dias úteis restantes (de 21)`,
        color: remainingDays <= 5 ? "text-orange-400" : "text-blue-400"
      };
    }
    
    if (order.status === 'cirurgia_realizada') {
      // Nova lógica para "cirurgia_realizada" - 90 dias corridos
      const surgeryCompletedDate = new Date(order.updatedAt);
      const calendarDaysElapsed = calculateCalendarDays(surgeryCompletedDate, now);
      const remainingDays = 90 - calendarDaysElapsed;
      
      // Se o prazo já esgotou (mais de 90 dias corridos)
      if (remainingDays <= 0) {
        const overdueDays = calendarDaysElapsed - 90;
        return {
          text: `Prazo para recebimento esgotado há ${overdueDays} dias`,
          color: "text-red-400"
        };
      }
      
      // Se ainda está dentro do prazo
      return {
        text: `${remainingDays} dias corridos restantes para recebimento (de 90)`,
        color: remainingDays <= 15 ? "text-orange-400" : "text-accent"
      };
    }
    
    return null;
  };

  // Função para baixar PDF do pedido (mesma lógica do create-order.tsx)
  const handleDownloadPdf = async (orderId: number, patientName: string) => {
    try {
      // Buscar os dados completos do pedido para obter os attachments (mesma lógica do create-order)
      const response = await fetch(`/api/medical-orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do pedido');
      }
      
      const orderData = await response.json();
      
      // Procurar PDF gerado pelo sistema (não PDFs anexados pelo usuário)
      const systemPdfs = orderData.attachments?.filter((att: any) => {
        if (att.type !== 'pdf') return false;
        const filename = att.filename || '';
        // Identificar se é PDF gerado pelo sistema (contém padrão pedido_ID_)
        return filename.includes(`pedido_${orderId}_`) || filename.includes(`order_${orderId}_`);
      }) || [];
      
      if (systemPdfs.length === 0) {
        toast({
          title: "PDF do pedido não encontrado",
          description: "Nenhum PDF do pedido foi gerado. Por favor, gere o PDF primeiro.",
          variant: "destructive",
        });
        return;
      }
      
      // Pegar o PDF do sistema mais recente (último gerado)
      const pdfAttachment = systemPdfs[systemPdfs.length - 1];
      
      // Fazer download do PDF existente usando a URL dos attachments
      const pdfResponse = await fetch(pdfAttachment.url);
      if (!pdfResponse.ok) {
        throw new Error('Erro ao acessar o PDF');
      }
      
      const blob = await pdfResponse.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfAttachment.filename || `pedido_${orderId}_${patientName?.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download concluído",
        description: "PDF baixado com sucesso!",
      });
      
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o PDF do pedido.",
        variant: "destructive",
      });
    }
  };

  // Função para renderizar o status do pedido com botão de desfazer
  const renderStatus = (status: string, orderId: number, hasPreviousStatus: boolean = false) => {
    const statusInfo = orderStatus[status as keyof typeof orderStatus] || { 
      label: status, 
      color: "bg-gray-700/70 text-gray-200" 
    };

    return (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={`${statusInfo.color} px-3 py-1 text-xs rounded-full cursor-default`}
          disabled
        >
          {statusInfo.label}
        </Button>
        {hasPreviousStatus && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300"
            onClick={() => handleUndoStatus(orderId)}
            title="Desfazer última alteração de status"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  // Função para abrir modal de mudança de status
  const handleOpenStatusChangeModal = (order: any, currentStatus: string, currentStatusLabel: string) => {
    setStatusChangeOrderId(order.id);
    setStatusChangeCurrentStatus(currentStatus);
    setStatusChangeCurrentStatusLabel(currentStatusLabel);
    setStatusChangeOrder(order);
    setShowStatusChangeModal(true);
  };

  // Função para lidar com mudança de status via modal
  const handleStatusChangeFromModal = (orderId: number, newStatus: string) => {
    updateOrderStatus(orderId, newStatus);
  };

  // Função para lidar com aprovação parcial via modal
  const handlePartialApprovalFromModal = (orderId: number) => {
    setPartialApprovalOrderId(orderId);
    setShowPartialApprovalModal(true);
  };

  // Função para lidar com valores recebidos via modal
  const handleReceivedValuesFromModal = (orderId: number) => {
    // Configurar a mudança de status pendente para 'recebido'
    setPendingStatusChange({ orderId, status: 'recebido' });
    setReceivedValuesOrderId(orderId);
    setShowReceivedValuesModal(true);
  };

  // Função para desfazer última alteração de status
  const handleUndoStatus = async (orderId: number) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest(`/api/medical-orders/${orderId}/undo-status`, 'PATCH');
      
      if (response) {
        toast({
          title: "Status desfeito",
          description: "O status foi revertido para o estado anterior com sucesso.",
        });
        
        // Buscar apenas este pedido para atualizar (otimização)
        await fetchOrder(orderId);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao desfazer status",
        description: error.message || "Não foi possível desfazer a última alteração de status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Voltar para a página anterior
  const handleGoBack = () => {
    navigate("/");
  };

  // Visualizar detalhes do pedido
  const handleViewOrder = (orderId: number) => {
    navigate(`/order/${orderId}`);
  };

  // Função para editar pedido (movida da página de detalhes)
  const handleEditOrder = (order: any) => {
    if (!order) return;

    // Verificar se o pedido está em status que não permite edição
    const nonEditableStatuses = ["aceito", "autorizado_parcial", "realizado", "cancelado", "concluido"];
    
    if (nonEditableStatuses.includes(order.status)) {
      const statusMessages = {
        "aceito": "Este pedido já foi aceito pela seguradora e não pode mais ser editado.",
        "autorizado_parcial": "Este pedido já foi autorizado parcialmente pela seguradora e não pode mais ser editado.",
        "realizado": "Este pedido já foi realizado e não pode mais ser editado.",
        "cancelado": "Este pedido foi cancelado e não pode mais ser editado.",
        "concluido": "Este pedido já foi concluído e não pode mais ser editado."
      };
      
      toast({
        title: "Edição não permitida",
        description: statusMessages[order.status as keyof typeof statusMessages] || "Este pedido não pode mais ser editado.",
        variant: "destructive",
      });
      return;
    }

    // Se o pedido pode ser editado, navegar para create-order com o ID do pedido
    navigate(`/create-order?edit=${order.id}`);
  };
  
  // Função para abrir WhatsApp com o número do paciente
  const handleWhatsAppClick = (phone: string | null) => {
    if (!phone) return;
    
    // Formatar o número removendo caracteres não numéricos
    const formattedPhone = phone.replace(/\D/g, '');
    
    // Verificar se o número já tem o código do país
    const phoneWithCountryCode = formattedPhone.startsWith('55') 
      ? formattedPhone 
      : `55${formattedPhone}`;
    
    // Abrir o WhatsApp com o número formatado
    window.open(`https://wa.me/${phoneWithCountryCode}`, '_blank');
  };

  // Função para confirmar exclusão de pedido
  const handleDeleteOrder = (orderId: number) => {
    setOrderToDelete(orderId);
    setShowDeleteConfirmation(true);
  };

  // Função para deletar pedido incompleto
  const deleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      setIsDeletingOrder(true);
      
      const response = await apiRequest(`/api/medical-orders/${orderToDelete}`, "DELETE");
      
      // Remover o pedido dos estados locais
      setOrdersData(prev => prev.filter(order => order.id !== orderToDelete));
      setFilteredOrdersData(prev => prev.filter(order => order.id !== orderToDelete));
      
      // Fechar modal
      setShowDeleteConfirmation(false);
      setOrderToDelete(null);
      
      toast({
        title: "Pedido excluído",
        description: "O pedido foi removido com sucesso",
      });
      
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o pedido",
        variant: "destructive",
      });
    } finally {
      setIsDeletingOrder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1a2332]">
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Cabeçalho */}
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              className="mr-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
              onClick={handleGoBack}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('common.back')}
            </Button>
            <h1 className="text-2xl font-bold text-white">{t('orders.title')}</h1>
          </div>
          
          {/* Conteúdo principal */}
          <Card className="border-blue-800 bg-[#1a2332]/80 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center text-white">
                    <FileText className="mr-2 h-5 w-5 text-blue-400" />
                    {t('orders.list.title')}
                  </CardTitle>
                  <CardDescription className="text-blue-300">
                    {isAdmin 
                      ? t('orders.list.description.admin') 
                      : t('orders.list.description.user')}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => navigate("/create-order")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Pedido
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Seção de Filtros */}
              {!isLoading && !isError && ordersData.length > 0 && (
                <div className="mb-6 p-4 bg-[#0f1629]/50 rounded-lg border border-blue-800/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-blue-300">Filtros de Busca</h3>
                    {(searchTerm || selectedHospital || selectedStatus) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30 ml-auto"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Campo de busca por paciente ou ID */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                      <Input
                        placeholder="Buscar por paciente ou ID do pedido..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-[#1a2332] border-blue-800/50 text-white placeholder:text-blue-300/70"
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSearchTerm}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Filtro por hospital */}
                    <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                      <SelectTrigger className="bg-[#1a2332] border-blue-800/50 text-white">
                        <SelectValue placeholder="Filtrar por hospital..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-blue-800">
                        {hospitalsList.map((hospital) => (
                          <SelectItem 
                            key={hospital.id} 
                            value={hospital.id.toString()}
                            className="text-white hover:bg-blue-900/30"
                          >
                            {hospital.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filtro por status */}
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-[#1a2332] border-blue-800/50 text-white">
                        <SelectValue placeholder="Filtrar por status..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-blue-800">
                        {Object.entries(orderStatus).map(([key, status]) => (
                          <SelectItem 
                            key={key} 
                            value={key}
                            className="text-white hover:bg-blue-900/30"
                          >
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Indicador de resultados */}
                  {filteredOrdersData.length !== ordersData.length && (
                    <div className="mt-3 text-sm text-blue-300/70">
                      Mostrando {filteredOrdersData.length} de {ordersData.length} pedidos
                    </div>
                  )}
                </div>
              )}

              {/* Conteúdo principal */}
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="border-blue-800/50 bg-[#1e293b]/80 shadow overflow-hidden animate-pulse">
                      <CardContent className="p-0">
                        <div className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="h-6 bg-blue-800/30 rounded w-3/4 mb-2"></div>
                              <div className="h-4 bg-green-800/30 rounded w-1/2 mb-1"></div>
                              <div className="h-4 bg-blue-700/30 rounded w-1/3"></div>
                            </div>
                            <div className="h-8 bg-blue-800/30 rounded-full w-24"></div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="h-4 bg-gray-700/30 rounded w-full"></div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="h-px bg-blue-900/50"></div>
                        
                        <div className="py-2 px-4 flex justify-between items-center">
                          <div className="h-8 bg-green-700/30 rounded w-20"></div>
                          <div className="flex gap-2">
                            <div className="h-8 bg-blue-700/30 rounded w-16"></div>
                            <div className="h-8 bg-orange-700/30 rounded w-16"></div>
                            <div className="h-8 bg-blue-700/30 rounded w-16"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg text-red-400 mb-2">{t('orders.list.error.title')}</p>
                  <p className="text-sm text-red-300/70">{t('orders.list.error.description')}</p>
                </div>
              ) : ordersData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-blue-500/70 mx-auto mb-4" />
                  <p className="text-lg text-blue-400 mb-2">{t('orders.list.empty.title')}</p>
                  <p className="text-sm text-blue-300/70 mb-6">{t('orders.list.empty.description')}</p>
                  <Button 
                    onClick={() => navigate("/create-order")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {t('orders.list.empty.action')}
                  </Button>
                </div>
              ) : filteredOrdersData.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-blue-500/70 mx-auto mb-4" />
                  <p className="text-lg text-blue-400 mb-2">Nenhum pedido encontrado</p>
                  <p className="text-sm text-blue-300/70 mb-6">
                    Não foram encontrados pedidos que correspondam aos filtros aplicados.
                  </p>
                  <Button 
                    onClick={clearAllFilters}
                    variant="outline"
                    className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrdersData.map((order: any) => (
                    <Card key={order.id} className="border-blue-800/50 bg-[#1e293b]/80 shadow overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div>
                              <h3 className="text-lg font-medium text-white truncate">
                                {order.surgicalApproaches && order.surgicalApproaches.length > 0 ? 
                                  order.surgicalApproaches[0].name :
                                  order.procedureName || `Pedido #${order.id}`}
                              </h3>
                              <p className="text-sm text-blue-300">
                                Criado em: {formatDateBrazilian(order.createdAt)}
                              </p>
                              {(order.status === 'em_avaliacao' || order.status === 'cirurgia_realizada') ? (
                                // Para estados "em_avaliacao" e "cirurgia_realizada", mostrar contagem regressiva
                                (() => {
                                  const countdownInfo = getCountdownInfo(order);
                                  return countdownInfo ? (
                                    <p className={`text-sm ${countdownInfo.color} font-medium flex items-center`}>
                                      <Clock className="inline h-3 w-3 mr-1" />
                                      {countdownInfo.text}
                                    </p>
                                  ) : null;
                                })()
                              ) : (
                                // Para demais estados, mostrar última atualização
                                <p className="text-sm text-blue-300">
                                  Última atualização em: {formatDateBrazilian(order.updatedAt || order.createdAt)}
                                </p>
                              )}
                            </div>
                            {renderStatus(order.status, order.id, !!order.previousStatusId)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-blue-400/80">{t('orders.list.item.patient')}:</span>{' '}
                              <span className="text-white">{order.patientName || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-blue-400/80">{t('orders.list.item.hospital')}:</span>{' '}
                              <span className="text-white">{order.hospitalName || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-blue-400/80">Data do Procedimento:</span>{' '}
                              <span className="text-white">
                                {formatProcedureDate(order)}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-400/80">{t('orders.list.item.doctor')}:</span>{' '}
                              <span className="text-white">{order.userName || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-blue-400/80">Valor Recebido:</span>{' '}
                              <span className="text-white">{formatCurrency(order.receivedValue)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Separator className="bg-blue-900/50" />
                        
                        <div className="py-2 px-4 flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500 hover:text-green-400 hover:bg-green-900/30"
                            onClick={() => handleWhatsAppClick(order.patientPhone)}
                            disabled={order.patientPhone === null || order.patientPhone === undefined || order.patientPhone === ""}
                            title={order.patientPhone ? `Enviar mensagem para ${order.patientName}` : "Paciente sem telefone cadastrado"}
                          >
                            <FaWhatsapp className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                          
                          <div className="flex gap-2">
                            {/* Botão de agendamento - aparece para status "aceito" e "autorizado_parcial" */}
                            {(order.status === "aceito" || order.status === "autorizado_parcial") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-900/30"
                                onClick={() => {
                                  setSelectedOrderForAppointment(order.id);
                                  setShowAppointmentModal(true);
                                }}
                              >
                                <CalendarDays className="h-4 w-4 mr-1" />
                                {/* Usar agendamento da surgery_appointments se existir, senão usar procedureDate */}
                                {(appointmentsByOrder[order.id] && appointmentsByOrder[order.id].scheduledDate) ||
                                 (order.procedureDate && 
                                  order.procedureDate !== null && 
                                  order.procedureDate !== 'null' && 
                                  order.procedureDate !== 'undefined' &&
                                  order.procedureDate !== 'Data não agendada') ? 
                                  "Reagendar" : "Agendar"}
                              </Button>
                            )}
                            
                            {/* Botão de recurso - aparece para status "recusado", "pendencia" e "autorizado_parcial" */}
                            {(order.status === "recusado" || order.status === "pendencia" || order.status === "autorizado_parcial") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                onClick={() => {
                                  setSelectedOrderForAppeal(order.id);
                                  setAppealJustification("");
                                  setShowAppealDialog(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Gerar Recurso
                              </Button>
                            )}
                            
                            {/* Botão de deletar - apenas para status "em_preenchimento" */}
                            {order.status === "em_preenchimento" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                onClick={() => handleDeleteOrder(order.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Apagar
                              </Button>
                            )}
                            
                            {['em_preenchimento', 'aguardando_envio', 'em_avaliacao'].includes(order.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/30"
                                onClick={() => handleEditOrder(order)}
                                title="Editar pedido"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            )}
                            
                            {order.status !== 'em_preenchimento' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-400 hover:text-green-300 hover:bg-green-900/30"
                                onClick={() => handleDownloadPdf(order.id, order.patientName)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Baixar PDF
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('orders.list.item.view')}
                            </Button>
                            
                            {/* Botão "Próxima Etapa" - sempre o último à direita, aparece para status que permitem alteração */}
                            {order.status !== 'recebido' && order.status !== 'cancelado' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                onClick={() => handleOpenStatusChangeModal(order, order.status, orderStatus[order.status as keyof typeof orderStatus]?.label || order.status)}
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Próxima Etapa
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal de agendamento de procedimento */}
      <Dialog open={schedulingOrderId !== null} onOpenChange={(open) => {
        if (!open) {
          setSchedulingOrderId(null);
          setScheduleDate("");
        }
      }}>
        <DialogContent className="bg-[#1e293b] border-blue-800/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Agendar Procedimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="scheduleDate" className="text-blue-300">
                Data do Procedimento *
              </Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-[#1a2332] border-blue-800/50 text-white mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSchedulingOrderId(null);
                  setScheduleDate("");
                }}
                className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (schedulingOrderId && scheduleDate) {
                    scheduleProcedure(schedulingOrderId, scheduleDate);
                  }
                }}
                disabled={!scheduleDate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Confirmar Agendamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar recurso */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent className="bg-[#0f1419] border-red-800/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Gerar Recurso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="rejectionReason" className="text-red-300">
                Motivo da Recusa (Operadora)
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Cole aqui a mensagem de recusa enviada pela operadora..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-[#1a2332] border-red-800/50 text-white mt-1 min-h-[80px]"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="appealJustification" className="text-red-300">
                Justificativa Médica *
              </Label>
              <Textarea
                id="appealJustification"
                placeholder="Descreva a justificativa médica para o recurso..."
                value={appealJustification}
                onChange={(e) => setAppealJustification(e.target.value)}
                className="bg-[#1a2332] border-red-800/50 text-white mt-1 min-h-[100px]"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAppealDialog(false);
                  setSelectedOrderForAppeal(null);
                  setAppealJustification("");
                  setRejectionReason("");
                }}
                className="border-red-600 text-red-400 hover:bg-red-900/30"
              >
                Cancelar
              </Button>
              <Button
                onClick={createAppeal}
                disabled={!appealJustification.trim() || isCreatingAppeal}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isCreatingAppeal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Enviar Recurso
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Aprovação Parcial */}
      {partialApprovalOrderId && (
        <PartialApprovalModal
          isOpen={showPartialApprovalModal}
          onClose={() => {
            setShowPartialApprovalModal(false);
            setPartialApprovalOrderId(null);
          }}
          orderId={partialApprovalOrderId}
          onApprovalComplete={handlePartialApprovalComplete}
        />
      )}

      {/* Modal de Valores Recebidos */}
      {receivedValuesOrderId && (
        <ReceivedValuesModal
          isOpen={showReceivedValuesModal}
          onClose={() => {
            setShowReceivedValuesModal(false);
            setReceivedValuesOrderId(null);
            setPendingStatusChange(null); // Limpar mudança pendente
          }}
          orderId={receivedValuesOrderId}
          onValuesComplete={handleReceivedValuesComplete}
        />
      )}

      {/* Modal de Aprovação de Fornecedor */}
      {supplierApprovalOrderId && (
        <SupplierApprovalModal
          isOpen={showSupplierApprovalModal}
          onClose={() => {
            setShowSupplierApprovalModal(false);
            setSupplierApprovalOrderId(null);
          }}
          orderId={supplierApprovalOrderId}
          onApprovalComplete={() => {
            // Após aprovar fornecedor, perguntar se quer agendar o procedimento
            if (supplierApprovalOrderId) {
              setAuthorizedOrderForScheduling(supplierApprovalOrderId);
              setShowSchedulingPrompt(true);
            }
            // Atualizar dados do pedido
            if (supplierApprovalOrderId) {
              fetchOrder(supplierApprovalOrderId);
            }
          }}
        />
      )}

      {/* Modal de Agendamento Cirúrgico */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="bg-[#1a2332] border-blue-800/50 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-400 text-xl">
              <CalendarDays className="h-5 w-5 inline mr-2" />
              <span id="appointment-modal-title">Agendar Cirurgia</span>
            </DialogTitle>
          </DialogHeader>
          {selectedOrderForAppointment && (
            <SurgeryAppointmentFormCompact
              mode="create"
              preSelectedOrderId={selectedOrderForAppointment}
              onClose={() => {
                setShowAppointmentModal(false);
                setSelectedOrderForAppointment(null);
                // Buscar apenas este pedido para refletir mudanças (otimização)
                if (selectedOrderForAppointment) {
                  fetchOrder(selectedOrderForAppointment);
                }
                toast({
                  title: "Agendamento criado",
                  description: "Cirurgia agendada com sucesso",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent className="bg-[#1a2332] border-red-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
              Todos os dados associados ao pedido serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
              disabled={isDeletingOrder}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteOrder}
              disabled={isDeletingOrder}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingOrder ? "Excluindo..." : "Excluir Pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt de Agendamento após Autorização */}
      <AlertDialog open={showSchedulingPrompt} onOpenChange={setShowSchedulingPrompt}>
        <AlertDialogContent className="bg-[#1a2332] border-green-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Pedido Autorizado!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              O pedido foi autorizado com sucesso. Gostaria de agendar o procedimento cirúrgico agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
              onClick={() => {
                setShowSchedulingPrompt(false);
                setAuthorizedOrderForScheduling(null);
              }}
            >
              Mais tarde
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (authorizedOrderForScheduling) {
                  setSelectedOrderForAppointment(authorizedOrderForScheduling);
                  setShowAppointmentModal(true);
                }
                setShowSchedulingPrompt(false);
                setAuthorizedOrderForScheduling(null);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Agendar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Mudança de Status */}
      <StatusChangeModal
        isOpen={showStatusChangeModal}
        onClose={() => {
          setShowStatusChangeModal(false);
          setStatusChangeOrderId(null);
          setStatusChangeCurrentStatus("");
          setStatusChangeCurrentStatusLabel("");
          setStatusChangeOrder(null);
        }}
        orderId={statusChangeOrderId || 0}
        currentStatus={statusChangeCurrentStatus}
        currentStatusLabel={statusChangeCurrentStatusLabel}
        onStatusChange={handleStatusChangeFromModal}
        onPartialApproval={handlePartialApprovalFromModal}
        onReceivedValues={handleReceivedValuesFromModal}
        onEditOrder={handleEditOrder}
        order={statusChangeOrder}
      />
    </div>
  );
}