import { extractInsuranceCardData } from './client/src/lib/document-processor.ts';

// Test cases with various insurance card texts
const testCases = [
  {
    name: "Bradesco Nacional Plus",
    text: `BRADESCO SAÚDE
PLANO: NACIONAL PLUS
CARTEIRINHA: 12345678901
NOME: JOÃO SILVA
CPF: 123.456.789-01`,
    expected: {
      insuranceName: "Bradesco Saúde",
      insurancePlan: "NACIONAL PLUS"
    }
  },
  {
    name: "Unimed Federal Executivo",
    text: `UNIMED
PRODUTO: FEDERAL EXECUTIVO
CARTÃO: 1234.5678.9012.3456
BENEFICIÁRIO: MARIA SANTOS
CPF: 987.654.321-00`,
    expected: {
      insuranceName: "Unimed",
      insurancePlan: "FEDERAL EXECUTIVO"
    }
  },
  {
    name: "Amil S650 Gold",
    text: `AMIL
PLANO: S650 GOLD
NÚMERO: 12345678901234567
TITULAR: CARLOS OLIVEIRA
CPF: 111.222.333-44`,
    expected: {
      insuranceName: "Amil",
      insurancePlan: "S650 GOLD"
    }
  },
  {
    name: "SulAmérica Exact Premium",
    text: `SULAMERICA
PLANO: EXACT PREMIUM
CARTEIRINHA: 123.456.789-0
NOME: ANA COSTA
CPF: 555.666.777-88`,
    expected: {
      insuranceName: "SulAmérica",
      insurancePlan: "EXACT PREMIUM"
    }
  },
  {
    name: "Hapvida Mais Premium",
    text: `HAPVIDA
PRODUTO: MAIS PREMIUM
N°: 123456789
BENEFICIÁRIO: PEDRO FERREIRA
CPF: 999.888.777-66`,
    expected: {
      insuranceName: "Hapvida",
      insurancePlan: "MAIS PREMIUM"
    }
  },
  {
    name: "Golden Cross Premium Gold",
    text: `GOLDEN CROSS
PLANO: PREMIUM GOLD
CARTÃO: 1234.5678.9012.3456
TITULAR: LUCIA MENDES
CPF: 123.987.456-00`,
    expected: {
      insuranceName: "Golden Cross",
      insurancePlan: "PREMIUM GOLD"
    }
  },
  {
    name: "Omint Executivo Premium",
    text: `OMINT
PRODUTO: EXECUTIVO PREMIUM
NÚMERO: 123456.789012
NOME: ROBERTO LIMA
CPF: 456.789.123-55`,
    expected: {
      insuranceName: "Omint",
      insurancePlan: "EXECUTIVO PREMIUM"
    }
  }
];

console.log('🧪 Testando detecção aprimorada de tipos de plano...\n');

let successCount = 0;
let totalCount = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Teste ${index + 1}: ${testCase.name}`);
  console.log('Texto de entrada:', testCase.text.replace(/\n/g, ' | '));
  
  try {
    const result = extractInsuranceCardData(testCase.text);
    
    console.log('Resultado detectado:');
    console.log(`  - Operadora: ${result.insuranceName || 'NÃO DETECTADA'}`);
    console.log(`  - Plano: ${result.insurancePlan || 'NÃO DETECTADO'}`);
    
    // Verificar se detectou corretamente
    const operadoraCorreta = result.insuranceName === testCase.expected.insuranceName;
    const planoCorreto = result.insurancePlan === testCase.expected.insurancePlan;
    
    if (operadoraCorreta && planoCorreto) {
      console.log('✅ SUCESSO - Operadora e plano detectados corretamente');
      successCount++;
    } else {
      console.log('❌ FALHA:');
      if (!operadoraCorreta) {
        console.log(`  - Operadora esperada: ${testCase.expected.insuranceName}, detectada: ${result.insuranceName}`);
      }
      if (!planoCorreto) {
        console.log(`  - Plano esperado: ${testCase.expected.insurancePlan}, detectado: ${result.insurancePlan}`);
      }
    }
    
  } catch (error) {
    console.log('❌ ERRO na execução:', error.message);
  }
});

console.log(`\n📊 Resultado final: ${successCount}/${totalCount} testes bem-sucedidos (${Math.round(successCount/totalCount*100)}%)`);

if (successCount === totalCount) {
  console.log('🎉 Todos os testes passaram! Detecção de tipos de plano funcionando perfeitamente.');
} else {
  console.log('⚠️  Alguns testes falharam. Verificar padrões de detecção.');
}