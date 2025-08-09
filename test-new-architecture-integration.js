/**
 * Teste da integração da nova arquitetura modular com o sistema de upload
 * Simula o processo completo de upload de carteirinha
 */

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:5000';

async function testInsuranceCardUpload(imagePath, expectedOperator) {
  console.log(`\n🧪 TESTANDO UPLOAD: ${expectedOperator}`);
  console.log('='.repeat(50));
  
  try {
    // Verificar se arquivo existe
    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Arquivo não encontrado: ${imagePath}`);
      return false;
    }
    
    // Criar FormData para simular upload
    const formData = new FormData();
    formData.append('document', fs.createReadStream(imagePath));
    formData.append('documentType', 'insurance');
    
    console.log('📤 Enviando carteirinha para o servidor...');
    
    // Fazer requisição ao endpoint
    const response = await fetch(`${SERVER_URL}/api/process-document`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        // Adicionar cookie de autenticação se necessário
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Erro HTTP: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const result = await response.json();
    
    console.log('📊 RESULTADO DO PROCESSAMENTO:');
    console.log('Success:', result.success);
    console.log('Architecture:', result.metadata?.architecture || 'unknown');
    console.log('Version:', result.metadata?.version || 'unknown');
    
    if (result.success && result.data) {
      console.log('\n📋 DADOS EXTRAÍDOS:');
      console.log('Operadora:', result.data.operadora || 'Não detectada');
      console.log('Plano:', result.data.plano || 'Não detectado');
      console.log('Número Carteirinha:', result.data.numeroCarteirinha || 'Não extraído');
      console.log('Nome Titular:', result.data.nomeTitular || 'Não extraído');
      console.log('Data Nascimento:', result.data.dataNascimento || 'Não extraída');
      console.log('CNS:', result.data.cns || 'Não extraído');
      console.log('Código ANS:', result.data.ansCode || 'Não extraído');
      
      if (result.metadata?.architecture === 'modular') {
        console.log('\n🆕 NOVA ARQUITETURA UTILIZADA:');
        console.log('Confidence Score:', result.data.confidence?.overall || 'N/A');
        console.log('Detection Method:', result.data.method?.type || 'N/A');
        console.log('Method Details:', result.data.method?.details || 'N/A');
      }
      
      // Verificar se detectou a operadora esperada
      const operadoraMatch = result.data.operadora && 
        result.data.operadora.toLowerCase().includes(expectedOperator.toLowerCase());
      
      if (operadoraMatch) {
        console.log('✅ SUCESSO: Operadora detectada corretamente!');
        return true;
      } else {
        console.log(`⚠️ AVISO: Operadora esperada "${expectedOperator}", detectada "${result.data.operadora}"`);
        return false;
      }
      
    } else {
      console.log('❌ FALHA: Nenhum dado extraído');
      if (result.metadata?.fallbackReason) {
        console.log('Motivo do fallback:', result.metadata.fallbackReason);
      }
      return false;
    }
    
  } catch (error) {
    console.log('❌ ERRO no teste:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 INICIANDO TESTES DE INTEGRAÇÃO DA NOVA ARQUITETURA');
  console.log('='.repeat(70));
  
  // Lista de carteirinhas para testar
  const testCases = [
    {
      path: 'attached_assets/carterinha Bradesco.jpeg',
      expected: 'Bradesco',
      description: 'Carteirinha Bradesco'
    },
    {
      path: 'attached_assets/carteirinha_rosanaRoitman_1749540163771.jpeg',
      expected: 'Amil',
      description: 'Carteirinha Amil'
    },
    // Adicionar mais casos conforme disponibilidade
  ];
  
  let successCount = 0;
  let totalTests = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📄 Testando: ${testCase.description}`);
    totalTests++;
    
    const success = await testInsuranceCardUpload(testCase.path, testCase.expected);
    if (success) {
      successCount++;
    }
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 RESUMO DOS TESTES DE INTEGRAÇÃO:');
  console.log('='.repeat(40));
  console.log(`✅ Sucessos: ${successCount}/${totalTests}`);
  console.log(`❌ Falhas: ${totalTests - successCount}/${totalTests}`);
  console.log(`📈 Taxa de sucesso: ${Math.round((successCount/totalTests) * 100)}%`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('A migração para a nova arquitetura foi bem-sucedida.');
  } else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM');
    console.log('Verifique os logs acima para mais detalhes.');
  }
}

// Função para testar sistema sem fazer requisições HTTP (teste local)
async function testLocalArchitecture() {
  console.log('\n🔧 TESTE LOCAL DA NOVA ARQUITETURA');
  console.log('='.repeat(50));
  
  try {
    // Importar e testar localmente (ajustar para .ts)
    const { documentExtractionService } = await import('./server/services/document-extraction/index.ts');
    
    const testImagePath = 'attached_assets/carterinha Bradesco.jpeg';
    
    if (fs.existsSync(testImagePath)) {
      console.log('📄 Carregando imagem de teste...');
      const imageBuffer = fs.readFileSync(testImagePath);
      
      console.log('🔄 Processando com nova arquitetura...');
      const result = await documentExtractionService.processInsuranceCard(imageBuffer);
      
      console.log('📊 Resultado do teste local:');
      console.log(JSON.stringify(result, null, 2));
      
      return result.success;
    } else {
      console.log('❌ Arquivo de teste não encontrado');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Erro no teste local:', error.message);
    return false;
  }
}

// Executar testes
console.log('🎯 Escolha o tipo de teste:');
console.log('1. Teste local (sem servidor)');
console.log('2. Teste de integração completa (com servidor)');

// Por padrão, executar teste local
testLocalArchitecture()
  .then(success => {
    if (success) {
      console.log('\n✅ Nova arquitetura funcionando localmente!');
      console.log('💡 Para testar integração completa, inicie o servidor e execute teste de integração.');
    } else {
      console.log('\n❌ Nova arquitetura apresentou problemas no teste local.');
    }
  })
  .catch(error => {
    console.error('❌ Erro fatal nos testes:', error);
  });

// Exportar funções para uso manual
export { testInsuranceCardUpload, runIntegrationTests, testLocalArchitecture };