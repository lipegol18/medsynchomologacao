const fs = require('fs');
const { extractTextFromImage, processIdentityDocument } = require('./server/services/google-vision.ts');

async function testGoogleVision() {
  try {
    console.log('Testando Google Vision API com o documento fornecido...');
    
    // Ler o arquivo de imagem
    const imagePath = './attached_assets/WhatsApp Image 2025-05-17 at 14.02.49.jpeg';
    
    if (!fs.existsSync(imagePath)) {
      console.error('Arquivo não encontrado:', imagePath);
      return;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    console.log('Arquivo carregado, tamanho:', imageBuffer.length, 'bytes');
    
    // Extrair texto da imagem
    const extractedText = await extractTextFromImage(imageBuffer);
    console.log('=== TEXTO EXTRAÍDO ===');
    console.log(extractedText);
    console.log('======================');
    
    // Processar como documento de identidade
    const processedData = processIdentityDocument(extractedText);
    console.log('=== DADOS PROCESSADOS ===');
    console.log(JSON.stringify(processedData, null, 2));
    console.log('=========================');
    
  } catch (error) {
    console.error('Erro no teste:', error);
    
    if (error.message.includes('API key')) {
      console.log('\nPossível problema com a chave da API do Google Cloud.');
      console.log('Verifique se a GOOGLE_CLOUD_API_KEY está configurada corretamente.');
    }
  }
}

testGoogleVision();