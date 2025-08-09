/**
 * RELATÓRIO COMPLETO DOS EXTRATORES IMPLEMENTADOS
 * Status atual das operadoras de plano de saúde
 */

export interface ExtractorStatus {
  operadora: string;
  status: 'IMPLEMENTADO' | 'PARCIAL' | 'PENDENTE';
  padraoCarteirinha: string;
  exemplo: string;
  funcionalidades: string[];
  debugging: boolean;
  observacoes: string;
}

export const EXTRATORES_STATUS: ExtractorStatus[] = [
  {
    operadora: 'SUL AMÉRICA',
    status: 'IMPLEMENTADO',
    padraoCarteirinha: '17 dígitos começando com 888 ou 8888',
    exemplo: '88812345678901234',
    funcionalidades: [
      '✅ Extração número carteirinha',
      '✅ Detecção operadora por texto',
      '✅ Validação formato específico',
      '✅ Suporte a variações 888/8888'
    ],
    debugging: true,
    observacoes: 'Extrator funcional com padrão /\\b(8{3,4}\\d{13,14})\\b/'
  },
  
  {
    operadora: 'BRADESCO SAÚDE',
    status: 'IMPLEMENTADO',
    padraoCarteirinha: '15 dígitos no formato XXX XXX XXXXXX XXX',
    exemplo: '123 456 789012 345',
    funcionalidades: [
      '✅ Extração número carteirinha',
      '✅ Detecção operadora por texto',
      '✅ Remoção espaços automática',
      '✅ Detecção pós-CNS quando presente'
    ],
    debugging: true,
    observacoes: 'Extrator funcional com padrão /(\\d{3}[\\s]*\\d{3}[\\s]*\\d{6}[\\s]*\\d{3})/'
  },
  
  {
    operadora: 'UNIMED',
    status: 'IMPLEMENTADO',
    padraoCarteirinha: '17 dígitos com espaçamento específico',
    exemplo: '0 994 910825083001 5',
    funcionalidades: [
      '✅ Extração número carteirinha',
      '✅ Detecção operadora por texto',
      '✅ Concatenação automática dos grupos',
      '✅ Suporte formato espaçado complexo'
    ],
    debugging: true,
    observacoes: 'Extrator funcional com padrão /(\\d)\\s+(\\d{3})\\s+(\\d{12})\\s+(\\d)/'
  },
  
  {
    operadora: 'AMIL',
    status: 'IMPLEMENTADO',
    padraoCarteirinha: '8-12 dígitos, detectado após "Número do Beneficiário"',
    exemplo: '11581786 7',
    funcionalidades: [
      '✅ Extração número carteirinha',
      '✅ Detecção operadora por texto',
      '✅ Separação automática dígito verificador',
      '✅ Filtro para evitar confusão com data nascimento'
    ],
    debugging: true,
    observacoes: 'Extrator funcional com padrão /(\\d{8})\\s+(\\d)/, corrigido para não capturar datas'
  },
  
  {
    operadora: 'PORTO SEGURO SAÚDE',
    status: 'IMPLEMENTADO',
    padraoCarteirinha: '16 dígitos no formato XXXX XXXX XXXX XXXX',
    exemplo: '4869 7908 0000 0247',
    funcionalidades: [
      '✅ Extração número carteirinha',
      '✅ Detecção operadora por texto',
      '✅ Concatenação automática grupos de 4',
      '✅ Formato padrão cartão de crédito'
    ],
    debugging: true,
    observacoes: 'Extrator funcional com padrão /(\\d{4})\\s+(\\d{4})\\s+(\\d{4})\\s+(\\d{4})/'
  },
  
  {
    operadora: 'HAPVIDA',
    status: 'PARCIAL',
    padraoCarteirinha: 'Pendente definição',
    exemplo: 'A definir',
    funcionalidades: [
      '⚠️ Detecção operadora por texto',
      '❌ Extração número carteirinha',
      '❌ Validação formato específico'
    ],
    debugging: false,
    observacoes: 'Detecta operadora mas extração de carteirinha não implementada'
  },
  
  {
    operadora: 'NOTREDAME INTERMÉDICA',
    status: 'PARCIAL',
    padraoCarteirinha: 'Pendente definição',
    exemplo: 'A definir',
    funcionalidades: [
      '⚠️ Detecção operadora por texto',
      '❌ Extração número carteirinha',
      '❌ Validação formato específico'
    ],
    debugging: false,
    observacoes: 'Detecta operadora mas extração de carteirinha não implementada'
  },
  
  {
    operadora: 'GOLDEN CROSS',
    status: 'PARCIAL',
    padraoCarteirinha: 'Pendente definição',
    exemplo: 'A definir',
    funcionalidades: [
      '⚠️ Detecção operadora por texto',
      '❌ Extração número carteirinha',
      '❌ Validação formato específico'
    ],
    debugging: false,
    observacoes: 'Detecta operadora mas extração de carteirinha não implementada'
  }
];

