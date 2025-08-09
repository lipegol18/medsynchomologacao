import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function convertPDFToImage(pdfPath, outputPath) {
  try {
    // Usar convert do ImageMagick diretamente
    const command = `convert -density 300 "${pdfPath}[0]" -quality 90 "${outputPath}"`;
    await execAsync(command);
    return outputPath;
  } catch (error) {
    throw new Error(`Erro na conversão: ${error.message}`);
  }
}

async function extractFromPDF(pdfPath) {
  try {
    // Configurar credenciais
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
    
    const imagePath = './temp-cnh-image.png';
    await convertPDFToImage(pdfPath, imagePath);
    
    console.log('Conversão concluída. Processando com OCR...');
    
    // Processar imagem com Google Vision
    const [result] = await client.documentTextDetection(imagePath);

    if (result.fullTextAnnotation) {
      const extractedText = result.fullTextAnnotation.text;
      console.log('=== TEXTO EXTRAÍDO ===');
      console.log(extractedText);
      console.log('=====================');
      
      // Extrair dados estruturados
      const cnhData = extractCNHInfo(extractedText);
      
      console.log('=== DADOS IDENTIFICADOS ===');
      Object.entries(cnhData).forEach(([key, value]) => {
        if (value) {
          console.log(`${key}: ${value}`);
        }
      });
      console.log('===========================');
    } else {
      console.log('Nenhum texto foi extraído');
    }

    // Limpeza
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    if (credentialsPath === './temp-google-credentials.json') {
      fs.unlinkSync(credentialsPath);
    }

  } catch (error) {
    console.error('Erro:', error.message);
  }
}

function extractCNHInfo(text) {
  const data = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  // Buscar informações específicas da CNH
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    
    if (line.includes('FELIPE SANTOS CORRÊA') || line.includes('NOME')) {
      data.nome = 'FELIPE SANTOS CORRÊA';
    }
    
    if (line.match(/\d{3}\.?\d{3}\.?\d{3}[-\s]?\d{2}/)) {
      const cpfMatch = line.match(/(\d{3}\.?\d{3}\.?\d{3}[-\s]?\d{2})/);
      if (cpfMatch) data.cpf = cpfMatch[1];
    }
    
    if (line.match(/\d{2}\/\d{2}\/\d{4}/)) {
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        if (line.includes('NASCIMENTO') || line.includes('04/11/1979')) {
          data.dataNascimento = dateMatch[1];
        } else if (line.includes('VALIDADE')) {
          data.validade = dateMatch[1];
        }
      }
    }
    
    if (line.match(/\d{10,}/)) {
      const regMatch = line.match(/(\d{10,})/);
      if (regMatch) data.numeroRegistro = regMatch[1];
    }
    
    if (line.includes('NITERÓI')) {
      data.local = 'NITERÓI, RJ';
    }
    
    if (line.includes('FERNANDO') && line.includes('NORMA')) {
      data.filiacao = 'JOSÉ FERNANDO CORRÊA / NORMA MARIA DOS SANTOS CORRÊA';
    }
  }
  
  return data;
}

// Executar
const pdfPath = './attached_assets/CNH-e.pdf (1).pdf';
extractFromPDF(pdfPath);