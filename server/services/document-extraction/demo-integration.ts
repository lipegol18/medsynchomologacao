import { DocumentExtractionService } from './index';

/**
 * Demonstração da nova arquitetura modular funcionando
 * Este arquivo mostra como a nova estrutura se integra ao sistema atual
 */

// Instância do novo serviço
const extractionService = new DocumentExtractionService();

/**
 * Função de demonstração que processa uma carteirinha
 * Mostra o fluxo completo: OCR → Limpeza → Detecção → Extração → Resultado
 */
export async function demonstrateNewArchitecture(imageBuffer: Buffer) {
  console.log('🚀 DEMONSTRAÇÃO: Nova arquitetura modular em ação');
  console.log('=' .repeat(60));
  
  try {
    // Usar a nova arquitetura
    const result = await extractionService.processInsuranceCard(imageBuffer);
    
    console.log('📊 RESULTADO DA NOVA ARQUITETURA:');
    console.log('Success:', result.success);
    console.log('Operadora:', result.data.operadora);
    console.log('Plano:', result.data.plano);
    console.log('Número Carteirinha:', result.data.numeroCarteirinha);
    console.log('Confidence:', result.confidence.overall);
    console.log('Método de Detecção:', result.method.type);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro na demonstração:', error);
    throw error;
  }
}

/**
 * Comparação: Método atual vs Nova arquitetura
 */
export async function compareOldVsNew(imageBuffer: Buffer) {
  console.log('⚖️ COMPARAÇÃO: Método atual vs Nova arquitetura');
  console.log('=' .repeat(60));
  
  // Nova arquitetura (resultado estruturado)
  const newResult = await extractionService.processInsuranceCard(imageBuffer);
  
  // Compatibilidade com sistema atual (formato legacy)
  const legacyResult = await extractionService.processInsuranceCardLegacy(imageBuffer);
  
  console.log('🆕 NOVA ARQUITETURA:');
  console.log('- Estruturada e modular');
  console.log('- Confidence scores detalhados');
  console.log('- Método de detecção rastreável');
  console.log('- Fácil de estender para novas operadoras');
  
  console.log('🔧 COMPATIBILIDADE LEGACY:');
  console.log('- Mantém interface atual');
  console.log('- Transição gradual possível');
  console.log('- Sem quebra do sistema existente');
  
  return { newResult, legacyResult };
}

/**
 * Vantagens da nova estrutura
 */
export function explainArchitectureBenefits() {
  console.log('✨ BENEFÍCIOS DA NOVA ARQUITETURA:');
  console.log('=' .repeat(60));
  
  console.log('1. 📁 ORGANIZAÇÃO MODULAR:');
  console.log('   - Cada operadora tem seu próprio extrator');
  console.log('   - Código separado por responsabilidade');
  console.log('   - Fácil manutenção e debugging');
  
  console.log('2. 🔧 ESCALABILIDADE:');
  console.log('   - Adicionar nova operadora = novo arquivo');
  console.log('   - Padrões reutilizáveis entre operadoras');
  console.log('   - Configuração externa sem alterar código');
  
  console.log('3. 🎯 CONFIABILIDADE:');
  console.log('   - Scores de confiança detalhados');
  console.log('   - Rastreamento de métodos de detecção');
  console.log('   - Fallbacks automáticos');
  
  console.log('4. 🧪 TESTABILIDADE:');
  console.log('   - Cada componente pode ser testado isoladamente');
  console.log('   - Mocks fáceis para testes unitários');
  console.log('   - Validação de cada etapa do processo');
  
  console.log('5. 🔄 COMPATIBILIDADE:');
  console.log('   - Sistema atual continua funcionando');
  console.log('   - Migração gradual possível');
  console.log('   - Interface legacy mantida');
}