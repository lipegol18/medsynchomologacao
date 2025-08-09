import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Verificar se stored é válido
  if (!stored || typeof stored !== 'string') {
    console.error('Senha armazenada inválida:', stored);
    return false;
  }

  // Detectar formato da senha: bcrypt começa com $2b$, scrypt contém ponto
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    // Formato bcrypt (senhas antigas)
    try {
      return await bcrypt.compare(supplied, stored);
    } catch (error) {
      console.error('Erro ao comparar senha bcrypt:', error);
      return false;
    }
  } else if (stored.includes('.') && stored.split('.').length === 2) {
    // Formato scrypt (senhas novas) - deve ter exatamente um ponto
    try {
      const [hashed, salt] = stored.split(".");
      
      // Verificar se hash e salt são válidos
      if (!hashed || !salt) {
        console.error('Hash ou salt inválido na senha scrypt');
        return false;
      }
      
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error('Erro ao comparar senha scrypt:', error);
      return false;
    }
  } else {
    // Formato não reconhecido
    console.error('Formato de senha não reconhecido:', stored.substring(0, 20) + '...');
    return false;
  }
}