/**
 * Script de teste para validar a detecção de campos da carteirinha
 */

// Simular textos extraídos de carteirinhas para testar os padrões
const testCases = [
  {
    name: "Bradesco Saúde - Exemplo 1",
    text: `
      BRADESCO SAÚDE
      CARTÃO DE IDENTIFICAÇÃO
      NOME: MARIA SILVA SANTOS
      CARTEIRINHA: 123456789-01
      PLANO: NACIONAL PLUS
      VALIDADE: 12/2025
      CPF: 123.456.789-01
    `
  },
  {
    name: "Unimed - Exemplo 1", 
    text: `
      UNIMED
      BENEFICIÁRIO: JOÃO OLIVEIRA
      NÚMERO: 1234.5678.9012.3456
      PLANO: FEDERAL EXECUTIVO
      VÁLIDO ATÉ: 12/2025
    `
  },
  {
    name: "Amil - Exemplo 1",
    text: `
      AMIL
      TITULAR: ANA COSTA LIMA
      CARTÃO: 12345678 90123456
      PRODUTO: S650 GOLD
      VALIDADE: 12/2025
    `
  },
  {
    name: "SulAmérica - Exemplo 1",
    text: `
      SULAMÉRICA SAÚDE
      SEGURADO: CARLOS MENDES
      MATRÍCULA: 123.456.789-1
      PLANO: ESPECIAL MASTER
      VIGÊNCIA: 12/2025
    `
  }
];

