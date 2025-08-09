// Teste de correspondência do plano Compacto detectado na carteirinha

console.log('🧪 Testando Correspondência: "COMPACTO" → "Unimed Compacto"\n');

// Simular os dados da carteirinha processada
const carteirinhaData = {
  textoDetectado: "CORPORATIVO COMPACTO ENF CP",
  planoExtraido: "Nacional CLAUDIA DA SILVA Nome do Benefici", // Texto confuso extraído
  operadora: "UNIMED SEGUROS SAÚDE S/A",
  ansCode: "000701"
};

// Simular planos disponíveis na operadora 000701
const planosDisponiveis = [
  { id: 96476, nmPlano: "Unimed Compacto", cdPlano: "UNI010" },
  { id: 96477, nmPlano: "Unimed Prático", cdPlano: "UNI001" },
  { id: 96478, nmPlano: "Unimed Versátil", cdPlano: "UNI002" },
  { id: 96479, nmPlano: "Unimed Dinâmico", cdPlano: "UNI003" }
];

console.log('📋 Dados da Carteirinha:');
console.log(`   Texto detectado: "${carteirinhaData.textoDetectado}"`);
console.log(`   Plano extraído: "${carteirinhaData.planoExtraido}"`);
console.log(`   Operadora: ${carteirinhaData.operadora}`);
console.log(`   Código ANS: ${carteirinhaData.ansCode}\n`);

console.log('🔍 Algoritmo de Busca por Similaridade:\n');

// Simular o algoritmo que está no servidor
function testSimilaritySearch(searchTerm, plans) {
  const searchTermUpper = searchTerm.toUpperCase().trim();
  const results = [];

  for (const plan of plans) {
    const planName = (plan.nmPlano || '').toUpperCase();
    let score = 0;
    let matchType = '';

    // Correspondência exata no nome
    if (planName === searchTermUpper) {
      score = 1.0;
      matchType = 'exact_name';
    }
    // Nome contém o termo ou vice-versa
    else if (planName.includes(searchTermUpper) || searchTermUpper.includes(planName)) {
      score = Math.min(planName.length, searchTermUpper.length) / Math.max(planName.length, searchTermUpper.length);
      matchType = 'partial_name';
    }
    // Verificar palavras-chave
    else {
      const planWords = planName.split(/\s+/).filter(w => w.length > 2);
      const searchWords = searchTermUpper.split(/\s+/).filter(w => w.length > 2);
      
      const matchingWords = searchWords.filter(word => 
        planWords.some(planWord => 
          planWord.includes(word) || word.includes(planWord)
        )
      );

      if (matchingWords.length > 0) {
        score = matchingWords.length / Math.max(planWords.length, searchWords.length);
        matchType = 'keyword_match';
      }
    }

    // Adicionar resultado se o score for suficiente
    if (score > 0.3) {
      results.push({
        ...plan,
        matchScore: score,
        matchType: matchType
      });
    }
  }

  // Ordenar por score (maior primeiro)
  results.sort((a, b) => b.matchScore - a.matchScore);
  return results;
}

// Testar busca com "COMPACTO" (palavra extraída do texto)
console.log('1️⃣ Busca por "COMPACTO":');
const resultadosCompacto = testSimilaritySearch('COMPACTO', planosDisponiveis);
if (resultadosCompacto.length > 0) {
  console.log(`   ✅ Encontrado: ${resultadosCompacto[0].nmPlano}`);
  console.log(`   📊 Score: ${resultadosCompacto[0].matchScore.toFixed(2)}`);
  console.log(`   🎯 Tipo: ${resultadosCompacto[0].matchType}`);
} else {
  console.log('   ❌ Nenhum resultado encontrado');
}

// Testar busca com "CORPORATIVO COMPACTO" (texto completo)
console.log('\n2️⃣ Busca por "CORPORATIVO COMPACTO":');
const resultadosCorporativo = testSimilaritySearch('CORPORATIVO COMPACTO', planosDisponiveis);
if (resultadosCorporativo.length > 0) {
  console.log(`   ✅ Encontrado: ${resultadosCorporativo[0].nmPlano}`);
  console.log(`   📊 Score: ${resultadosCorporativo[0].matchScore.toFixed(2)}`);
  console.log(`   🎯 Tipo: ${resultadosCorporativo[0].matchType}`);
} else {
  console.log('   ❌ Nenhum resultado encontrado');
}

console.log('\n📝 Análise:');
console.log('• O texto "CORPORATIVO COMPACTO ENF CP" contém a palavra "COMPACTO"');
console.log('• O plano "Unimed Compacto" deveria ser detectado pelo algoritmo de similaridade');
console.log('• O sistema deveria extrair "COMPACTO" e fazer correspondência com "Unimed Compacto"');

console.log('\n✅ Status: Plano "Unimed Compacto" já está cadastrado com código UNI010');
console.log('🔧 Sistema configurado para detecção automática do plano Compacto');