import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';

async function extractQRCodeSpecific() {
  try {
    // Configurar credenciais
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials) {
      console.log('❌ Credenciais do Google Cloud não encontradas');
      return;
    }

    let credentialsPath = credentials;
    if (credentials.startsWith('{')) {
      credentialsPath = './temp-google-credentials.json';
      fs.writeFileSync(credentialsPath, credentials);
    }

    const client = new ImageAnnotatorClient({
      keyFilename: credentialsPath
    });
    
    const imagePath = './attached_assets/image_1748614083054.png';
    
    if (!fs.existsSync(imagePath)) {
      console.log('Arquivo não encontrado:', imagePath);
      return;
    }
    
    // Tentar diferentes métodos de detecção
    console.log('🔍 Tentando detecção de texto completa...');
    const [fullTextResult] = await client.documentTextDetection(imagePath);
    
    console.log('🔍 Tentando detecção de recursos web...');
    const [webResult] = await client.webDetection(imagePath);
    
    console.log('🔍 Tentando detecção de rótulos...');
    const [labelResult] = await client.labelDetection(imagePath);
    
    // Analisar texto completo
    if (fullTextResult.fullTextAnnotation) {
      console.log('=== TEXTO COMPLETO DETECTADO ===');
      console.log(fullTextResult.fullTextAnnotation.text);
      console.log('===============================');
    }
    
    // Analisar detecção web
    if (webResult.webDetection && webResult.webDetection.webEntities) {
      console.log('=== ENTIDADES WEB DETECTADAS ===');
      webResult.webDetection.webEntities.forEach((entity, index) => {
        if (entity.description) {
          console.log(`${index + 1}: ${entity.description} (Score: ${entity.score})`);
        }
      });
      console.log('===============================');
    }
    
    // Analisar rótulos
    if (labelResult.labelAnnotations && labelResult.labelAnnotations.length > 0) {
      console.log('=== RÓTULOS DETECTADOS ===');
      labelResult.labelAnnotations.forEach((label, index) => {
        console.log(`${index + 1}: ${label.description} (${(label.score * 100).toFixed(1)}%)`);
      });
      console.log('=========================');
    }
    
    // Limpar arquivo temporário
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
  }
}

extractQRCodeSpecific();