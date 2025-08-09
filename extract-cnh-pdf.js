import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';

async function extractCNHData() {
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
    
    const pdfPath = './attached_assets/CNH-e.pdf (1).pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.log('Arquivo PDF não encontrado:', pdfPath);
      return;
    }
    
    console.log('🔍 Processando CNH em PDF...');
    
    // Verificar tamanho do arquivo
    const stats = fs.statSync(pdfPath);
    console.log(`📊 Tamanho do arquivo: ${stats.size} bytes`);
    
    // Ler o arquivo PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    const inputConfig = {
      mimeType: 'application/pdf',
      content: pdfBuffer.toString('base64')
    };

    console.log(`📋 Configuração do input preparada (${inputConfig.content.length} caracteres base64)`);

    // Processar o PDF com OCR usando asyncBatchAnnotateFiles para PDFs
    const request = {
      requests: [{
        inputConfig: inputConfig,
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' },
          { type: 'TEXT_DETECTION' }
        ],
        outputConfig: {
          gcsDestination: {
            uri: null // Será processado em memória
          }
        }
      }]
    };

    console.log('🔄 Enviando requisição para API...');
    
    // Tentar método simples primeiro
    const [result] = await client.documentTextDetection({
      image: inputConfig
    });
    
    console.log('✅ Resposta recebida da API');

    console.log('📄 Analisando conteúdo extraído...');
    
    // Debug da resposta completa
    console.log('🔍 Estrutura da resposta:', Object.keys(result));
    
    if (result.error) {
      console.log('❌ Erro na API:', result.error);
    }
    
    if (result.textAnnotations && result.textAnnotations.length > 0) {
      console.log('📝 Anotações de texto encontradas:', result.textAnnotations.length);
      console.log('=== TEXTO DAS ANOTAÇÕES ===');
      console.log(result.textAnnotations[0].description);
      console.log('===========================');
    }
    
    if (result.fullTextAnnotation) {
      const extractedText = result.fullTextAnnotation.text;
      console.log('=== TEXTO COMPLETO EXTRAÍDO ===');
      console.log(extractedText);
      console.log('===============================');
      
      // Extrair informações específicas da CNH
      const cnhData = extractCNHInfo(extractedText);
      
      console.log('=== DADOS DA CNH EXTRAÍDOS ===');
      console.log('Nome:', cnhData.nome || 'Não encontrado');
      console.log('CPF:', cnhData.cpf || 'Não encontrado');
      console.log('Data de Nascimento:', cnhData.dataNascimento || 'Não encontrada');
      console.log('Número do Registro:', cnhData.numeroRegistro || 'Não encontrado');
      console.log('Categoria:', cnhData.categoria || 'Não encontrada');
      console.log('Validade:', cnhData.validade || 'Não encontrada');
      console.log('Local:', cnhData.local || 'Não encontrado');
      console.log('Filiação:', cnhData.filiacao || 'Não encontrada');
      console.log('===============================');
    } else {
      console.log('❌ Nenhum texto foi extraído do PDF');
    }
    
    // Verificar se há páginas adicionais
    if (result.responses && result.responses.length > 1) {
      console.log(`📄 Documento tem ${result.responses.length} páginas`);
      result.responses.forEach((response, index) => {
        if (response.fullTextAnnotation) {
          console.log(`=== PÁGINA ${index + 1} ===`);
          console.log(response.fullTextAnnotation.text);
          console.log('==================');
        }
      });
    }
    
    // Limpar arquivo temporário
    if (credentialsPath === './temp-google-credentials.json') {
      fs.unlinkSync(credentialsPath);
    }
    
  } catch (error) {
    console.error('Erro ao processar CNH PDF:', error.message);
    
    // Limpar arquivo temporário em caso de erro
    try {
      if (fs.existsSync('./temp-google-credentials.json')) {
        fs.unlinkSync('./temp-google-credentials.json');
      }
    } catch (e) {}
  }
}

function extractCNHInfo(text) {
  const cnhData = {};
  
  // Padrões de busca para CNH
  const patterns = {
    nome: /NOME[:\s]+([A-ZÁÊÇÃÕÂÍ\s]+)/i,
    cpf: /CPF[:\s]+(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i,
    dataNascimento: /(?:DATA DE NASCIMENTO|NASCIMENTO)[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    numeroRegistro: /(?:REGISTRO|Nº REGISTRO)[:\s]+(\d+)/i,
    categoria: /CATEGORIA[:\s]+([A-Z]+)/i,
    validade: /VALIDADE[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    local: /LOCAL[:\s]+([A-Z\s]+,\s*[A-Z]{2})/i,
    filiacao: /FILIAÇÃO[:\s]+([A-ZÁÊÇÃÕÂÍ\s\/]+)/i
  };
  
  // Extrair cada campo
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      cnhData[key] = match[1].trim();
    }
  }
  
  return cnhData;
}

extractCNHData();