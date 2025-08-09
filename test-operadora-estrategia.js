const { findOperadoraByName, normalizeOperadora } = require('./server/services/data-normalizer.ts');

// Teste da estratégia hierárquica quando não há código ANS
async function testOperadoraStrategy() {
  console.log('=== TESTE: Estratégia para Carteirinhas SEM Código ANS ===\n');
  
  // Cenário 1: Nome completo que existe no banco
  console.log('1. Teste com nome completo no banco:');
  const test1 = await findOperadoraByName('AMIL ASSISTÊNCIA MÉDICA INTERNACIONAL S/A');
  console.log('Resultado:', test1);
  console.log('');
  
  // Cenário 2: Nome parcial/variação que existe no banco
  console.log('2. Teste com nome parcial (Bradesco):');
  const test2 = await findOperadoraByName('BRADESCO SAUDE');
  console.log('Resultado:', test2);
  console.log('');
  
  // Cenário 3: Nome muito resumido
  console.log('3. Teste com nome resumido (Unimed):');
  const test3 = await findOperadoraByName('UNIMED');
  console.log('Resultado:', test3);
  console.log('');
  
  // Cenário 4: Nome não encontrado no banco, vai para fallback
  console.log('4. Teste com nome não encontrado (fallback):');
  const test4 = await findOperadoraByName('OPERADORA INEXISTENTE');
  console.log('Resultado busca no banco:', test4);
  const fallback4 = normalizeOperadora('OPERADORA INEXISTENTE');
  console.log('Resultado fallback:', fallback4);
  console.log('');
  
  // Cenário 5: Nome com palavras-chave
  console.log('5. Teste com palavras-chave (Sul América):');
  const test5 = await findOperadoraByName('SUL AMERICA');
  console.log('Resultado:', test5);
  console.log('');
}

testOperadoraStrategy().catch(console.error);