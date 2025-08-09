import { User, MedicalOrder, ContactMessage, Supplier } from "@shared/schema";
import fetch from "node-fetch";

// URLs do webhook - facilita alterações futuras e testes
// A primeira URL na lista será usada como padrão
const WEBHOOK_URLS = {
 // n8n: "https://lipegol18.app.n8n.cloud/webhook/webhook",
 // testing: "https://lipegol18.app.n8n.cloud/webhook-test/webhook",
 // local: "http://localhost:8080/webhook",
};

// URL atual do webhook - use a URL de teste do webhook.site que sempre funciona
// IMPORTANTE: Como não temos acesso ao webhook externo, vamos usar sempre o modo de teste (testMode=true)
// Isso permite que possamos testar a formatação dos dados sem tentar enviar para um endpoint externo
//const WEBHOOK_URL = WEBHOOK_URLS.n8n; // Usando o webhook real do n8n

// Flag global para controlar se devemos forçar o modo de teste para todos os webhooks
const FORCE_TEST_MODE = false; // Modo real ativado - os webhooks serão enviados

/**
 * Serviço para enviar notificações para o webhook externo
 * Implementado com tratamento de erro para não impactar a aplicação principal
 */
export class WebhookService {
  /**
   * Notifica o acesso a uma API
   * @param req Requisição HTTP
   * @param user Usuário que fez a requisição (opcional)
   */
  static notifyApiAccess(req: any, user?: any): void {
    // Obter informações da requisição
    const path = req.originalUrl;
    const method = req.method;
    const userAgent = req.headers['user-agent'];
    
    // Dados para a notificação
    const data = {
      event: "api_access",
      timestamp: new Date().toISOString(),
      path,
      method,
      userAgent,
      user: user ? {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      } : null,
    };
    
    this.sendNotification(data, true); // Usar modo de teste para não sobrecarregar
  }
  
  /**
   * Envia uma notificação para o webhook de forma assíncrona
   * @param data Os dados a serem enviados para o webhook
   * @param testMode Se true, apenas loga os dados sem enviar para o webhook
   * @param verbose Se true, loga os detalhes da requisição e resposta
   */
  static async sendNotification(
    data: any,
    testMode: boolean = false, // trocar aqui a variavel para trocar os modos dev/prod
    verbose: boolean = false,
  ): Promise<void> {
    try {
      // Aplicar o modo de teste forçado se a flag global estiver ativa
      const effectiveTestMode = testMode || FORCE_TEST_MODE;

      if (verbose) {
        console.log("================ WEBHOOK NOTIFICATION ================");
        console.log("URL:", WEBHOOK_URL);
        console.log("Modo de teste:", effectiveTestMode ? "SIM" : "NÃO");
        console.log("Dados:", JSON.stringify(data, null, 2));
        console.log("=====================================================");
      } else {
        console.log(
          `Notificação webhook: ${data.event} [${effectiveTestMode ? "TESTE" : "ENVIO REAL"}]`,
        );
      }

      // Se estiver em modo de teste, apenas loga e não envia
      if (effectiveTestMode) {
        console.log(
          "MODO DE TESTE: Notificação não enviada para o webhook externo",
        );
        return;
      }

      // Envio real para o webhook
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (verbose) {
        const responseText = await response.text();
        console.log("============ WEBHOOK RESPONSE ============");
        console.log("Status:", response.status);
        console.log("Response:", responseText);
        console.log("=========================================");

        if (!response.ok) {
          console.error(
            `Erro na resposta do webhook: ${response.status} - ${responseText}`,
          );
        }
      }
    } catch (error) {
      // Apenas logamos o erro sem afetar o fluxo da aplicação
      console.error("Erro ao enviar para webhook:", error);
    }
  }

  /**
   * Notifica sobre um acesso de usuário
   * @param user O usuário que acessou o sistema
   * @param verbose Se true, mostra informações adicionais nos logs
   */
  static notifyUserAccess(user: User, verbose: boolean = false): void {
    // Registrar informações detalhadas sobre o login do usuário para fins de auditoria
    console.log(`==== USUÁRIO LOGADO: ${user.username} (${user.name}) ====`);
    console.log(
      `ID: ${user.id} | Função: ${user.roleId} | Email: ${user.email}`,
    );
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Criar payload para notificação
    const data = {
      event: "user_access",
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.roleId,
      },
      metadata: {
        accessTime: new Date().toISOString(),
        eventType: "login",
      },
    };

