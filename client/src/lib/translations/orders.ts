import { addTranslations } from "@/lib/i18n";

// Traduções para a página de pedidos
const translations = {
  'pt-BR': {
    'orders.title': 'Pedidos Cirúrgicos',
    'orders.list.title': 'Lista de Pedidos',
    'orders.list.description.admin': 'Visualize todos os pedidos cirúrgicos do sistema',
    'orders.list.description.user': 'Visualize seus pedidos cirúrgicos',
    'orders.list.error.title': 'Erro ao carregar pedidos',
    'orders.list.error.description': 'Ocorreu um erro ao buscar os pedidos. Por favor, tente novamente mais tarde.',
    'orders.list.empty.title': 'Nenhum pedido encontrado',
    'orders.list.empty.description': 'Você ainda não tem pedidos cirúrgicos registrados no sistema.',
    'orders.list.empty.action': 'Criar Novo Pedido',
    'orders.list.item.created': 'Criado em',
    'orders.list.item.patient': 'Paciente',
    'orders.list.item.hospital': 'Hospital',
    'orders.list.item.procedure': 'Data procedimento',
    'orders.list.item.doctor': 'Médico',
    'orders.list.item.view': 'Ver detalhes',
    'common.back': 'Voltar',
  },
  'en-US': {
    'orders.title': 'Surgical Orders',
    'orders.list.title': 'Order List',
    'orders.list.description.admin': 'View all surgical orders in the system',
    'orders.list.description.user': 'View your surgical orders',
    'orders.list.error.title': 'Error loading orders',
    'orders.list.error.description': 'An error occurred while fetching orders. Please try again later.',
    'orders.list.empty.title': 'No orders found',
    'orders.list.empty.description': 'You don\'t have any surgical orders registered in the system yet.',
    'orders.list.empty.action': 'Create New Order',
    'orders.list.item.created': 'Created on',
    'orders.list.item.patient': 'Patient',
    'orders.list.item.hospital': 'Hospital',
    'orders.list.item.procedure': 'Procedure date',
    'orders.list.item.doctor': 'Doctor',
    'orders.list.item.view': 'View details',
    'common.back': 'Back',
  },
  'es-ES': {
    'orders.title': 'Pedidos Quirúrgicos',
    'orders.list.title': 'Lista de Pedidos',
    'orders.list.description.admin': 'Visualice todos los pedidos quirúrgicos del sistema',
    'orders.list.description.user': 'Visualice sus pedidos quirúrgicos',
    'orders.list.error.title': 'Error al cargar pedidos',
    'orders.list.error.description': 'Ocurrió un error al buscar los pedidos. Por favor, intente nuevamente más tarde.',
    'orders.list.empty.title': 'No se encontraron pedidos',
    'orders.list.empty.description': 'Aún no tiene pedidos quirúrgicos registrados en el sistema.',
    'orders.list.empty.action': 'Crear Nuevo Pedido',
    'orders.list.item.created': 'Creado en',
    'orders.list.item.patient': 'Paciente',
    'orders.list.item.hospital': 'Hospital',
    'orders.list.item.procedure': 'Fecha procedimiento',
    'orders.list.item.doctor': 'Médico',
    'orders.list.item.view': 'Ver detalles',
    'common.back': 'Volver',
  }
};

// Adicionar traduções para cada idioma
export function addOrdersTranslations() {
  addTranslations('pt-BR', translations['pt-BR']);
  addTranslations('en-US', translations['en-US']);
  addTranslations('es-ES', translations['es-ES']);
}