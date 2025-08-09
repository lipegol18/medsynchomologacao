/**
 * Teste prático dos extratores implementados
 * Demonstra funcionamento e debugging de cada operadora
 */

// Simulação de textos extraídos de carteirinhas reais
const textosTestePorOperadora = {
  sulAmerica: `
    SUL AMÉRICA SAÚDE
    CARTÃO DE IDENTIFICAÇÃO
    Nome: JOÃO SILVA SANTOS
    Cartão: 88812345678901234
    Plano: EXECUTIVO
    CNS: 123456789012345
    Data Nascimento: 15/03/1985
  `,
  
  bradesco: `
    BRADESCO SAÚDE
    CARTEIRA DE IDENTIFICAÇÃO
    Nome: MARIA OLIVEIRA
    CNS: 987654321098765
    Cartão: 123 456 789012 345
    Plano: SAÚDE TOP
    Validade: 12/2025
  `,
  
  unimed: `
    UNIMED BELO HORIZONTE
    CARTEIRA DO BENEFICIÁRIO
    Nome: CARLOS PEREIRA
    Cartão: 0 994 910825083001 5
    Plano: COMPACTO
    Data Nascimento: 22/08/1978
  `,
  
  amil: `
    AMIL ASSISTÊNCIA MÉDICA
    CARTÃO DO SEGURADO
    Nome: ANA COSTA LIMA
    Número do Beneficiário: 11581786 7
    Plano: BLUE
    CNS: 456789123045678
    Data Nascimento: 10/12/1990
  `,
  
  porto: `
    PORTO SEGURO SAÚDE
    CARTÃO DE IDENTIFICAÇÃO
    Nome: PEDRO SANTOS
    Cartão: 4869 7908 0000 0247
    Plano: PRATA MAIS RC
    Validade: 06/2026
  `
};

