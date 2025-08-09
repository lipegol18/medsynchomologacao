import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/webhook-service';

/**
 * Middleware que registra o acesso a endpoints selecionados da API
 * Envia notificações de forma assíncrona para o webhook
 * 
 * @param req Objeto de requisição
 * @param res Objeto de resposta 
 * @param next Função de próximo middleware
 */
export const accessMonitorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Obter o caminho original da URL
  const path = req.originalUrl;
  
  // Verificar se é uma rota para monitorar
  if (path.startsWith('/api/') && 
      // Ignorar rotas comuns que gerariam muito ruído
      !path.includes('/notifications') &&  // Ignorar TODAS as rotas de notificação
      !path.includes('/api/user') &&
      // Ignorar rotas que já têm seus próprios webhooks específicos
      !path.includes('/api/register') &&
      !path.includes('/api/login') &&
      !path.includes('/api/logout') &&
      !path.includes('/api/orders') &&
      !path.includes('/api/contact-messages') &&
      req.method !== 'OPTIONS') {
    
    // Usar o método específico para registrar acesso à API
    WebhookService.notifyApiAccess(req, req.user as any);
  }
  
  // Continuar com a requisição
  next();
};