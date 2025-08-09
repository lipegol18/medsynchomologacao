import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testPDFConversion() {
  try {
    const pdfPath = './attached_assets/CNH-e.pdf (1).pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ Arquivo PDF não encontrado:', pdfPath);
      return;
    }
    
    console.log('📄 Arquivo PDF encontrado');
    console.log('🔄 Convertendo PDF para imagem...');
    
    // Converter PDF para imagem usando ImageMagick
    const outputPath = `${pdfPath}.png`;
    const command = `convert -density 300 "${pdfPath}[0]" -quality 90 "${outputPath}"`;
    
    await execAsync(command);
    console.log('✅ PDF convertido para imagem com sucesso');
    
    // Verificar se as credenciais estão disponíveis
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials) {
      console.log('⚠️  Credenciais do Google Cloud não encontradas - simulando OCR...');
      
      // Simular dados extraídos da CNH baseado no conteúdo do PDF
      const simulatedExtraction = {
        fullName: 'NOME DO CONDUTOR',
        cpf: '000.000.000-00',
        birthDate: '01/01/1990',
        cnh: '00000000000',
        category: 'B',
        expiryDate: '01/01/2030',
        gender: 'M'
      };
      
      console.log('\n📋 Dados simulados extraídos da CNH:');
      console.log('Nome:', simulatedExtraction.fullName);
      console.log('CPF:', simulatedExtraction.cpf);
      console.log('Data de Nascimento:', simulatedExtraction.birthDate);
      console.log('CNH:', simulatedExtraction.cnh);
      console.log('Categoria:', simulatedExtraction.category);
      console.log('Validade:', simulatedExtraction.expiryDate);
      console.log('Gênero:', simulatedExtraction.gender);
      
      return simulatedExtraction;
    }
    
    // Se tiver credenciais, fazer OCR real
    let credentialsPath = credentials;
    if (credentials.startsWith('{')) {
      credentialsPath = './temp-google-credentials.json';
      fs.writeFileSync(credentialsPath, credentials);
    }
    
    const client = new ImageAnnotatorClient({
      keyFilename: credentialsPath
    });
    
    console.log('🔍 Extraindo texto com Google Vision API...');
    
    const imageBuffer = fs.readFileSync(outputPath);
    const [result] = await client.textDetection({
      image: { content: imageBuffer }
    });
    
    const detections = result.textAnnotations;
    const extractedText = detections && detections.length > 0 ? detections[0].description : '';
    
    console.log('\n📝 Texto extraído:');
    console.log(extractedText);
    
    // Processar dados da CNH
    const cnhData = processCNHDocument(extractedText);
    
    console.log('\n📋 Dados extraídos da CNH:');
    console.log(JSON.stringify(cnhData, null, 2));
    
    // Limpar arquivos temporários
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    if (credentialsPath.includes('temp-google-credentials.json') && fs.existsSync(credentialsPath)) {
      fs.unlinkSync(credentialsPath);
    }
    
    return cnhData;
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

function processCNHDocument(text) {
  const data = {};
  
  // Extrair nome
  const nameMatch = text.match(/Nome[:\s]+([A-ZÁÊÔ\s]+)/i);
  if (nameMatch) {
    data.fullName = nameMatch[1].trim();
  }
  
  // Extrair CPF
  const cpfMatch = text.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
  if (cpfMatch) {
    data.cpf = cpfMatch[1];
  }
  
  // Extrair data de nascimento
  const birthMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (birthMatch) {
    data.birthDate = birthMatch[1];
  }
  
  // Extrair número da CNH
  const cnhMatch = text.match(/(?:CNH|Registro)[:\s]+(\d+)/i);
  if (cnhMatch) {
    data.cnh = cnhMatch[1];
  }
  
  // Extrair categoria
  const categoryMatch = text.match(/(?:Categoria|Cat)[:\s]+([ABCDE]+)/i);
  if (categoryMatch) {
    data.category = categoryMatch[1];
  }
  
  // Extrair validade
  const validityMatch = text.match(/(?:Validade|Valid)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
  if (validityMatch) {
    data.expiryDate = validityMatch[1];
  }
  
  // Extrair gênero
  const genderMatch = text.match(/(?:Sexo)[:\s]+([MF])/i);
  if (genderMatch) {
    data.gender = genderMatch[1];
  }
  
  return data;
}

// Executar teste
testPDFConversion();