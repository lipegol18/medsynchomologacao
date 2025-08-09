import express, { Express } from 'express';
import path from 'path';
import { log } from './vite';

// Adiciona rotas para servir arquivos estáticos que não sejam
// parte da aplicação principal (Vite)
export function addStaticRoutes(app: Express): void {
  log('Adding static routes for mockups', 'static-routes');
  
  // Middleware para garantir que rotas /api/* sejam tratadas como API e não como rotas estáticas
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') && req.headers.accept?.includes('application/json')) {
      // Garantir que o Content-Type seja definido como application/json
      res.setHeader('Content-Type', 'application/json');
    }
    next();
  });
  
  // Serve os arquivos SVG e HTML dos mockups mobile
  app.use('/mobile-mockups', express.static(path.join(process.cwd(), 'mobile-demo', 'mockups')));
  
  // Serve os arquivos de upload (logos dos hospitais, etc.)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Redireciona para a página de visualização dos mockups
  app.get('/mobile-viewer', (req, res) => {
    res.redirect('/mobile-mockups/index.html');
  });
  
  log('Static routes added successfully', 'static-routes');
}