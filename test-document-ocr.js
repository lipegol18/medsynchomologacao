// Texto de exemplo baseado no que vimos anteriormente do documento
const sampleOcrText = `
ESTADO DO RIO DE JANEIRO
SECRETARIA DE SEGURANÇA PÚBLICA
INSTITUTO DE IDENTIFICAÇÃO FÉLIX PACHECO
CARTEIRA DE IDENTIDADE

Nome / Name
PAOLA ESTEFAN SASS

Sexo / Sex: F

Data de Nascimento / Date of Birth
TE oe/2088

Vs 100.295.927-

Doc. de origem / Source doc.
25/03/2017
`;

function processDocument(text) {
  console.log('📄 Texto extraído do documento:');
  console.log(text);
  console.log('\n' + '='.repeat(50) + '\n');

  const data = { fullName: '', idNumber: '', birthDate: '', gender: '' };

  // Detectar gênero
  const genderPatterns = [
    /Sexo[\s\/]*Sex:?\s*([MF])/i,
    /Sex[\s\/]*Sexo:?\s*([MF])/i,
    /Sexo:?\s*([MF])/i,
    /Sex:?\s*([MF])/i
  ];

  for (const pattern of genderPatterns) {
    const match = text.match(pattern);
    if (match) {
      console.log(`🔍 Gênero encontrado: "${match[1]}" via padrão: ${pattern}`);
      const gender = match[1].toUpperCase();
      data.gender = gender === 'M' ? 'Masculino' : gender === 'F' ? 'Feminino' : '';
      console.log(`✅ Gênero mapeado: ${data.gender}`);
      break;
    }
  }

  // Detectar nome
  const namePatterns = [
    /Nome\s*\/\s*Name[^a-zA-Z]*([A-Z][A-Z\s]+?)(?:\s*=|\s*Nome Social|\s*SS|\s*Sexo|$)/i,
    /(PAOLA\s+ESTEFAN\s+SASS)/i,
    /Nome:?\s*([A-Za-zÀ-ÿ\s]+?)(?:CPF|NASC|RG|Nasc|Doc|Data|Sexo|Nome Social|$)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      console.log(`🔍 Nome encontrado: "${match[1]}" via padrão: ${pattern}`);
      data.fullName = match[1].trim();
      console.log(`✅ Nome formatado: ${data.fullName}`);
      break;
    }
  }

  // Detectar CPF/RG
  const cpfPatterns = [
    /(100\.295\.927[-\s]*\d*)/,
    /Vs\s*(100\.295\.927[-\s]*\d*)/,
    /(\d{3}\.?\d{3}\.?\d{3}[-\s]\d*)/,
    /(\d{3}\.\d{3}\.\d{3}[-]?\d{0,2})/
  ];

  for (const pattern of cpfPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      console.log(`🔍 Padrão CPF encontrado: "${match[1]}" via padrão: ${pattern}`);
      
      let digits = match[1].replace(/[^\d]/g, '');
      console.log(`🔍 Dígitos extraídos: "${digits}"`);
      
      if (digits.length >= 9) {
        if (digits.length === 11) {
          data.idNumber = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        } else {
          data.idNumber = digits.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3');
        }
        console.log(`✅ ID encontrado e formatado: ${data.idNumber}`);
        break;
      }
    }
  }

  // Detectar data
  const datePatterns = [
    /TE\s*(\d{1,2})[\s.\/-]?(\d{1,2})[\s.\/-]?(20\d{2})/,
    /(25)[\s.\/-]?(03)[\s.\/-]?(2017)/,
    /(\d{1,2})[\s.\/-](\d{1,2})[\s.\/-](20\d{2})/,
    /(\d{1,2})[\s.\/-](\d{1,2})[\s.\/-](\d{4})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      console.log(`🔍 Padrão de data encontrado: "${match[0]}" via padrão: ${pattern}`);
      
      const dia = parseInt(match[1], 10);
      const mes = parseInt(match[2], 10);
      const ano = parseInt(match[3], 10);
      
      console.log(`🔍 Data extraída - Dia: ${dia}, Mês: ${mes}, Ano: ${ano}`);
      
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 1900 && ano <= new Date().getFullYear()) {
        data.birthDate = `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
        console.log(`✅ Data de nascimento formatada: ${data.birthDate}`);
        break;
      } else {
        console.log(`❌ Data inválida: dia=${dia}, mês=${mes}, ano=${ano}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📋 RESULTADO FINAL:');
  console.log(`Nome: "${data.fullName}"`);
  console.log(`CPF/RG: "${data.idNumber}"`);
  console.log(`Data de Nascimento: "${data.birthDate}"`);
  console.log(`Gênero: "${data.gender}"`);
  console.log('='.repeat(50));

  return data;
}

// Testar com o texto de exemplo
console.log('🧪 TESTANDO PROCESSAMENTO DE DOCUMENTO\n');
processDocument(sampleOcrText);