import { processDocument } from './client/src/lib/document-processor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDocumentProcessing() {
  console.log("🔍 Testando processamento de documento...\n");
  
  const imagePath = path.join(__dirname, 'attached_assets/WhatsApp Image 2025-05-17 at 14.02.49.jpeg');
  
  try {
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Arquivo não encontrado: ${imagePath}`);
      return;
    }
    
    // Criar um objeto File simulado
    const fileBuffer = fs.readFileSync(imagePath);
    const file = new File([fileBuffer], 'document.jpeg', { type: 'image/jpeg' });
    
    console.log("📄 Processando documento com a função processDocument...");
    
    const result = await processDocument(file);
    
    console.log("\n📋 RESULTADO DO PROCESSAMENTO:");
    console.log("=" .repeat(50));
    console.log(JSON.stringify(result, null, 2));
    console.log("=" .repeat(50));
    
    console.log("\n🔍 CAMPOS DETECTADOS:");
    console.log(`Nome: ${result.fullName || 'NÃO DETECTADO'}`);
    console.log(`CPF: ${result.idNumber || 'NÃO DETECTADO'}`);
    console.log(`Data Nascimento: ${result.birthDate || 'NÃO DETECTADO'}`);
    console.log(`Gênero: ${result.gender || 'NÃO DETECTADO'}`);
    
  } catch (error) {
    console.error("❌ Erro ao processar documento:", error);
  }
}

testDocumentProcessing();