    // Enviar notificação com log detalhado se solicitado
    this.sendNotification(data, false, verbose);

    // Registrar finalização do processo
    console.log(`Notificação de acesso registrada: ${user.username}`);
  }

  /**
   * Notifica sobre a criação de um novo usuário
   * @param user O usuário que foi criado
   */
  static notifyNewUser(user: User): void {
    const data = {
      event: "new_user_created",
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.roleId,
        createdAt: new Date().toISOString(),
      },
    };

    this.sendNotification(data);
  }
  /**
   * Notifica sobre a resposta a uma mensagem de contato
   * @param message A mensagem de contato que foi respondida
   * @param respondedBy ID do usuário que respondeu a mensagem
   */
  static notifyContactMessageResponse(
    message: ContactMessage,
    respondedBy: number,
  ): void {
    const data = {
      event: "contact_message_responded",
      timestamp: new Date().toISOString(),
      message: {
        id: message.id,
        name: message.name,
        email: message.email,
        subject: message.subject,
        status: message.status,
        responseDate: message.responseDate,
      },
      respondedBy: respondedBy,
      metadata: {
        eventType: "response",
        notificationType: "notification",
      },
    };

    this.sendNotification(data);
  }
  
  /**
   * Notifica sobre a criação de um novo pedido médico
   * @param order O pedido médico que foi criado
   */
  static notifyNewOrder(order: MedicalOrder): void {
    const data = {
      event: "new_order_created",
      timestamp: new Date().toISOString(),
      order: {
        id: order.id,
        patientId: order.patientId,
        userId: order.userId,
        hospitalId: order.hospitalId,
        status: order.status,
        createdAt: order.createdAt
      },
      metadata: {
        eventType: "creation",
        notificationType: "notification"
      }
    };

    this.sendNotification(data);
  }
  
  /**
   * Notifica sobre a mudança de status de um pedido médico
   * @param order O pedido médico que teve seu status alterado
   * @param oldStatus O status anterior do pedido
   * @param updatedBy ID do usuário que atualizou o pedido
   */
  static notifyOrderStatusChange(
    order: MedicalOrder,
    oldStatus: string,
    updatedBy: number
  ): void {
    const data = {
      event: "order_status_changed",
      timestamp: new Date().toISOString(),
      order: {
        id: order.id,
        patientId: order.patientId,
        userId: order.userId,
        hospitalId: order.hospitalId,
        oldStatus: oldStatus,
        newStatus: order.status,
        updatedAt: order.updatedAt
      },
      updatedBy: updatedBy,
      metadata: {
        eventType: "status_change",
        notificationType: "notification"
      }
    };

    this.sendNotification(data);
  }

  /**
   * Método utilitário para testar o sistema de notificações
   * Pode ser usado pela interface administrativa para testar a configuração do webhook
   *
   * @param eventType Tipo de evento a ser testado
   * @param testMode Se true, apenas loga os dados sem enviar para o webhook
   * @param verbose Se true, loga mais detalhes do processo
   * @param userData Dados do usuário que está realizando o teste (opcional)
   * @returns Um objeto com o resultado do teste
   */
  static testWebhook(
    eventType: string = "test_event",
    testMode: boolean = false,
    verbose: boolean = false,
    userData?: { id: number; username: string; name?: string },
  ): { success: boolean; message: string; data: any } {
    try {
      // Criar payload de teste
      const testData = {
        event: eventType,
        timestamp: new Date().toISOString(),
        source: "webhook_test_utility",
        testId: Math.floor(Math.random() * 1000000),
        user: userData || null,
        metadata: {
          testMode,
          verbose,
          testDate: new Date().toISOString(),
        },
      };

      // Enviar notificação
      this.sendNotification(testData, testMode, verbose);

      return {
        success: true,
        message: `Teste de webhook [${eventType}] executado com sucesso`,
        data: testData,
      };
    } catch (error) {
      console.error("Erro ao executar teste de webhook:", error);
      return {
        success: false,
        message: `Erro ao executar teste de webhook: ${(error as Error).message}`,
        data: { error: (error as Error).message },
      };
    }
  }
}
