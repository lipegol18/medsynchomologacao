import { ImageAnnotatorClient } from '@google-cloud/vision';
import { fromPath } from 'pdf2pic';
import fs from 'fs';
import path from 'path';

async function extractPDFData(pdfPath) {
  try {
    // Configurar credenciais do Google Vision
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials) {
      console.log('Credenciais do Google Cloud não encontradas');
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

    if (!fs.existsSync(pdfPath)) {
      console.log('Arquivo PDF não encontrado:', pdfPath);
      return;
    }

    console.log('Convertendo PDF para imagem...');
    
    // Configurar conversão PDF para imagem
    const convert = fromPath(pdfPath, {
      density: 300,           // DPI alta para melhor qualidade OCR
      saveFilename: "page",
      savePath: "./temp_images",
      format: "png",
      width: 2000,
      height: 2000
    });

    // Converter primeira página
    const result = await convert(1, { responseType: "image" });
    
    if (!result) {
      console.log('Erro na conversão do PDF para imagem');
      return;
    }

    console.log('Conversão concluída. Extraindo texto da imagem...');
    
    // Processar a imagem convertida com Google Vision
    const imagePath = result.path;
    const [visionResult] = await client.documentTextDetection(imagePath);

    if (visionResult.fullTextAnnotation) {
      const extractedText = visionResult.fullTextAnnotation.text;
      console.log('=== TEXTO EXTRAÍDO DO PDF ===');
      console.log(extractedText);
      console.log('=============================');
      
      // Extrair dados específicos da CNH
      const cnhData = extractCNHInfo(extractedText);
      
      console.log('=== DADOS DA CNH IDENTIFICADOS ===');
      console.log('Nome:', cnhData.nome || 'Não encontrado');
      console.log('CPF:', cnhData.cpf || 'Não encontrado');
      console.log('Data de Nascimento:', cnhData.dataNascimento || 'Não encontrada');
      console.log('Número do Registro:', cnhData.numeroRegistro || 'Não encontrado');
      console.log('Categoria:', cnhData.categoria || 'Não encontrada');
      console.log('Validade:', cnhData.validade || 'Não encontrada');
      console.log('Local:', cnhData.local || 'Não encontrado');
      console.log('Filiação:', cnhData.filiacao || 'Não encontrada');
      console.log('==================================');
    } else {
      console.log('Nenhum texto foi extraído da imagem convertida');
    }

    // Limpeza dos arquivos temporários
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      if (fs.existsSync('./temp_images')) {
        fs.rmSync('./temp_images', { recursive: true, force: true });
      }
      if (credentialsPath === './temp-google-credentials.json') {
        fs.unlinkSync(credentialsPath);
      }
    } catch (cleanupError) {
      console.log('Aviso: Erro na limpeza de arquivos temporários');
    }

  } catch (error) {
    console.error('Erro no processamento:', error.message);
    
    // Limpeza em caso de erro
    try {
      if (fs.existsSync('./temp_images')) {
        fs.rmSync('./temp_images', { recursive: true, force: true });
      }
      if (fs.existsSync('./temp-google-credentials.json')) {
        fs.unlinkSync('./temp-google-credentials.json');
      }
    } catch (e) {}
  }
}

function extractCNHInfo(text) {
  const cnhData = {};
  
  // Padrões aprimorados para CNH
  const patterns = {
    nome: /(?:NOME|Nome)[:\s]+([A-ZÁÊÇÃÕÂÍÚÓ\s]+?)(?:\n|CPF|DOCUMENTO)/i,
    cpf: /(?:CPF|Cpf)[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-\s]?\d{2})/i,
    dataNascimento: /(?:DATA DE NASCIMENTO|NASCIMENTO|Data)[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
    numeroRegistro: /(?:REGISTRO|N°\s*REGISTRO|Nº)[:\s]*(\d+)/i,
    categoria: /(?:CATEGORIA|Cat)[:\s]*([A-E]+)/i,
    validade: /(?:VALIDADE|Valid)[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
    local: /(?:LOCAL|Expedido)[:\s]*([A-ZÁÊÇÃÕÂÍ\s]+,\s*[A-Z]{2})/i,
    filiacao: /(?:FILIAÇÃO|Filiação)[:\s]*([A-ZÁÊÇÃÕÂÍÚÓ\s\/\-]+?)(?:\n|PERMISSÃO|VALIDADE)/i
  };
  
  // Buscar cada padrão no texto
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      cnhData[key] = match[1].trim().replace(/\s+/g, ' ');
    }
  }
  
  return cnhData;
}

// Executar com o arquivo PDF da CNH
const pdfPath = './attached_assets/CNH-e.pdf (1).pdf';
extractPDFData(pdfPath);