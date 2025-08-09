import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuração de pool com retry e timeout aumentados
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

// Evento para monitorar conexões
pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err);
});

// Teste de conexão ao iniciar
(async () => {
  try {
    const client = await pool.connect();
    console.log('Conexão ao PostgreSQL estabelecida com sucesso');
    client.release();
  } catch (err) {
    console.error('Falha ao conectar ao PostgreSQL:', err);
  }
})();

export const db = drizzle({ client: pool, schema });