// Função para testar detecção de operadora
function testInsuranceDetection(text) {
  const upperText = text.toUpperCase();
  
  const operadoras = [
    { 
      name: 'Bradesco Saúde', 
      patterns: ['BRADESCO', 'BRADESCO SAUDE', 'BRADESCO SAÚDE'],
      numberPatterns: [
        /(\d{9}[\s\-]?\d{2})/,  // formato 000000000-00
        /(\d{15,16})/           // formato contínuo mais longo
      ],
      planPatterns: [
        /PLANO:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO)/i,
        /(NACIONAL[\s\w]*)/i,
        /(PLUS[\s\w]*)/i,
        /(PREFERENCIAL[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i
      ]
    },
    { 
      name: 'Unimed', 
      patterns: ['UNIMED'],
      numberPatterns: [
        /(\d{4}\.?\d{4}\.?\d{4}\.?\d{4})/,  // formato 16 dígitos
        /(\d{17})/                          // formato contínuo
      ],
      planPatterns: [
        /PLANO:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO)/i,
        /(FEDERAL[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i,
        /(EMPRESARIAL[\s\w]*)/i
      ]
    },
    { 
      name: 'Amil', 
      patterns: ['AMIL'],
      numberPatterns: [
        /(\d{16})/,                        // formato 16 dígitos
        /(\d{8}[\s\-]?\d{8})/              // formato 8-8 dígitos
      ],
      planPatterns: [
        /PRODUTO:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO)/i,
        /(S[\d]+[\s\w]*)/i,               // Ex: S450, S650
        /(GOLD[\s\w]*)/i,
        /(SILVER[\s\w]*)/i,
        /(PLATINUM[\s\w]*)/i
      ]
    },
    { 
      name: 'SulAmérica', 
      patterns: ['SULAMERICA', 'SULAMÉRICA', 'SUL AMERICA', 'SUL AMÉRICA'],
      numberPatterns: [
        /(\d{3}\.?\d{3}\.?\d{3}[\s\-]?\d{1})/,  // formato 3.3.3-1
        /(\d{10})/                              // formato contínuo
      ],
      planPatterns: [
        /PLANO:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO)/i,
        /(ESPECIAL[\s\w]*)/i,
        /(MASTER[\s\w]*)/i,
        /(EXECUTIVO[\s\w]*)/i
      ]
    }
  ];

  const result = {
    insuranceName: null,
    insuranceNumber: null,
    insurancePlan: null
  };

  // Detectar operadora
  for (const operadora of operadoras) {
    if (operadora.patterns.some(pattern => upperText.includes(pattern))) {
      result.insuranceName = operadora.name;
      console.log(`✓ Operadora detectada: ${operadora.name}`);
      
      // Detectar número da carteirinha
      if (operadora.numberPatterns) {
        for (const pattern of operadora.numberPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const cardNumber = match[1].trim()
              .replace(/\s+/g, '')
              .replace(/[^\d\-\.]/g, '');
            
            if (cardNumber.length >= 7) {
              result.insuranceNumber = cardNumber;
              console.log(`✓ Número da carteirinha: ${cardNumber}`);
              break;
            }
          }
        }
      }
      
      // Detectar tipo de plano
      if (operadora.planPatterns) {
        for (const pattern of operadora.planPatterns) {
          const match = text.match(pattern);
          if (match) {
            if (match[1]) {
              const planName = match[1].trim()
                .replace(/\s+/g, ' ')
                .replace(/[\r\n]+/g, ' ');
              
              if (planName.length > 2) {
                result.insurancePlan = planName;
                console.log(`✓ Tipo de plano: ${planName}`);
                break;
              }
            } else if (match[0]) {
              const planKeyword = match[0].trim();
              if (planKeyword.length > 2) {
                result.insurancePlan = planKeyword;
                console.log(`✓ Tipo de plano (palavra-chave): ${planKeyword}`);
                break;
              }
            }
          }
        }
      }
      
      break;
    }
  }

  // Padrões gerais se não detectou operadora específica
  if (!result.insuranceName) {
    const generalPatterns = [
      /(\w+)\s*SAÚDE/i,
      /(\w+)\s*SAUDE/i
    ];
    
    for (const pattern of generalPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        result.insuranceName = match[1];
        console.log(`✓ Operadora (padrão geral): ${match[1]}`);
        break;
      }
    }
  }

  // Padrões gerais para número se não detectou
  if (!result.insuranceNumber) {
    const generalNumberPatterns = [
      /CARTEIRINHA:?\s*([0-9\.\-\s]{8,20})/i,
      /CARTÃO:?\s*([0-9\.\-\s]{8,20})/i,
      /NÚMERO:?\s*([0-9\.\-\s]{8,20})/i,
      /MATRÍCULA:?\s*([0-9\.\-\s]{8,20})/i,
      /(\d{8,16})/
    ];
    
    for (const pattern of generalNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cardNumber = match[1].trim()
          .replace(/\s+/g, '')
          .replace(/[^\d\-\.]/g, '');
        
        const digitsOnly = cardNumber.replace(/[^\d]/g, '');
        if (digitsOnly.length >= 8 && digitsOnly.length <= 20) {
          result.insuranceNumber = cardNumber;
          console.log(`✓ Número (padrão geral): ${cardNumber}`);
          break;
        }
      }
    }
  }

  // Padrões gerais para plano se não detectou
  if (!result.insurancePlan) {
    const generalPlanPatterns = [
      /PLANO:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO)/i,
      /PRODUTO:?\s*([A-Za-z0-9\s\-\.\/]+?)(?:\n|$|VALIDADE|TITULAR|BENEFICIÁRIO)/i,
      /(EXECUTIVO[\s\w]*)/i,
      /(EMPRESARIAL[\s\w]*)/i,
      /(INDIVIDUAL[\s\w]*)/i,
      /(FAMILIAR[\s\w]*)/i,
      /(PREMIUM[\s\w]*)/i,
      /(PLUS[\s\w]*)/i,
      /(MASTER[\s\w]*)/i,
      /(GOLD[\s\w]*)/i
    ];
    
    for (const pattern of generalPlanPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const planName = match[1].trim();
        if (planName.length > 2) {
          result.insurancePlan = planName;
          console.log(`✓ Plano (padrão geral): ${planName}`);
          break;
        }
      } else if (match && match[0]) {
        const planKeyword = match[0].trim();
        if (planKeyword.length > 2) {
          result.insurancePlan = planKeyword;
          console.log(`✓ Plano (palavra-chave geral): ${planKeyword}`);
          break;
        }
      }
    }
  }

  return result;
}

// Executar testes
console.log('🧪 TESTE DE DETECÇÃO DE CAMPOS DA CARTEIRINHA\n');

testCases.forEach((testCase, index) => {
  console.log(`--- TESTE ${index + 1}: ${testCase.name} ---`);
  
  const result = testInsuranceDetection(testCase.text);
  
  console.log('📊 RESULTADO:');
  console.log(`Operadora: ${result.insuranceName || '❌ NÃO DETECTADA'}`);
  console.log(`Número: ${result.insuranceNumber || '❌ NÃO DETECTADO'}`);
  console.log(`Plano: ${result.insurancePlan || '❌ NÃO DETECTADO'}`);
  
  const fieldsDetected = Object.values(result).filter(v => v !== null).length;
  const successRate = (fieldsDetected / 3) * 100;
  console.log(`Taxa de sucesso: ${successRate.toFixed(1)}% (${fieldsDetected}/3 campos)\n`);
});