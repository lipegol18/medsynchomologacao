import { Router, Request, Response } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Middleware de autenticação
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.user) {
    next();
  } else {
    res.status(401).json({ error: 'Usuário não autenticado' });
  }
}

// Função para criar nomes de arquivo padronizados
function createStandardizedFileName(patientId: number, orderId: number, fileType: string, ext: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let counter = 1;
  
  try {
    counter = Math.floor(Math.random() * 100) + 1;
  } catch (error) {
    counter = Date.now() % 100;
  }
  
  const paddedCounter = counter.toString().padStart(2, '0');
  const fileName = `${fileType}_${paddedCounter}_${dateStr}${ext}`;
  
  console.log(`📁 ARQUIVO CRIADO: ${orderId}/${fileType}/${fileName}`);
  
  return fileName;
}

// Configuração do storage temporário
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = file.fieldname === 'report' ? 'laudos' : 'exames';
    const uploadPath = path.join(process.cwd(), 'uploads', 'temp', type);
    
    console.log(`📁 Upload temporário para: temp/${type}`);
    
    if (!fs.existsSync(uploadPath)) {
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`📁 Diretório temporário criado: ${uploadPath}`);
      } catch (error) {
        console.error(`❌ Erro ao criar diretório temporário ${uploadPath}:`, error);
      }
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

