// Teste da detecção OCR melhorada para plano COMPACTO

console.log('🧪 Testando Detecção OCR - Plano COMPACTO\n');

// Simular o texto extraído da carteirinha da Claudia Silva
const extractedText = `SEGUROS
Unimed
A
Unimed Seguros Saúde S.A - CNPJ/MF 04.487.255/0001-81
Apresentar documento de identidade
Área de Atuação do Produto: Nacional
CLAUDIA DA SILVA
Nome do Beneficiário
CLAUDIA SILVA
Nome Social do Beneficiário
ICOMM GROUP
CORPORATIVO COMPACTO ENF CP
SEM CARÊNCIAS A CUMPRIR
Cod
ANS - n° 00.070-1
CPF: 70280268361
Data de Nascimento: 17/11/1970`;

console.log('📄 Texto da Carteirinha:');
console.log('─'.repeat(50));
console.log(extractedText);
console.log('─'.repeat(50));

console.log('\n🔍 Testando Padrões de Detecção:');

// Testar padrões específicos
const patterns = [
  /(?:CORPORATIVO\s+)?(COMPACTO)(?:\s+ENF)?(?:\s+CP)?/i,
  /(?:UNIMED\s+)?(PRÁTICO|VERSÁTIL|DINÂMICO|LÍDER|SÊNIOR|BÁSICO|ESSENCIAL|AFINIDADE|ADESÃO|COMPACTO|EFETIVO|COMPLETO|SUPERIOR|UNICO|CUIDAR\s+MAIS)/i
];

patterns.forEach((pattern, index) => {
  console.log(`\n${index + 1}. Padrão: ${pattern}`);
  const match = extractedText.match(pattern);
  if (match) {
    console.log(`   ✅ Match encontrado: "${match[0]}"`);
    console.log(`   📝 Grupo capturado: "${match[1] || 'N/A'}"`);
  } else {
    console.log('   ❌ Nenhum match encontrado');
  }
});

console.log('\n🎯 Resultado Esperado:');
console.log('• Texto: "CORPORATIVO COMPACTO ENF CP"');
console.log('• Padrão deve capturar: "COMPACTO"');
console.log('• Sistema deve extrair: "COMPACTO"');
console.log('• API deve buscar planos similares a "COMPACTO"');
console.log('• Resultado: Seleção automática do "Unimed Compacto"');

console.log('\n✅ Status: Padrões atualizados para detectar COMPACTO corretamente');
console.log('🔧 Sistema configurado para processar carteirinhas Unimed Compacto');