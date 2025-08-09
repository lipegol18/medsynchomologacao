import i18n from "../i18n";

export function addOrderDetailsTranslations() {
  i18n.addResourceBundle("pt", "translation", {
    orderDetails: {
      title: "Detalhes do Pedido",
      backButton: "Voltar para pedidos",
      generalInfo: {
        title: "Informações Gerais",
        description: "Dados principais do pedido médico",
        procedureData: "Dados do procedimento",
        doctorResponsible: "Médico responsável",
        procedureType: "Tipo do procedimento",
        surgeryCharacter: "Caráter da cirurgia",
        hospitalizationRegime: "Regime de internação",
        observations: "Observações médicas",
        noObservations: "Nenhuma observação registrada"
      },
      patient: "Paciente",
      hospital: "Hospital",
      procedureDate: "Data do procedimento",
      notScheduled: "Não agendado",
      complexity: "Complexidade",
      tabs: {
        general: "Geral",
        diagnostics: "Diagnósticos",
        procedures: "Procedimentos",
        materials: "Materiais OPME",
        exams: "Exames"
      },
      diagnostics: {
        title: "Diagnósticos",
        description: "Códigos CID-10 e diagnósticos do paciente",
        noDiagnostics: "Nenhum diagnóstico registrado para este pedido",
        descriptionNotAvailable: "Descrição não disponível"
      },
      procedures: {
        title: "Procedimentos",
        description: "Detalhes dos procedimentos solicitados",
        noProcedures: "Nenhum procedimento detalhado registrado",
        code: "Código",
        side: "Lado",
        accessRoute: "Via de acesso",
        technique: "Técnica"
      },
      materials: {
        title: "Materiais OPME",
        description: "Órteses, próteses e materiais especiais solicitados",
        noMaterials: "Nenhum material OPME registrado para este pedido",
        code: "Código",
        preferredSupplier: "Fornecedor preferido",
        quantity: "Qtd"
      },
      exams: {
        title: "Exames",
        description: "Imagens e documentos anexados ao pedido",
        noExams: "Nenhum exame anexado a este pedido",
        viewLarge: "Ver ampliado",
        medicalReport: "Laudo médico",
        viewReport: "Visualizar laudo",
        medicalReportDocument: "Documento de laudo médico"
      },
      loading: "Carregando detalhes do pedido...",
      error: {
        title: "Erro ao carregar detalhes do pedido",
        description: "Não foi possível obter as informações do pedido solicitado."
      }
    }
  });

  i18n.addResourceBundle("en", "translation", {
    orderDetails: {
      title: "Order Details",
      backButton: "Back to orders",
      generalInfo: {
        title: "General Information",
        description: "Main medical order data",
        procedureData: "Procedure data",
        doctorResponsible: "Responsible doctor",
        procedureType: "Procedure type",
        surgeryCharacter: "Surgery character",
        hospitalizationRegime: "Hospitalization regime",
        observations: "Medical observations",
        noObservations: "No observations recorded"
      },
      patient: "Patient",
      hospital: "Hospital",
      procedureDate: "Procedure date",
      notScheduled: "Not scheduled",
      complexity: "Complexity",
      tabs: {
        general: "General",
        diagnostics: "Diagnostics",
        procedures: "Procedures",
        materials: "OPME Materials",
        exams: "Exams"
      },
      diagnostics: {
        title: "Diagnostics",
        description: "ICD-10 codes and patient diagnostics",
        noDiagnostics: "No diagnostics recorded for this order",
        descriptionNotAvailable: "Description not available"
      },
      procedures: {
        title: "Procedures",
        description: "Details of requested procedures",
        noProcedures: "No detailed procedures recorded",
        code: "Code",
        side: "Side",
        accessRoute: "Access route",
        technique: "Technique"
      },
      materials: {
        title: "OPME Materials",
        description: "Orthoses, prostheses and special materials requested",
        noMaterials: "No OPME materials recorded for this order",
        code: "Code",
        preferredSupplier: "Preferred supplier",
        quantity: "Qty"
      },
      exams: {
        title: "Exams",
        description: "Images and documents attached to the order",
        noExams: "No exams attached to this order",
        viewLarge: "View large",
        medicalReport: "Medical report",
        viewReport: "View report",
        medicalReportDocument: "Medical report document"
      },
      loading: "Loading order details...",
      error: {
        title: "Error loading order details",
        description: "Could not get the requested order information."
      }
    }
  });

  i18n.addResourceBundle("es", "translation", {
    orderDetails: {
      title: "Detalles del Pedido",
      backButton: "Volver a pedidos",
      generalInfo: {
        title: "Información General",
        description: "Datos principales del pedido médico",
        procedureData: "Datos del procedimiento",
        doctorResponsible: "Médico responsable",
        procedureType: "Tipo de procedimiento",
        surgeryCharacter: "Carácter de la cirugía",
        hospitalizationRegime: "Régimen de hospitalización",
        observations: "Observaciones médicas",
        noObservations: "Ninguna observación registrada"
      },
      patient: "Paciente",
      hospital: "Hospital",
      procedureDate: "Fecha del procedimiento",
      notScheduled: "No programado",
      complexity: "Complejidad",
      tabs: {
        general: "General",
        diagnostics: "Diagnósticos",
        procedures: "Procedimientos",
        materials: "Materiales OPME",
        exams: "Exámenes"
      },
      diagnostics: {
        title: "Diagnósticos",
        description: "Códigos CIE-10 y diagnósticos del paciente",
        noDiagnostics: "Ningún diagnóstico registrado para este pedido",
        descriptionNotAvailable: "Descripción no disponible"
      },
      procedures: {
        title: "Procedimientos",
        description: "Detalles de los procedimientos solicitados",
        noProcedures: "Ningún procedimiento detallado registrado",
        code: "Código",
        side: "Lado",
        accessRoute: "Vía de acceso",
        technique: "Técnica"
      },
      materials: {
        title: "Materiales OPME",
        description: "Órtesis, prótesis y materiales especiales solicitados",
        noMaterials: "Ningún material OPME registrado para este pedido",
        code: "Código",
        preferredSupplier: "Proveedor preferido",
        quantity: "Cant"
      },
      exams: {
        title: "Exámenes",
        description: "Imágenes y documentos adjuntos al pedido",
        noExams: "Ningún examen adjunto a este pedido",
        viewLarge: "Ver ampliado",
        medicalReport: "Informe médico",
        viewReport: "Ver informe",
        medicalReportDocument: "Documento de informe médico"
      },
      loading: "Cargando detalles del pedido...",
      error: {
        title: "Error al cargar detalles del pedido",
        description: "No se pudo obtener la información del pedido solicitado."
      }
    }
  });
}