export function setupUploadRoutes(app: any) {
  
  // Rota para upload de imagem de exame
  app.post('/api/uploads/exam-image', isAuthenticated, (req: Request, res: Response) => {
    console.log('🔍 INÍCIO DO UPLOAD DE IMAGEM DE EXAME');
    
    try {
      upload.single('image')(req, res, function(err) {
        if (err) {
          console.error('Erro ao fazer upload de imagem:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        
        // Extrair orderId após processamento do multer
        const orderIdRaw = req.body.orderId;
        const orderId = orderIdRaw && orderIdRaw !== '' ? parseInt(orderIdRaw, 10) : null;
        
        console.log('🔍 Dados processados pelo multer:', {
          orderIdRaw,
          orderId: orderId || 'inválido',
          tempFilePath: req.file.path,
          userAuthenticated: !!req.user,
          userId: req.user?.id,
          workingDirectory: process.cwd(),
          nodeEnv: process.env.NODE_ENV
        });
        
        // Mover arquivo para estrutura final
        const fileName = path.basename(req.file.path);
        const tempPath = req.file.path;
        
        let finalPath;
        let filePath;
        
        if (orderId && orderId > 0) {
          // Estrutura unificada: /uploads/orders/[ID]/exames/
          const finalDir = path.join(process.cwd(), 'uploads', 'orders', `${orderId}`, 'exames');
          finalPath = path.join(finalDir, fileName);
          filePath = `/uploads/orders/${orderId}/exames/${fileName}`;
          
          console.log(`🔍 EXAM IMAGE - Verificando diretório: ${finalDir}`);
          console.log(`🔍 EXAM IMAGE - Diretório existe? ${fs.existsSync(finalDir)}`);
          console.log(`🔍 EXAM IMAGE - Working directory: ${process.cwd()}`);
          
          // Criar diretório final se não existe
          if (!fs.existsSync(finalDir)) {
            try {
              fs.mkdirSync(finalDir, { recursive: true });
              console.log(`✅ EXAM IMAGE - Diretório criado: ${finalDir}`);
              
              if (fs.existsSync(finalDir)) {
                console.log(`✅ EXAM IMAGE - Confirmado: Diretório existe após criação`);
              } else {
                console.error(`❌ EXAM IMAGE - ERRO: Diretório não existe após criação`);
              }
            } catch (createError) {
              console.error(`❌ EXAM IMAGE - ERRO ao criar diretório:`, createError);
              return res.status(500).json({ error: 'Falha ao criar estrutura de diretórios' });
            }
          } else {
            console.log(`✅ EXAM IMAGE - Diretório já existe: ${finalDir}`);
          }
          
          // Mover arquivo da pasta temporária para final
          console.log(`🔍 EXAM IMAGE - Movendo arquivo:`);
          console.log(`  Origem: ${tempPath} (existe: ${fs.existsSync(tempPath)})`);
          console.log(`  Destino: ${finalPath}`);
          
          try {
            fs.renameSync(tempPath, finalPath);
            console.log(`✅ EXAM IMAGE - Arquivo movido: ${tempPath} → ${finalPath}`);
            
            if (fs.existsSync(finalPath)) {
              console.log(`✅ EXAM IMAGE - Confirmado: Arquivo existe no destino`);
            } else {
              console.error(`❌ EXAM IMAGE - ERRO: Arquivo não existe no destino após movimento`);
            }
          } catch (error) {
            console.error(`❌ EXAM IMAGE - Erro ao mover:`, error);
            try {
              fs.copyFileSync(tempPath, finalPath);
              fs.unlinkSync(tempPath);
              console.log(`✅ EXAM IMAGE - Arquivo copiado: ${tempPath} → ${finalPath}`);
            } catch (copyError) {
              console.error(`❌ EXAM IMAGE - ERRO CRÍTICO:`, copyError);
              return res.status(500).json({ error: 'Falha ao mover arquivo' });
            }
          }
        } else {
          console.error('❌ EXAM IMAGE - orderId inválido, não é possível organizar arquivo');
          return res.status(400).json({ error: 'ID do pedido é obrigatório para upload' });
        }
        
        console.log(`Upload de imagem bem sucedido: ${fileName}`);
        console.log(`Local físico final: ${finalPath}`);
        console.log(`URL: ${filePath}`);
        
        res.status(200).json({ 
          url: filePath,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de imagem:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });
  
  // Rota para upload de laudo médico
  app.post('/api/uploads/medical-report', isAuthenticated, (req: Request, res: Response) => {
    try {
      upload.single('report')(req, res, function(err) {
        if (err) {
          console.error('Erro ao fazer upload de laudo:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        
        // Extrair orderId após processamento do multer
        const orderIdRaw = req.body.orderId;
        const orderId = orderIdRaw && orderIdRaw !== '' ? parseInt(orderIdRaw, 10) : null;
        
        console.log('🔍 Upload de laudo - dados processados:', {
          orderIdRaw,
          orderId: orderId || 'inválido',
          tempFilePath: req.file.path
        });
        
        // Mover arquivo para estrutura final
        const fileName = req.file.filename;
        const tempPath = req.file.path;
        
        let finalPath;
        let filePath;
        
        if (orderId && orderId > 0) {
          // Estrutura unificada: /uploads/orders/[ID]/laudos/
          const finalDir = path.join(process.cwd(), 'uploads', 'orders', `${orderId}`, 'laudos');
          finalPath = path.join(finalDir, fileName);
          filePath = `/uploads/orders/${orderId}/laudos/${fileName}`;
          
          // Criar diretório final se não existe
          if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
            console.log(`📁 Diretório final criado para laudo: ${finalDir}`);
          }
          
          // Mover arquivo da pasta temporária para final
          try {
            fs.renameSync(tempPath, finalPath);
            console.log(`📦 Laudo movido: ${tempPath} → ${finalPath}`);
          } catch (error) {
            console.error(`❌ Erro ao mover laudo:`, error);
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            console.log(`📦 Laudo copiado e removido: ${tempPath} → ${finalPath}`);
          }
        } else {
          console.error('❌ orderId inválido para laudo');
          return res.status(400).json({ error: 'ID do pedido é obrigatório para upload' });
        }
        
        console.log(`Upload de laudo bem sucedido: ${fileName}`);
        console.log(`Local físico final: ${finalPath}`);
        console.log(`URL: ${filePath}`);
        
        res.status(200).json({ 
          url: filePath,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de laudo:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });

  // Rota para upload de PDF do pedido médico (seguindo padrão das imagens de exame)
  app.post('/api/uploads/order-pdf', isAuthenticated, (req: Request, res: Response) => {
    console.log('📄 INÍCIO DO UPLOAD DE PDF DO PEDIDO');
    
    try {
      upload.single('pdf')(req, res, function(err) {
        if (err) {
          console.error('Erro ao fazer upload de PDF:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
        }
        
        // Extrair orderId após processamento do multer
        const orderIdRaw = req.body.orderId;
        const orderId = orderIdRaw && orderIdRaw !== '' ? parseInt(orderIdRaw, 10) : null;
        
        console.log('📄 Dados processados pelo multer:', {
          orderIdRaw,
          orderId: orderId || 'inválido',
          tempFilePath: req.file.path,
          userAuthenticated: !!req.user,
          userId: req.user?.id
        });
        
        // Mover arquivo para estrutura final
        const fileName = path.basename(req.file.path);
        const tempPath = req.file.path;
        
        let finalPath;
        let filePath;
        
        if (orderId && orderId > 0) {
          // Estrutura unificada: /uploads/orders/[ID]/documentos/
          const finalDir = path.join(process.cwd(), 'uploads', 'orders', `${orderId}`, 'documentos');
          finalPath = path.join(finalDir, fileName);
          filePath = `/uploads/orders/${orderId}/documentos/${fileName}`;
          
          // Criar diretório final se não existe
          if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
            console.log(`📁 Diretório final criado: ${finalDir}`);
          }
          
          // Mover arquivo da pasta temporária para final
          try {
            fs.renameSync(tempPath, finalPath);
            console.log(`📦 Arquivo movido: ${tempPath} → ${finalPath}`);
          } catch (error) {
            console.error(`❌ Erro ao mover arquivo:`, error);
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            console.log(`📦 Arquivo copiado e removido: ${tempPath} → ${finalPath}`);
          }
        } else {
          console.error('❌ orderId inválido, não é possível organizar arquivo PDF');
          return res.status(400).json({ error: 'ID do pedido é obrigatório para upload de PDF' });
        }
        
        console.log(`Upload de PDF bem sucedido: ${fileName}`);
        console.log(`Local físico final: ${finalPath}`);
        console.log(`URL: ${filePath}`);
        
        // Atualizar o pedido médico adicionando PDF aos attachments
        (async () => {
          try {
            console.log(`🔄 Adicionando PDF aos attachments do pedido ${orderId}: ${filePath}`);
            
            const { db } = await import('./db');
            const { medicalOrders } = await import('../shared/schema');
            const { eq } = await import('drizzle-orm');
            
            // Buscar attachments atuais
            const currentOrder = await db.select({ attachments: medicalOrders.attachments })
              .from(medicalOrders)
              .where(eq(medicalOrders.id, orderId))
              .limit(1);
              
            const currentAttachments = currentOrder[0]?.attachments || [];
            
            // Criar novo attachment para o PDF
            const pdfAttachment = {
              id: `pdf_${Date.now()}`,
              url: filePath,
              size: req.file.size,
              type: 'pdf',
              filename: req.file.originalname || fileName,
              uploadedAt: new Date().toISOString()
            };
            
            // **CORREÇÃO CRÍTICA**: NÃO remover PDFs existentes, apenas identificar se é PDF gerado pelo sistema
            const filename = req.file.originalname || fileName;
            const isSystemGeneratedPdf = filename.includes(`pedido_${orderId}_`) || filename.includes(`order_${orderId}_`);
            

            
            let updatedAttachments;
            if (isSystemGeneratedPdf) {
              // Se for PDF gerado pelo sistema, remover apenas PDFs gerados anteriormente pelo sistema
              const filteredAttachments = currentAttachments.filter((att: any) => {
                if (att.type !== 'pdf') return true; // Manter não-PDFs
                const existingFilename = att.filename || '';
                const isExistingSystemPdf = existingFilename.includes(`pedido_${orderId}_`) || existingFilename.includes(`order_${orderId}_`);
                return !isExistingSystemPdf; // Manter PDFs que NÃO são gerados pelo sistema
              });
              updatedAttachments = [...filteredAttachments, pdfAttachment];
              console.log(`🔄 PDF gerado pelo sistema - removendo apenas PDFs gerados anteriormente, mantendo PDFs do usuário`);
            } else {
              // Se for PDF enviado pelo usuário, apenas adicionar aos attachments existentes
              updatedAttachments = [...currentAttachments, pdfAttachment];
              console.log(`🔄 PDF enviado pelo usuário - mantendo todos os attachments existentes`);
            }
            
            const updateResult = await db.update(medicalOrders)
              .set({ 
                attachments: updatedAttachments,
                updatedAt: new Date()
              })
              .where(eq(medicalOrders.id, orderId))
              .returning();
              
            console.log(`✅ Pedido ${orderId} atualizado com PDF nos attachments`);
            console.log(`📊 PDF attachment adicionado:`, pdfAttachment);
          } catch (dbError) {
            console.error(`❌ Erro ao atualizar attachments do pedido ${orderId}:`, dbError);
          }
        })();
        
        res.status(200).json({ 
          url: filePath,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de PDF:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });

  // Rota para deletar arquivo
  app.delete('/api/uploads/file', isAuthenticated, (req: Request, res: Response) => {
    try {
      const { fileUrl } = req.body;
      
      if (!fileUrl) {
        return res.status(400).json({ error: 'URL do arquivo é obrigatória' });
      }
      
      console.log('🗑️ Solicitação de exclusão de arquivo:', fileUrl);
      
      // Converter URL relativa para caminho físico
      let filePath: string;
      if (fileUrl.startsWith('/uploads/')) {
        filePath = path.join(process.cwd(), fileUrl);
      } else if (fileUrl.startsWith('uploads/')) {
        filePath = path.join(process.cwd(), fileUrl);
      } else {
        return res.status(400).json({ error: 'URL de arquivo inválida' });
      }
      
      console.log('🗑️ Tentando excluir arquivo físico:', filePath);
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        console.log('⚠️ Arquivo não encontrado:', filePath);
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }
      
      // Excluir o arquivo
      try {
        fs.unlinkSync(filePath);
        console.log('✅ Arquivo excluído com sucesso:', filePath);
        res.status(200).json({ 
          success: true, 
          message: 'Arquivo excluído com sucesso' 
        });
      } catch (deleteError) {
        console.error('❌ Erro ao excluir arquivo:', deleteError);
        res.status(500).json({ error: 'Erro ao excluir arquivo do sistema' });
      }
      
    } catch (error) {
      console.error('❌ Erro no endpoint de exclusão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para servir os arquivos de upload (estáticos)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}