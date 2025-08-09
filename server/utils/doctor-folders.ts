import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Cria as pastas necessárias para organizar as imagens de um médico específico
 * Estrutura: uploads/medicos/{doctorId}/logos/ e uploads/medicos/{doctorId}/assinaturas/
 */
export async function createDoctorFolders(doctorId: number): Promise<{ logoPath: string; signaturePath: string }> {
  const baseDir = join(process.cwd(), 'uploads', 'medicos', doctorId.toString());
  const logoPath = join(baseDir, 'logos');
  const signaturePath = join(baseDir, 'assinaturas');

  try {
    // Cria todas as pastas necessárias recursivamente
    await fs.mkdir(logoPath, { recursive: true });
    await fs.mkdir(signaturePath, { recursive: true });

    console.log(`✅ Pastas criadas para médico ${doctorId}:`);
    console.log(`   - Logos: ${logoPath}`);
    console.log(`   - Assinaturas: ${signaturePath}`);

    return {
      logoPath,
      signaturePath
    };
  } catch (error) {
    console.error(`❌ Erro ao criar pastas para médico ${doctorId}:`, error);
    throw error;
  }
}

/**
 * Retorna os caminhos das pastas de um médico (sem criar se não existirem)
 */
export function getDoctorFolderPaths(doctorId: number): { logoPath: string; signaturePath: string } {
  const baseDir = join(process.cwd(), 'uploads', 'medicos', doctorId.toString());
  
  return {
    logoPath: join(baseDir, 'logos'),
    signaturePath: join(baseDir, 'assinaturas')
  };
}

/**
 * Verifica se as pastas de um médico existem
 */
export async function checkDoctorFoldersExist(doctorId: number): Promise<{ logoExists: boolean; signatureExists: boolean }> {
  const { logoPath, signaturePath } = getDoctorFolderPaths(doctorId);

  try {
    const [logoExists, signatureExists] = await Promise.all([
      fs.access(logoPath).then(() => true).catch(() => false),
      fs.access(signaturePath).then(() => true).catch(() => false)
    ]);

    return { logoExists, signatureExists };
  } catch (error) {
    return { logoExists: false, signatureExists: false };
  }
}