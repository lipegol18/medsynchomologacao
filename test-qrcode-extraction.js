import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';

async function extractQRCode() {
  try {
    // Verificar se as credenciais estão disponíveis
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials) {
      console.log('❌ Credenciais do Google Cloud não encontradas');
      return;
    }

    // Criar arquivo temporário com as credenciais se necessário
    let credentialsPath = credentials;
    if (credentials.startsWith('{')) {
      // Se for JSON, criar arquivo temporário
      credentialsPath = './temp-google-credentials.json';
      fs.writeFileSync(credentialsPath, credentials);
    }

    // Criar cliente da Vision API
    const client = new ImageAnnotatorClient({
      keyFilename: credentialsPath
    });
    
    // Caminho para a imagem do QR Code
    const imagePath = './attached_assets/image_1748614083054.png';
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(imagePath)) {
      console.log('Arquivo não encontrado:', imagePath);
      return;
    }
    
    // Tentar detecção específica de QR Code primeiro
    const [qrResult] = await client.textDetection(imagePath);
    
    // Também tentar com detecção de objetos para QR codes
    const [objectResult] = await client.objectLocalization(imagePath);
    
    console.log('Tentando detecção de texto...');
    const detections = qrResult.textAnnotations;
    
    console.log('Tentando detecção de objetos...');
    const objects = objectResult.localizedObjectAnnotations;
    
    if (detections && detections.length > 0) {
      console.log('=== CONTEÚDO DO QR CODE (TEXTO DETECTADO) ===');
      console.log(detections[0].description);
      console.log('=========================');
    } else {
      console.log('Nenhum texto detectado na imagem');
    }
    
    if (objects && objects.length > 0) {
      console.log('=== OBJETOS DETECTADOS ===');
      objects.forEach((object, index) => {
        console.log(`Objeto ${index + 1}: ${object.name} (${(object.score * 100).toFixed(1)}%)`);
      });
      console.log('=========================');
    } else {
      console.log('Nenhum objeto detectado na imagem');
    }
    
    // Limpar arquivo temporário se foi criado
    if (credentialsPath === './temp-google-credentials.json') {
      fs.unlinkSync(credentialsPath);
    }
    
  } catch (error) {
    console.error('Erro ao processar QR Code:', error.message);
    
    // Limpar arquivo temporário em caso de erro
    try {
      if (fs.existsSync('./temp-google-credentials.json')) {
        fs.unlinkSync('./temp-google-credentials.json');
      }
    } catch (e) {}
    
    if (error.message.includes('API key') || error.message.includes('authentication')) {
      console.log('⚠️  A API key do Google Vision pode não estar configurada ou ser inválida');
    }
  }
}

extractQRCode();