// Padrões de extração atuais
const extratoresPadrao = {
  sulAmerica: {
    pattern: /\b(8{3,4}\d{13,14})\b/,
    descricao: '17 dígitos começando com 888 ou 8888'
  },
  
  bradesco: {
    pattern: /(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/,
    descricao: '15 dígitos formato XXX XXX XXXXXX XXX'
  },
  
  unimed: {
    pattern: /(\d)\s+(\d{3})\s+(\d{12})\s+(\d)/,
    descricao: '17 dígitos formato X XXX XXXXXXXXXXXX X'
  },
  
  amil: {
    pattern: /(\d{8})\s+(\d)/,
    descricao: '9 dígitos formato XXXXXXXX X'
  },
  
  porto: {
    pattern: /(\d{4})\s+(\d{4})\s+(\d{4})\s+(\d{4})/,
    descricao: '16 dígitos formato XXXX XXXX XXXX XXXX'
  }
};

function testarExtrator(operadora, texto, padrao) {
  console.log(`\n🔍 TESTANDO: ${operadora.toUpperCase()}`);
  console.log('='.repeat(50));
  console.log(`Padrão: ${padrao.descricao}`);
  console.log(`Regex: ${padrao.pattern.source}`);
  console.log(`Texto: ${texto.substring(0, 100)}...`);
  
  const match = texto.match(padrao.pattern);
  
  if (match) {
    console.log('✅ SUCESSO!');
    
    // Processar resultado específico por operadora
    let numeroFinal = '';
    switch(operadora) {
      case 'sulAmerica':
        numeroFinal = match[1];
        break;
      case 'bradesco':
        numeroFinal = match[1].replace(/\s/g, '');
        break;
      case 'unimed':
        numeroFinal = match[1] + match[2] + match[3] + match[4];
        break;
      case 'amil':
        numeroFinal = match[1] + match[2];
        break;
      case 'porto':
        numeroFinal = match[1] + match[2] + match[3] + match[4];
        break;
    }
    
    console.log(`Número extraído: ${numeroFinal}`);
    console.log(`Tamanho: ${numeroFinal.length} dígitos`);
    console.log(`Match completo:`, match);
    
    return { success: true, numero: numeroFinal, match };
  } else {
    console.log('❌ FALHOU - Padrão não encontrado');
    return { success: false };
  }
}

function executarTodosTestes() {
  console.log('🧪 TESTE COMPLETO DOS EXTRATORES DE OPERADORAS');
  console.log('='.repeat(70));
  
  const resultados = {};
  
  Object.keys(textosTestePorOperadora).forEach(operadora => {
    const texto = textosTestePorOperadora[operadora];
    const padrao = extratoresPadrao[operadora];
    
    resultados[operadora] = testarExtrator(operadora, texto, padrao);
  });
  
  console.log('\n📊 RESUMO FINAL:');
  console.log('='.repeat(30));
  
  let sucessos = 0;
  let total = 0;
  
  Object.entries(resultados).forEach(([operadora, resultado]) => {
    const status = resultado.success ? '✅' : '❌';
    const numero = resultado.success ? resultado.numero : 'FALHOU';
    console.log(`${status} ${operadora.toUpperCase()}: ${numero}`);
    
    if (resultado.success) sucessos++;
    total++;
  });
  
  console.log(`\n📈 Taxa de sucesso: ${sucessos}/${total} (${Math.round(sucessos/total*100)}%)`);
  
  return resultados;
}

// Relatório detalhado das funcionalidades
function mostrarStatusDetalhado() {
  console.log('\n📋 STATUS DETALHADO DOS EXTRATORES');
  console.log('='.repeat(60));
  
  const operadoras = [
    {
      nome: 'SUL AMÉRICA',
      status: '✅ COMPLETO',
      recursos: [
        '✅ Detecção operadora',
        '✅ Extração carteirinha',
        '✅ Validação 888/8888',
        '✅ Debug completo'
      ]
    },
    {
      nome: 'BRADESCO SAÚDE', 
      status: '✅ COMPLETO',
      recursos: [
        '✅ Detecção operadora',
        '✅ Extração carteirinha',
        '✅ Detecção pós-CNS',
        '✅ Debug completo'
      ]
    },
    {
      nome: 'UNIMED',
      status: '✅ COMPLETO', 
      recursos: [
        '✅ Detecção operadora',
        '✅ Extração carteirinha',
        '✅ Formato espaçado complexo',
        '✅ Debug completo'
      ]
    },
    {
      nome: 'AMIL',
      status: '✅ COMPLETO',
      recursos: [
        '✅ Detecção operadora', 
        '✅ Extração carteirinha',
        '✅ Filtro anti-data',
        '✅ Debug completo'
      ]
    },
    {
      nome: 'PORTO SEGURO SAÚDE',
      status: '✅ COMPLETO',
      recursos: [
        '✅ Detecção operadora',
        '✅ Extração carteirinha', 
        '✅ Formato cartão crédito',
        '✅ Debug completo'
      ]
    },
    {
      nome: 'HAPVIDA',
      status: '⚠️ PARCIAL',
      recursos: [
        '✅ Detecção operadora',
        '❌ Extração carteirinha',
        '❌ Padrão específico', 
        '❌ Debug específico'
      ]
    },
    {
      nome: 'NOTREDAME INTERMÉDICA',
      status: '⚠️ PARCIAL',
      recursos: [
        '✅ Detecção operadora',
        '❌ Extração carteirinha',
        '❌ Padrão específico',
        '❌ Debug específico'
      ]
    }
  ];
  
  operadoras.forEach(op => {
    console.log(`\n🏥 ${op.nome}`);
    console.log(`   Status: ${op.status}`);
    console.log('   Recursos:');
    op.recursos.forEach(recurso => {
      console.log(`     ${recurso}`);
    });
  });
  
  const completos = operadoras.filter(op => op.status.includes('COMPLETO')).length;
  const parciais = operadoras.filter(op => op.status.includes('PARCIAL')).length;
  
  console.log(`\n📊 Estatísticas:`);
  console.log(`   ✅ Completos: ${completos}`);
  console.log(`   ⚠️ Parciais: ${parciais}`);
  console.log(`   📈 Total: ${operadoras.length}`);
}

// Executar todos os testes
console.log('🚀 INICIANDO BATERIA DE TESTES...');
const resultados = executarTodosTestes();
mostrarStatusDetalhado();

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('1. Implementar extratores para Hapvida e NotreDame');
console.log('2. Adicionar mais padrões de validação');
console.log('3. Melhorar detecção de contexto');
console.log('4. Expandir sistema de debug');