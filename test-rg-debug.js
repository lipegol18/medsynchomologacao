/**
 * Teste para debug da detecção de nome em RG
 * Usando o texto exato que foi extraído nos logs anteriores
 */

const textoRGExtraido = `REPÚBLICA FEDERATIVA DO BRASIL
ESTADO DE SÃO PAULO
SECRETARIA DA SEGURANÇA PÚBLICA
INSTITUTO DE IDENTIFICAÇÃO RICARDO GUMBLETON DAUNT
8000-2
POLEGAR DIREITO
8617-019195
ASSINATURA DO TITULAR
0300 CARTEIRA DE IDENTIDADE
REGISTRO
GERAL
CIFA
PROIBIDO PLASTIFICAR
DATA DE
EXPEDIÇÃO 21/DEZ/2012
O VÁLIDA EM TODO O TERRITÓRIO NACIONAL
48.151.623-42
NOME
FILIAÇÃO
DANIEL COELHO DA COSTA
ROSA COELHO DA COSTA
EDIVALDO DA COSTA
NATURALIDADE
SÃO PAULO - SP
DOC. ORIGEM SÃO PAULO - SP
CPF
XXXXXXXXXXXXXXXXXXXXXXX
DATA DE NASCIMENTO
19/DEZ/1980
CARTÓRIO XXXXXXXXXXXXXXXXXX
342.002.171-42
ASSINATURA DO DIRETOR
LEIN 7.116 DE 29/08/88`;

// Simular extração de nome com estratégias existentes
function debugNomeExtraction(text) {
  console.log('🔍 DEBUG: Analisando extração de nome...');
  console.log('📄 Texto completo:');
  console.log('=====================================');
  console.log(text);
  console.log('=====================================\n');
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('📋 Linhas extraídas:', lines);
  console.log('');
  
  // Estratégia 1: Campo explícito "NOME:"
  console.log('🔍 Estratégia 1: Campo explícito "NOME:"');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line.startsWith('NOME:') || line.startsWith('NOME ') || line === 'NOME') {
      console.log(`   Linha ${i}: "${line}" - MATCH`);
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        console.log(`   Próxima linha: "${nextLine}"`);
        if (isValidName(nextLine)) {
          console.log(`   ✅ NOME ENCONTRADO: ${nextLine}`);
          return nextLine;
        }
      }
    }
  }
  
  // Estratégia 2: Nome antes de "FILIAÇÃO"
  console.log('\n🔍 Estratégia 2: Nome antes de "FILIAÇÃO"');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line.includes('FILIAÇÃO')) {
      console.log(`   Linha ${i}: "${line}" - FILIAÇÃO encontrada`);
      // Verificar 3 linhas anteriores
      for (let j = Math.max(0, i - 3); j < i; j++) {
        const prevLine = lines[j].trim();
        console.log(`     Linha anterior ${j}: "${prevLine}"`);
        if (isValidName(prevLine) && prevLine.length > 5) {
          console.log(`   ✅ NOME ENCONTRADO: ${prevLine}`);
          return prevLine;
        }
      }
    }
  }
  
  // Estratégia 3: Nome após número do RG
  console.log('\n🔍 Estratégia 3: Nome após número do RG');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^\d{2}\.?\d{3}\.?\d{3}[-]?\d{1,2}$/.test(line)) {
      console.log(`   Linha ${i}: "${line}" - RG encontrado`);
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        console.log(`     Próxima linha: "${nextLine}"`);
        if (isValidName(nextLine)) {
          console.log(`   ✅ NOME ENCONTRADO: ${nextLine}`);
          return nextLine;
        }
      }
    }
  }
  
  // Estratégia NOVA: Nome após "FILIAÇÃO" (layout SP específico)
  console.log('\n🔍 Estratégia NOVA: Nome após "FILIAÇÃO"');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase().trim();
    if (line === 'FILIAÇÃO') {
      console.log(`   Linha ${i}: "${line}" - Campo FILIAÇÃO encontrado`);
      // O nome está na primeira linha após FILIAÇÃO
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        console.log(`     Analisando primeira linha após FILIAÇÃO: "${nextLine}"`);
        
        if (isValidName(nextLine) && nextLine.length > 5) {
          console.log(`   ✅ NOME ENCONTRADO: ${nextLine}`);
          return nextLine;
        }
      }
    }
  }
  
  console.log('\n❌ NOME NÃO ENCONTRADO');
  return null;
}

function isValidName(text) {
  if (!text || text.length < 3) return false;
  
  // Nome deve conter apenas letras, espaços e alguns caracteres especiais
  if (!/^[A-ZÀ-ÿ\s\-'\.]+$/i.test(text)) return false;
  
  // Deve ter pelo menos 2 palavras (nome e sobrenome)
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return false;
  
  // Palavras muito curtas não são válidas
  if (words.some(word => word.length < 2)) return false;
  
  // Evitar palavras-chave de documentos
  const keywords = ['REPÚBLICA', 'FEDERATIVA', 'BRASIL', 'ESTADO', 'SECRETARIA', 'SEGURANÇA', 'PÚBLICA', 'INSTITUTO', 'IDENTIFICAÇÃO', 'CARTEIRA', 'IDENTIDADE', 'REGISTRO', 'GERAL', 'FILIAÇÃO', 'NATURALIDADE', 'VÁLIDA', 'TERRITÓRIO', 'NACIONAL', 'CPF', 'DATA', 'NASCIMENTO', 'EXPEDIÇÃO'];
  const upperText = text.toUpperCase();
  if (keywords.some(keyword => upperText.includes(keyword))) return false;
  
  return true;
}

// Executar teste
const nomeEncontrado = debugNomeExtraction(textoRGExtraido);
console.log('\n📋 RESULTADO FINAL:');
console.log('Nome encontrado:', nomeEncontrado || 'NÃO ENCONTRADO');