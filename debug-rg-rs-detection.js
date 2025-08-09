/**
 * Debug da detecção do RG do Rio Grande do Sul
 * Analisando por que não foi detectado como RG_IDENTITY
 */

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

function detectDocumentType(text) {
  const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');
  console.log('📄 Texto normalizado:', normalizedText.substring(0, 200) + '...');
  
  // Padrões para RG (exatamente como no código)
  const rgPatterns = [
    /REPÚBLICA FEDERATIVA DO BRASIL/,
    /CARTEIRA DE IDENTIDADE/,
    /REGISTRO GERAL/,
    /SECRETARIA DA SEGURANÇA PÚBLICA/,
    /INSTITUTO DE IDENTIFICAÇÃO/,
    /SSP|DETRAN/,
    /PROIBIDO PLASTIFICAR/,
    /VÁLIDA EM TODO O TERRITÓRIO NACIONAL/,
    /FILIAÇÃO/,
    /NATURALIDADE/,
    /DOC\.\s*ORIGEM/,
  ];
  
  console.log('\n🔍 Testando padrões de RG:');
  
  const matches = [];
  rgPatterns.forEach((pattern, index) => {
    const match = pattern.test(normalizedText);
    console.log(`${index + 1}. ${pattern} → ${match ? '✅' : '❌'}`);
    if (match) matches.push(pattern);
  });
  
  console.log(`\n📊 Total de matches: ${matches.length} de ${rgPatterns.length}`);
  console.log('📋 Necessário: 3 ou mais para detectar como RG');
  
  if (matches.length >= 3) {
    const confidence = Math.min(0.95, 0.7 + (matches.length * 0.05));
    console.log(`✅ DETECTADO COMO RG com confiança ${confidence}`);
    return { type: 'RG_IDENTITY', confidence };
  } else {
    console.log('❌ NÃO DETECTADO COMO RG - poucos matches');
    return { type: 'UNKNOWN', confidence: 0.1 };
  }
}

console.log('🧪 Testando detecção do RG do Rio Grande do Sul...\n');
const result = detectDocumentType(textoRGRS);
console.log('\n📋 Resultado final:', result);