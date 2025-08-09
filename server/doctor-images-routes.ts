import { Express, Request, Response } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { isAuthenticated, hasPermission } from './auth';
import { createDoctorFolders, getDoctorFolderPaths } from './utils/doctor-folders';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      const imageType = req.params.imageType; // 'logo' ou 'assinatura'
      
      // Cria as pastas se não existirem
      await createDoctorFolders(doctorId);
      
      const { logoPath, signaturePath } = getDoctorFolderPaths(doctorId);
      const destinationPath = imageType === 'logo' ? logoPath : signaturePath;
      
      cb(null, destinationPath);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const doctorId = req.params.doctorId;
    const imageType = req.params.imageType;
    const timestamp = Date.now();
    const extension = extname(file.originalname);
    
    // Nome do arquivo: {imageType}_{doctorId}_{timestamp}.{ext}
    const filename = `${imageType}_${doctorId}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Aceita apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  }
});

export function registerDoctorImageRoutes(app: Express) {
  
  // POST - Upload de logo do médico
  app.post('/api/doctors/:doctorId/logo', 
    isAuthenticated, 
    upload.single('logo'),
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);
        const userId = (req as any).user?.id;
        const userRoleId = (req as any).user?.roleId;
        
        // Verifica se o usuário alvo é médico (roleId 2) ou administrador (roleId 1)
        const targetUser = await db.select({ roleId: users.roleId })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);

        if (targetUser.length === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (targetUser[0].roleId !== 1 && targetUser[0].roleId !== 2) {
          return res.status(403).json({ error: 'Apenas administradores e médicos podem ter logo associado' });
        }
        
        // Verifica se o médico está tentando atualizar sua própria imagem ou se tem permissão de admin
        if (userId !== doctorId && userRoleId !== 1) {
          return res.status(403).json({ error: 'Não autorizado a atualizar imagens de outro usuário' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
        }

        // Remove logo anterior se existir
        const existingDoctor = await db.select({ logoUrl: users.logoUrl })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);

        if (existingDoctor.length > 0 && existingDoctor[0].logoUrl) {
          try {
            const oldFilePath = join(process.cwd(), existingDoctor[0].logoUrl);
            await fs.unlink(oldFilePath);
            console.log(`🗑️ Logo anterior removido: ${oldFilePath}`);
          } catch (error) {
            console.warn('Logo anterior não encontrado para remoção');
          }
        }

        // Constrói a URL relativa para o arquivo
        const logoUrl = `/uploads/medicos/${doctorId}/logos/${req.file.filename}`;

        // Atualiza o campo logo_url no banco de dados
        await db.update(users)
          .set({ logoUrl })
          .where(eq(users.id, doctorId));

        console.log(`✅ Logo atualizado para médico ${doctorId}: ${logoUrl}`);
        
        res.json({
          success: true,
          logoUrl,
          message: 'Logo atualizado com sucesso'
        });

      } catch (error) {
        console.error('Erro ao fazer upload do logo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );

  // POST - Upload de assinatura do médico
  app.post('/api/doctors/:doctorId/assinatura',
    isAuthenticated,
    upload.single('assinatura'),
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);
        const userId = (req as any).user?.id;
        const userRoleId = (req as any).user?.roleId;
        
        // Verifica se o usuário alvo é médico (roleId 2) ou administrador (roleId 1)
        const targetUser = await db.select({ roleId: users.roleId })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);

        if (targetUser.length === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (targetUser[0].roleId !== 1 && targetUser[0].roleId !== 2) {
          return res.status(403).json({ error: 'Apenas administradores e médicos podem ter assinatura associada' });
        }
        
        // Verifica se o médico está tentando atualizar sua própria imagem ou se tem permissão de admin
        if (userId !== doctorId && userRoleId !== 1) {
          return res.status(403).json({ error: 'Não autorizado a atualizar imagens de outro usuário' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
        }

        // Remove assinatura anterior se existir
        const existingDoctor = await db.select({ signatureUrl: users.signatureUrl })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);

        if (existingDoctor.length > 0 && existingDoctor[0].signatureUrl) {
          try {
            const oldFilePath = join(process.cwd(), existingDoctor[0].signatureUrl);
            await fs.unlink(oldFilePath);
            console.log(`🗑️ Assinatura anterior removida: ${oldFilePath}`);
          } catch (error) {
            console.warn('Assinatura anterior não encontrada para remoção');
          }
        }

        // Constrói a URL relativa para o arquivo
        const signatureUrl = `/uploads/medicos/${doctorId}/assinaturas/${req.file.filename}`;

        // Atualiza o campo signature_url no banco de dados
        await db.update(users)
          .set({ signatureUrl })
          .where(eq(users.id, doctorId));

        console.log(`✅ Assinatura atualizada para médico ${doctorId}: ${signatureUrl}`);
        
        res.json({
          success: true,
          signatureUrl,
          message: 'Assinatura atualizada com sucesso'
        });

      } catch (error) {
        console.error('Erro ao fazer upload da assinatura:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );

  // GET - Buscar informações das imagens do médico
  app.get('/api/doctors/:doctorId/images',
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);
        
        // Busca as URLs das imagens no banco de dados
        const doctor = await db.select({
          logoUrl: users.logoUrl,
          signatureUrl: users.signatureUrl
        })
        .from(users)
        .where(eq(users.id, doctorId))
        .limit(1);

        if (doctor.length === 0) {
          return res.status(404).json({ error: 'Médico não encontrado' });
        }

        res.json({
          doctorId,
          logoUrl: doctor[0].logoUrl,
          signatureUrl: doctor[0].signatureUrl
        });

      } catch (error) {
        console.error('Erro ao buscar imagens do médico:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );

  // DELETE - Remover logo do médico
  app.delete('/api/doctors/:doctorId/logo',
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);
        const userId = (req as any).user?.id;
        const userRoleId = (req as any).user?.roleId;
        
        // Verifica se o usuário alvo é médico (roleId 2) ou administrador (roleId 1)
        const targetUser = await db.select({ roleId: users.roleId })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);

        if (targetUser.length === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (targetUser[0].roleId !== 1 && targetUser[0].roleId !== 2) {
          return res.status(403).json({ error: 'Apenas administradores e médicos podem ter logo associado' });
        }
        
        // Verifica permissões
        if (userId !== doctorId && userRoleId !== 1) {
          return res.status(403).json({ error: 'Não autorizado a remover imagens de outro usuário' });
        }

        // Busca a URL atual do logo
        const doctor = await db.select({ logoUrl: users.logoUrl })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);

        if (doctor.length === 0) {
          return res.status(404).json({ error: 'Médico não encontrado' });
        }

        // Remove o arquivo físico se existir
        if (doctor[0].logoUrl) {
          try {
            const filePath = join(process.cwd(), doctor[0].logoUrl);
            await fs.unlink(filePath);
            console.log(`✅ Arquivo de logo removido: ${filePath}`);
          } catch (fileError) {
            console.warn('Arquivo de logo não encontrado para remoção:', fileError);
          }
        }

        // Remove a URL do banco de dados
        await db.update(users)
          .set({ logoUrl: null })
          .where(eq(users.id, doctorId));

        res.json({
          success: true,
          message: 'Logo removido com sucesso'
        });

      } catch (error) {
        console.error('Erro ao remover logo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );

  // DELETE - Remover assinatura do médico
  app.delete('/api/doctors/:doctorId/assinatura',
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);
        const userId = (req as any).user?.id;
        const userRoleId = (req as any).user?.roleId;
        
        // Verifica se o usuário alvo é médico (roleId 2) ou administrador (roleId 1)
        const targetUser = await db.select({ roleId: users.roleId })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);

        if (targetUser.length === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (targetUser[0].roleId !== 1 && targetUser[0].roleId !== 2) {
          return res.status(403).json({ error: 'Apenas administradores e médicos podem ter assinatura associada' });
        }
        
        // Verifica permissões
        if (userId !== doctorId && userRoleId !== 1) {
          return res.status(403).json({ error: 'Não autorizado a remover imagens de outro usuário' });
        }

        // Busca a URL atual da assinatura
        const doctor = await db.select({ signatureUrl: users.signatureUrl })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);

        if (doctor.length === 0) {
          return res.status(404).json({ error: 'Médico não encontrado' });
        }

        // Remove o arquivo físico se existir
        if (doctor[0].signatureUrl) {
          try {
            const filePath = join(process.cwd(), doctor[0].signatureUrl);
            await fs.unlink(filePath);
            console.log(`✅ Arquivo de assinatura removido: ${filePath}`);
          } catch (fileError) {
            console.warn('Arquivo de assinatura não encontrado para remoção:', fileError);
          }
        }

        // Remove a URL do banco de dados
        await db.update(users)
          .set({ signatureUrl: null })
          .where(eq(users.id, doctorId));

        res.json({
          success: true,
          message: 'Assinatura removida com sucesso'
        });

      } catch (error) {
        console.error('Erro ao remover assinatura:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );
}