/**
 * Gera relatório em texto das operadoras
 */
export function gerarRelatorioOperadoras(): string {
  let relatorio = '\n📋 RELATÓRIO DE EXTRATORES - OPERADORAS DE PLANO DE SAÚDE\n';
  relatorio += '='.repeat(70) + '\n\n';
  
  const implementados = EXTRATORES_STATUS.filter(e => e.status === 'IMPLEMENTADO');
  const parciais = EXTRATORES_STATUS.filter(e => e.status === 'PARCIAL');
  const pendentes = EXTRATORES_STATUS.filter(e => e.status === 'PENDENTE');
  
  relatorio += `📊 RESUMO GERAL:\n`;
  relatorio += `✅ Implementados: ${implementados.length}\n`;
  relatorio += `⚠️ Parciais: ${parciais.length}\n`;
  relatorio += `❌ Pendentes: ${pendentes.length}\n`;
  relatorio += `📈 Total: ${EXTRATORES_STATUS.length}\n\n`;
  
  relatorio += `🚀 OPERADORAS COMPLETAMENTE IMPLEMENTADAS:\n`;
  relatorio += '-'.repeat(50) + '\n';
  
  implementados.forEach(operadora => {
    relatorio += `\n🏥 ${operadora.operadora}\n`;
    relatorio += `   Padrão: ${operadora.padraoCarteirinha}\n`;
    relatorio += `   Exemplo: ${operadora.exemplo}\n`;
    relatorio += `   Debug: ${operadora.debugging ? '✅ Ativo' : '❌ Inativo'}\n`;
    relatorio += `   Funcionalidades:\n`;
    operadora.funcionalidades.forEach(func => {
      relatorio += `     ${func}\n`;
    });
    relatorio += `   Obs: ${operadora.observacoes}\n`;
  });
  
  if (parciais.length > 0) {
    relatorio += `\n⚠️ OPERADORAS PARCIALMENTE IMPLEMENTADAS:\n`;
    relatorio += '-'.repeat(50) + '\n';
    
    parciais.forEach(operadora => {
      relatorio += `\n🏥 ${operadora.operadora}\n`;
      relatorio += `   Status: Detecta operadora, mas extração incompleta\n`;
      relatorio += `   Funcionalidades:\n`;
      operadora.funcionalidades.forEach(func => {
        relatorio += `     ${func}\n`;
      });
      relatorio += `   Obs: ${operadora.observacoes}\n`;
    });
  }
  
  return relatorio;
}

/**
 * Lista de debugging disponível por operadora
 */
export const DEBUGGING_FEATURES = {
  'SUL_AMERICA': [
    'Padrão regex detalhado',
    'Validação 888/8888 inicial',
    'Contagem de dígitos 17 total',
    'Log de matches encontrados'
  ],
  
  'BRADESCO': [
    'Detecção pós-CNS',
    'Remoção de espaços',
    'Validação formato 15 dígitos',
    'Log de processamento completo'
  ],
  
  'UNIMED': [
    'Concatenação grupos espaçados',
    'Validação formato complexo',
    'Log de cada grupo capturado',
    'Verificação dígito final'
  ],
  
  'AMIL': [
    'Filtro anti-data nascimento',
    'Detecção "Número do Beneficiário"',
    'Separação dígito verificador',
    'Log de validações aplicadas'
  ],
  
  'PORTO': [
    'Formato cartão de crédito',
    'Concatenação grupos de 4',
    'Validação 16 dígitos totais',
    'Log de transformação'
  ]
};