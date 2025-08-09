/**
 * Teste de integração do sistema RG com upload real
 * Simula upload de carteirinha RG através da API existente
 */

import fs from 'fs';
import fetch from 'node-fetch';

// Simular processamento do RG via API
async function testRGUploadIntegration() {
  console.log('🚀 Testando integração RG com sistema de upload...\n');

  try {
    // Simular texto OCR extraído do RG (como seria retornado pelo Google Vision)
    const mockRGText = `
REPÚBLICA FEDERATIVA DO BRASIL
ESTADO DE SÃO PAULO
SECRETARIA DA SEGURANÇA PÚBLICA
INSTITUTO DE IDENTIFICAÇÃO RICARDO GUMBLETON DAUNT
CARTEIRA DE IDENTIDADE
REGISTRO GERAL

48.151.623-42

DANIEL COELHO DA COSTA

FILIAÇÃO
ROSA COELHO DA COSTA
EDIVALDO DA COSTA

NATURALIDADE
SÃO PAULO - SP

19/DEZ/1980

342.002.171-42

DOC. ORIGEM: CERTIDÃO DE NASCIMENTO

VÁLIDA EM TODO O TERRITÓRIO NACIONAL
PROIBIDO PLASTIFICAR
`;

    console.log('📋 Simulando processamento via ExtractionOrchestrator...');
    
    // Importar e usar o sistema real
    const { ExtractionOrchestrator } = await import('./server/services/document-extraction/core/extraction-orchestrator.ts');
    
    // Criar buffer simulado da imagem
    const mockImageBuffer = Buffer.from('mock-image-data', 'utf8');
    
    console.log('🔄 Inicializando orquestrador...');
    const orchestrator = new ExtractionOrchestrator();
    
    // Como o OCR real não está disponível, vamos testar a parte de processamento de texto
    console.log('📄 Processando texto extraído...');
    
    // Simular resultado OCR direto para teste
    const result = await orchestrator.processDocument(mockImageBuffer);
    
    console.log('📊 Resultado do processamento:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Integração bem-sucedida!');
      console.log('📋 Tipo de documento:', result.data.tipoDocumento || 'N/A');
      console.log('👤 Nome extraído:', result.data.nomeCompleto || 'N/A');
      console.log('🆔 RG extraído:', result.data.rg || 'N/A');
      console.log('📄 CPF extraído:', result.data.cpf || 'N/A');
      console.log('📅 Data nascimento:', result.data.dataNascimento || 'N/A');
      console.log('👩 Nome da mãe:', result.data.nomeMae || 'N/A');
      console.log('👨 Nome do pai:', result.data.nomePai || 'N/A');
      console.log('🏠 Naturalidade:', result.data.naturalidade || 'N/A');
      console.log('📊 Confiança:', (result.confidence.overall * 100).toFixed(1) + '%');
    } else {
      console.log('\n❌ Falha na integração:');
      console.log('🚫 Erro:', result.error || 'Erro desconhecido');
    }

  } catch (error) {
    console.error('❌ Erro durante teste de integração:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
testRGUploadIntegration();