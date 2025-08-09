import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Tipos do suporte de idiomas
export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES';

// Tipo para o objeto de idioma
export interface Language {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

// Estrutura de suporte de idiomas para uso no aplicativo
export const languages: Record<SupportedLanguage, Language> = {
  'pt-BR': {
    code: 'pt-BR',
    name: 'Português',
    flag: '🇧🇷'
  },
  'en-US': {
    code: 'en-US',
    name: 'English',
    flag: '🇺🇸'
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Español',
    flag: '🇪🇸'
  }
};

// Obtém o idioma atual
export function getCurrentLanguage(): Language {
  const lang = i18n.language.split('-')[0];
  
  if (lang === 'pt') return languages['pt-BR'];
  if (lang === 'en') return languages['en-US'];
  if (lang === 'es') return languages['es-ES'];
  
  return languages['pt-BR']; // Default
}

// Altera o idioma da aplicação
export function setLanguage(language: SupportedLanguage) {
  if (language === 'pt-BR') {
    i18n.changeLanguage('pt');
  } else if (language === 'en-US') {
    i18n.changeLanguage('en');
  } else if (language === 'es-ES') {
    i18n.changeLanguage('es');
  }
}

// Função auxiliar de tradução
export function t(key: string, options?: Record<string, any>) {
  return i18n.t(key, options);
}

// Adiciona traduções dinamicamente
export function addTranslations(lang: string, translations: Record<string, any>, namespace: string = 'translation') {
  i18n.addResourceBundle(lang.split('-')[0], namespace, translations, true, true);
}

// Recursos de idiomas
const resources = {
  pt: {
    translation: {
      // Tema
      "theme.toggleLight": "Mudar para tema claro",
      "theme.toggleDark": "Mudar para tema escuro",
      "theme.light": "Claro",
      "theme.dark": "Escuro",
      "theme.system": "Sistema",
      
      // Autenticação
      "auth.welcome": "Bem-vindo ao MedSync",
      "auth.loginOrRegister": "Faça login ou crie uma nova conta",
      "auth.login": "Login",
      "auth.register": "Registrar",
      "auth.username": "Usuário",
      "auth.password": "Senha",
      "auth.email": "E-mail",
      "auth.confirmPassword": "Confirmar Senha",
      "auth.fullName": "Nome Completo",
      "auth.signIn": "Entrar",
      "auth.createAccount": "Criar Conta",
      "auth.heroTitle": "Sistema de Gestão para Ortopedistas",
      "auth.heroDescription": "Plataforma completa para gerenciamento de pacientes, documentos médicos, órteses, próteses e materiais especiais. Agilize seu fluxo de trabalho e concentre-se no que realmente importa: seus pacientes.",
      "auth.feature1Title": "Reconhecimento de Documentos",
      "auth.feature1Description": "Escaneie documentos de pacientes para extração automática de dados.",
      "auth.feature2Title": "Multilíngue",
      "auth.feature2Description": "Suporte completo para português, inglês e espanhol.",
      "auth.feature3Title": "Gerenciamento OPME",
      "auth.feature3Description": "Catálogo completo de materiais e processamento de pedidos.",
      "auth.feature4Title": "Relatórios Detalhados",
      "auth.feature4Description": "Visualize estatísticas e relatórios personalizados.",
      
      // Usuários
      "users.title": "Gerenciamento de Usuários",
      "users.addUser": "Adicionar Usuário",
      "users.id": "ID",
      "users.name": "Nome",
      "users.username": "Usuário",
      "users.email": "E-mail",
      "users.role": "Função",
      "users.actions": "Ações",
      "users.noUsers": "Nenhum usuário encontrado",
      "users.addUserDescription": "Preencha os detalhes para criar um novo usuário no sistema.",
      "users.fullName": "Nome Completo",
      "users.password": "Senha",
      "users.selectRole": "Selecione uma função",
      "users.editUser": "Editar Usuário",
      "users.editUserDescription": "Atualize as informações do usuário selecionado.",
      "users.confirmDelete": "Confirmar Exclusão",
      "users.confirmDeleteDescription": "Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário e todas as suas permissões específicas.",
      "users.userPermissions": "Permissões do Usuário",
      "users.userPermissionsDescription": "Gerenciar permissões específicas para {{username}}",
      "users.inheritedPermissions": "Permissões herdadas da função",
      "users.noInheritedPermissions": "Nenhuma permissão herdada da função",
      "users.specificPermissions": "Permissões específicas do usuário",
      "users.noSpecificPermissions": "Nenhuma permissão específica para este usuário",
      "users.addPermission": "Adicionar Permissão",
      "users.selectPermission": "Selecione uma permissão",
      "users.permissionAction": "Ação",
      "users.grant": "Conceder",
      "users.deny": "Negar",
      "users.granted": "Concedida",
      "users.denied": "Negada",
      
      // Funções
      "roles.title": "Gerenciamento de Funções",
      "roles.addRole": "Adicionar Função",
      "roles.id": "ID",
      "roles.name": "Nome",
      "roles.description": "Descrição",
      "roles.default": "Padrão",
      "roles.createdAt": "Criado em",
      "roles.actions": "Ações",
      "roles.noRoles": "Nenhuma função encontrada",
      "roles.isDefault": "Sim",
      "roles.addRoleDescription": "Crie uma nova função no sistema para agrupar permissões.",
      "roles.setDefault": "Definir como função padrão",
      "roles.editRole": "Editar Função",
      "roles.editRoleDescription": "Atualize as informações da função selecionada.",
      "roles.confirmDelete": "Confirmar Exclusão",
      "roles.confirmDeleteDescription": "Esta ação não pode ser desfeita. Isso excluirá permanentemente a função e todas as suas permissões associadas.",
      "roles.permissions": "Permissões da Função",
      "roles.permissionsDescription": "Gerenciar permissões para a função \"{{roleName}}\"",
      
      // Navegação
      "nav.orders": "Pedidos",
      "nav.patients": "Pacientes",
      "nav.surgeryAppointments": "Agenda Cirúrgica",
      "nav.reports": "Relatórios",

      "nav.contact": "Fale Conosco",
      "nav.hospitals": "Hospitais",
      "nav.catalog": "Catálogo OPME",
      "nav.suppliers": "Fornecedores",
      "nav.insurance_providers": "Operadoras de Saúde",
      "nav.users": "Usuários",
      "nav.roles": "Funções",
      "nav.contact_messages": "Mensagens de Contato",
      "nav.admin": "Administração",
      
      // Contato
      "contact.title": "Fale Conosco",
      "contact.subtitle": "Entre em contato com nossa equipe",
      "contact.name": "Nome",
      "contact.email": "E-mail",
      "contact.whatsapp": "Contato via WhatsApp",
      "contact.whatsapp.description": "Clique para enviar uma mensagem",
      "contact.subject": "Assunto",
      "contact.message": "Mensagem",
      "contact.send": "Enviar Mensagem",
      "contact.success": "Mensagem enviada com sucesso! Entraremos em contato em breve.",
      "contact.error": "Erro ao enviar mensagem. Por favor, tente novamente.",
      "contact.admin.title": "Gerenciamento de Mensagens",
      "contact.admin.subtitle": "Visualize, responda e gerencie as mensagens recebidas pelo formulário de contato",
      "contact.admin.tabs.all": "Todas",
      "contact.admin.tabs.pending": "Pendentes",
      "contact.admin.tabs.responded": "Respondidas",
      "contact.admin.loading": "Carregando mensagens...",
      "contact.admin.empty": "Nenhuma mensagem encontrada",
      "contact.admin.status.pending": "Pendente",
      "contact.admin.status.responded": "Respondida",
      "contact.admin.error": "Erro ao carregar mensagens",
      "contact.admin.from": "De",
      "contact.admin.originalMessage": "Mensagem Original",
      "contact.admin.yourResponse": "Sua Resposta",
      "contact.admin.responseFor": "Respondendo para",
      "contact.admin.respondedAt": "Respondido em",
      "contact.admin.actions.view": "Visualizar",
      "contact.admin.actions.respond": "Responder",
      "contact.admin.actions.delete": "Excluir",
      "contact.admin.actions.sending": "Enviando...",
      "contact.admin.actions.sendResponse": "Enviar Resposta",
      "contact.admin.actions.deleting": "Excluindo...",
      "contact.admin.delete.title": "Excluir Mensagem",
      "contact.admin.delete.confirm": "Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.",
      "contact.admin.response.title": "Responder Mensagem",
      "contact.admin.response.placeholder": "Digite sua resposta aqui...",
      "contact.admin.success.responded": "Mensagem respondida",
      "contact.admin.success.respondedDesc": "A resposta foi enviada com sucesso.",
      "contact.admin.success.deleted": "Mensagem excluída",
      "contact.admin.success.deletedDesc": "A mensagem foi excluída com sucesso.",
      "contact.admin.error.respond": "Erro",
      "contact.admin.error.respondDesc": "Não foi possível responder a mensagem. Tente novamente.",
      "contact.admin.error.delete": "Erro",
      "contact.admin.error.deleteDesc": "Não foi possível excluir a mensagem. Tente novamente.",
      
      // Comuns
      "common.cancel": "Cancelar",
      "common.save": "Salvar",
      "common.delete": "Excluir",
      "common.close": "Fechar",
      "common.address": "Endereço",
      "common.businessHours": "Horário de Atendimento",
      "common.weekdayHours": "Segunda a Sexta: 9h às 18h",
      "common.sending": "Enviando...",
    },
  },
  en: {
    translation: {
      // Theme
      "theme.toggleLight": "Switch to light theme",
      "theme.toggleDark": "Switch to dark theme",
      "theme.light": "Light",
      "theme.dark": "Dark",
      "theme.system": "System",
      
      // Authentication
      "auth.welcome": "Welcome to MedSync",
      "auth.loginOrRegister": "Log in or create a new account",
      "auth.login": "Login",
      "auth.register": "Register",
      "auth.username": "Username",
      "auth.password": "Password",
      "auth.email": "Email",
      "auth.confirmPassword": "Confirm Password",
      "auth.fullName": "Full Name",
      "auth.signIn": "Sign In",
      "auth.createAccount": "Create Account",
      "auth.heroTitle": "Management System for Orthopedists",
      "auth.heroDescription": "Complete platform for managing patients, medical documents, orthoses, prostheses, and special materials. Streamline your workflow and focus on what really matters: your patients.",
      "auth.feature1Title": "Document Recognition",
      "auth.feature1Description": "Scan patient documents for automatic data extraction.",
      "auth.feature2Title": "Multilingual",
      "auth.feature2Description": "Full support for Portuguese, English, and Spanish.",
      "auth.feature3Title": "OPME Management",
      "auth.feature3Description": "Complete catalog of materials and order processing.",
      "auth.feature4Title": "Detailed Reports",
      "auth.feature4Description": "View statistics and custom reports.",
      
      // Users
      "users.title": "User Management",
      "users.addUser": "Add User",
      "users.id": "ID",
      "users.name": "Name",
      "users.username": "Username",
      "users.email": "Email",
      "users.role": "Role",
      "users.actions": "Actions",
      "users.noUsers": "No users found",
      "users.addUserDescription": "Fill in the details to create a new user in the system.",
      "users.fullName": "Full Name",
      "users.password": "Password",
      "users.selectRole": "Select a role",
      "users.editUser": "Edit User",
      "users.editUserDescription": "Update the selected user's information.",
      "users.confirmDelete": "Confirm Deletion",
      "users.confirmDeleteDescription": "This action cannot be undone. This will permanently delete the user and all their specific permissions.",
      "users.userPermissions": "User Permissions",
      "users.userPermissionsDescription": "Manage specific permissions for {{username}}",
      "users.inheritedPermissions": "Permissions inherited from role",
      "users.noInheritedPermissions": "No permissions inherited from role",
      "users.specificPermissions": "User specific permissions",
      "users.noSpecificPermissions": "No specific permissions for this user",
      "users.addPermission": "Add Permission",
      "users.selectPermission": "Select a permission",
      "users.permissionAction": "Action",
      "users.grant": "Grant",
      "users.deny": "Deny",
      "users.granted": "Granted",
      "users.denied": "Denied",
      
      // Roles
      "roles.title": "Role Management",
      "roles.addRole": "Add Role",
      "roles.id": "ID",
      "roles.name": "Name",
      "roles.description": "Description",
      "roles.default": "Default",
      "roles.createdAt": "Created At",
      "roles.actions": "Actions",
      "roles.noRoles": "No roles found",
      "roles.isDefault": "Yes",
      "roles.addRoleDescription": "Create a new role in the system to group permissions.",
      "roles.setDefault": "Set as default role",
      "roles.editRole": "Edit Role",
      "roles.editRoleDescription": "Update the selected role's information.",
      "roles.confirmDelete": "Confirm Deletion",
      "roles.confirmDeleteDescription": "This action cannot be undone. This will permanently delete the role and all its associated permissions.",
      "roles.permissions": "Role Permissions",
      "roles.permissionsDescription": "Manage permissions for the role \"{{roleName}}\"",
      
      // Navigation
      "nav.orders": "Orders",
      "nav.patients": "Patients",
      "nav.reports": "Reports",
      "nav.contact": "Contact Us",
      "nav.hospitals": "Hospitals",
      "nav.catalog": "OPME Catalog",
      "nav.suppliers": "Suppliers",
      "nav.insurance_providers": "Health Insurance Providers",
      "nav.users": "Users",
      "nav.roles": "Roles",
      "nav.contact_messages": "Contact Messages",
      "nav.admin": "Administration",
      
      // Contact
      "contact.title": "Contact Us",
      "contact.subtitle": "Get in touch with our team",
      "contact.name": "Name",
      "contact.email": "Email",
      "contact.whatsapp": "WhatsApp Contact",
      "contact.whatsapp.description": "Click to send a message",
      "contact.subject": "Subject",
      "contact.message": "Message",
      "contact.send": "Send Message",
      "contact.success": "Message sent successfully! We'll get back to you soon.",
      "contact.error": "Error sending message. Please try again.",
      
      // Common
      "common.cancel": "Cancel",
      "common.save": "Save",
      "common.delete": "Delete",
      "common.close": "Close",
      "common.address": "Address",
      "common.businessHours": "Business Hours",
      "common.weekdayHours": "Monday to Friday: 9am to 6pm",
      "common.sending": "Sending...",
    },
  },
  es: {
    translation: {
      // Tema
      "theme.toggleLight": "Cambiar a tema claro",
      "theme.toggleDark": "Cambiar a tema oscuro",
      "theme.light": "Claro",
      "theme.dark": "Oscuro",
      "theme.system": "Sistema",
      
      // Autenticación
      "auth.welcome": "Bienvenido a MedSync",
      "auth.loginOrRegister": "Inicie sesión o cree una nueva cuenta",
      "auth.login": "Iniciar sesión",
      "auth.register": "Registrarse",
      "auth.username": "Usuario",
      "auth.password": "Contraseña",
      "auth.email": "Correo electrónico",
      "auth.confirmPassword": "Confirmar Contraseña",
      "auth.fullName": "Nombre Completo",
      "auth.signIn": "Entrar",
      "auth.createAccount": "Crear Cuenta",
      "auth.heroTitle": "Sistema de Gestión para Ortopedistas",
      "auth.heroDescription": "Plataforma completa para la gestión de pacientes, documentos médicos, órtesis, prótesis y materiales especiales. Agilice su flujo de trabajo y concéntrese en lo que realmente importa: sus pacientes.",
      "auth.feature1Title": "Reconocimiento de Documentos",
      "auth.feature1Description": "Escanee documentos de pacientes para la extracción automática de datos.",
      "auth.feature2Title": "Multilingüe",
      "auth.feature2Description": "Soporte completo para portugués, inglés y español.",
      "auth.feature3Title": "Gestión OPME",
      "auth.feature3Description": "Catálogo completo de materiales y procesamiento de pedidos.",
      "auth.feature4Title": "Informes Detallados",
      "auth.feature4Description": "Visualice estadísticas e informes personalizados.",
      
      // Usuarios
      "users.title": "Gestión de Usuarios",
      "users.addUser": "Añadir Usuario",
      "users.id": "ID",
      "users.name": "Nombre",
      "users.username": "Usuario",
      "users.email": "Correo electrónico",
      "users.role": "Rol",
      "users.actions": "Acciones",
      "users.noUsers": "No se encontraron usuarios",
      "users.addUserDescription": "Complete los detalles para crear un nuevo usuario en el sistema.",
      "users.fullName": "Nombre Completo",
      "users.password": "Contraseña",
      "users.selectRole": "Seleccione un rol",
      "users.editUser": "Editar Usuario",
      "users.editUserDescription": "Actualice la información del usuario seleccionado.",
      "users.confirmDelete": "Confirmar Eliminación",
      "users.confirmDeleteDescription": "Esta acción no se puede deshacer. Esto eliminará permanentemente el usuario y todos sus permisos específicos.",
      "users.userPermissions": "Permisos de Usuario",
      "users.userPermissionsDescription": "Gestionar permisos específicos para {{username}}",
      "users.inheritedPermissions": "Permisos heredados del rol",
      "users.noInheritedPermissions": "No hay permisos heredados del rol",
      "users.specificPermissions": "Permisos específicos del usuario",
      "users.noSpecificPermissions": "No hay permisos específicos para este usuario",
      "users.addPermission": "Añadir Permiso",
      "users.selectPermission": "Seleccione un permiso",
      "users.permissionAction": "Acción",
      "users.grant": "Conceder",
      "users.deny": "Denegar",
      "users.granted": "Concedido",
      "users.denied": "Denegado",
      
      // Roles
      "roles.title": "Gestión de Roles",
      "roles.addRole": "Añadir Rol",
      "roles.id": "ID",
      "roles.name": "Nombre",
      "roles.description": "Descripción",
      "roles.default": "Predeterminado",
      "roles.createdAt": "Creado en",
      "roles.actions": "Acciones",
      "roles.noRoles": "No se encontraron roles",
      "roles.isDefault": "Sí",
      "roles.addRoleDescription": "Cree un nuevo rol en el sistema para agrupar permisos.",
      "roles.setDefault": "Establecer como rol predeterminado",
      "roles.editRole": "Editar Rol",
      "roles.editRoleDescription": "Actualice la información del rol seleccionado.",
      "roles.confirmDelete": "Confirmar Eliminación",
      "roles.confirmDeleteDescription": "Esta acción no se puede deshacer. Esto eliminará permanentemente el rol y todos sus permisos asociados.",
      "roles.permissions": "Permisos del Rol",
      "roles.permissionsDescription": "Gestionar permisos para el rol \"{{roleName}}\"",
      
      // Navegación
      "nav.orders": "Pedidos",
      "nav.patients": "Pacientes",
      "nav.reports": "Informes",
      "nav.contact": "Contáctenos",
      "nav.hospitals": "Hospitales",
      "nav.catalog": "Catálogo OPME",
      "nav.suppliers": "Proveedores",
      "nav.users": "Usuarios",
      "nav.roles": "Roles",
      "nav.contact_messages": "Mensajes de Contacto",
      "nav.admin": "Administración",
      
      // Contacto
      "contact.title": "Contáctenos",
      "contact.subtitle": "Póngase en contacto con nuestro equipo",
      "contact.name": "Nombre",
      "contact.email": "Correo electrónico",
      "contact.whatsapp": "Contacto vía WhatsApp",
      "contact.whatsapp.description": "Haga clic para enviar un mensaje",
      "contact.subject": "Asunto",
      "contact.message": "Mensaje",
      "contact.send": "Enviar Mensaje",
      "contact.success": "¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.",
      "contact.error": "Error al enviar el mensaje. Por favor, inténtelo de nuevo.",
      
      // Común
      "common.cancel": "Cancelar",
      "common.save": "Guardar",
      "common.delete": "Eliminar",
      "common.close": "Cerrar",
      "common.address": "Dirección",
      "common.businessHours": "Horario de Atención",
      "common.weekdayHours": "Lunes a Viernes: 9h a 18h",
      "common.sending": "Enviando...",
    },
  },
};

// Configuração do i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt', // Idioma padrão
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false, // Não é necessário escapar HTML com React
    },
  });

export default i18n;