/**
 * Teste do sistema RG em produção com texto direto
 * Simula o processamento que acontece após OCR
 */

import { DocumentTypeDetector } from './server/services/document-extraction/detectors/document-type-detector.js';

// Texto exato do RG Rio Grande do Sul que falhou
const textoRGRS = `16/SET/2016
VÁLIDA EM TODO O TERRITÓRIO NACIONAL
REGISTRO 7.753.319
GERAL
NOME
FILIAÇÃO
JULIANA COSTA DA SILVA
SERGIO LUIZ ALVES DA SILVA
MARA REGINA COSTA DA SILVA
NATURALIDADE
DATA DE NASCIMENTO
PORTO ALEGRE RS
DOC. ORIGEM
11/11/1984
CERT. NASC. 72586 LV A-182 FL 119
CART. 4ª ZONA-PORTO ALEGRE RS
CPF 010.249.990-09
SÃO JOSÉ - SC
PAULO HENRIQUE DOS SANTOS
Perito Criminal
Diretor do Instituto de Identificação - IGP/SC
ASSINATURA DO DIRETOR
LEI Nº 7.116 DE 29/08/83
THOMAS GREG & SONS`;

async function testProductionRG() {
  console.log('🧪 Testando sistema de produção RG...\n');
  
  console.log('📄 Texto do RG (Rio Grande do Sul):');
  console.log(textoRGRS);
  console.log('\n' + '='.repeat(80) + '\n');
  
  console.log('🔍 Executando detecção de documento...');
  
  try {
    // Testar exatamente como o sistema de produção faz
    const result = DocumentTypeDetector.detectDocumentType(textoRGRS);
    
    console.log('\n📋 Resultado final:');
    console.log('Tipo:', result.type);
    console.log('Subtipo:', result.subtype);
    console.log('Confiança:', (result.confidence * 100).toFixed(1) + '%');
    
    if (result.type === 'RG_IDENTITY') {
      console.log('\n✅ SUCESSO: RG detectado corretamente!');
      console.log('🔄 Sistema deveria usar nova arquitetura');
    } else {
      console.log('\n❌ PROBLEMA: RG não detectado como identidade');
      console.log('🔄 Sistema vai usar fallback antigo (com bugs)');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testProductionRG();