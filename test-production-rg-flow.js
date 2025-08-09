/**
 * Teste completo do fluxo de produção para RG
 * Simula exatamente o que acontece quando um RG é enviado via API
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Texto real do RG Rio Grande do Sul que estava falhando
const RG_RS_TEXT = `REPÚBLICA FEDERATIVA DO BRASIL
ESTADO DO RIO GRANDE DO SUL
SECRETARIA DA SEGURANÇA PÚBLICA
INSTITUTO-GERAL DE PERÍCIAS
DEPARTAMENTO DE IDENTIFICAÇÃO

CARTEIRA DE IDENTIDADE
REGISTRO GERAL

37.456.789-42

BEATRIZ SASS CORRÊA

FILIAÇÃO
MARIA HELENA SASS
JOÃO CARLOS CORRÊA

NATURALIDADE
PORTO ALEGRE - RS

12/ABR/1985

423.789.456-89

DOC. ORIGEM: CERTIDÃO DE NASCIMENTO

VÁLIDA EM TODO O TERRITÓRIO NACIONAL`;

async function testProductionRGFlow() {
  console.log('🚀 Testando fluxo completo de RG em produção...\n');

  try {
    // Primeiro, simular o processamento direto via API
    console.log('📋 Texto do RG a ser processado:');
    console.log(RG_RS_TEXT.substring(0, 200) + '...\n');

    // Importar e testar a nova arquitetura diretamente
    console.log('🆕 Testando nova arquitetura diretamente...');
    
    const { ExtractionOrchestrator } = await import('./server/services/document-extraction/core/extraction-orchestrator.ts');
    const { GoogleVisionOCREngine } = await import('./server/services/document-extraction/core/ocr-engine.ts');
    
    const orchestrator = new ExtractionOrchestrator();
    
    // Simular buffer de imagem (em produção seria real)
    const mockImageBuffer = Buffer.from('fake-image-data');
    
    console.log('🔄 Processando documento com nova arquitetura...');
    const result = await orchestrator.processDocument(mockImageBuffer);
    
    console.log('\n📋 Resultado da nova arquitetura:');
    console.log('Sucesso:', result.success);
    console.log('Dados:', JSON.stringify(result.data, null, 2));
    console.log('Confiança:', JSON.stringify(result.confidence, null, 2));
    console.log('Método:', JSON.stringify(result.method, null, 2));
    
    if (result.errors) {
      console.log('Erros:', result.errors);
    }

    // Testar também o detector de tipo de documento
    console.log('\n🔍 Testando detector de tipo de documento separadamente...');
    const { DocumentTypeDetector } = await import('./server/services/document-extraction/detectors/document-type-detector.js');
    
    const documentType = DocumentTypeDetector.detectDocumentType(RG_RS_TEXT);
    console.log('Tipo detectado:', documentType.type);
    console.log('Subtipo:', documentType.subtype);
    console.log('Confiança:', (documentType.confidence * 100).toFixed(1) + '%');

    // Testar o orquestrador de identidade diretamente
    console.log('\n🆔 Testando IdentityOrchestrator diretamente...');
    const { IdentityOrchestrator } = await import('./server/services/document-extraction/identity-extractors/identity-orchestrator.js');
    
    const identityOrchestrator = new IdentityOrchestrator();
    const identityResult = await identityOrchestrator.processIdentityDocument(RG_RS_TEXT);
    
    console.log('\n📋 Resultado do IdentityOrchestrator:');
    console.log('Sucesso:', identityResult.success);
    if (identityResult.data) {
      console.log('Nome:', identityResult.data.fullName);
      console.log('RG:', identityResult.data.rg);
      console.log('CPF:', identityResult.data.cpf);
      console.log('Data Nascimento:', identityResult.data.birthDate);
    }
    console.log('Confiança:', JSON.stringify(identityResult.confidence, null, 2));
    console.log('Método:', JSON.stringify(identityResult.method, null, 2));
    
    if (identityResult.errors) {
      console.log('Erros:', identityResult.errors);
    }

    // Testar o fallback do sistema legado
    console.log('\n🔄 Testando sistema legado para comparação...');
    const { processIdentityDocument } = await import('./server/services/google-vision.js');
    
    const legacyResult = processIdentityDocument(RG_RS_TEXT);
    console.log('\n📋 Resultado do sistema legado:');
    console.log('Nome:', legacyResult.fullName || 'Não encontrado');
    console.log('RG:', legacyResult.idNumber || 'Não encontrado');
    console.log('CPF:', legacyResult.cpf || 'Não encontrado');
    console.log('Data Nascimento:', legacyResult.dataNascimento || 'Não encontrado');

    return {
      newArchitecture: result,
      documentType,
      identityResult,
      legacyResult
    };

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return null;
  }
}

// Executar teste
testProductionRGFlow().then(results => {
  if (results) {
    console.log('\n✅ Teste completo finalizado');
    console.log('\n📊 RESUMO COMPARATIVO:');
    console.log('Nova arquitetura funciona:', results.newArchitecture.success);
    console.log('IdentityOrchestrator funciona:', results.identityResult.success);
    console.log('Sistema legado extrai nome:', results.legacyResult.fullName ? 'SIM' : 'NÃO');
    
    if (results.newArchitecture.success && results.identityResult.success) {
      console.log('\n✅ CONCLUSÃO: Nova arquitetura funciona corretamente!');
      console.log('Problema pode estar na integração com a API ou no fallback.');
    } else {
      console.log('\n❌ CONCLUSÃO: Nova arquitetura tem problemas.');
      console.log('Investigar por que está falhando.');
    }
  }
}).catch(console.error);