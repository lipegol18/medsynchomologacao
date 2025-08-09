/**
 * Teste direto da correção de extração de nome
 * Verifica se a nova estratégia "nome após FILIAÇÃO" funciona
 */

// Simular a classe RGAntigoUnificadoExtractor com apenas a função de extração de nome
class TestNameExtractor {
  
  extractFullName(text) {
    console.log('🔍 Iniciando extração de nome...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('📋 Total de linhas:', lines.length);
    
    // Estratégia específica: Nome após "FILIAÇÃO" (layout SP)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase().trim();
      if (line === 'FILIAÇÃO') {
        console.log(`🔍 Campo FILIAÇÃO encontrado na linha ${i}`);
        // O nome está na primeira linha após FILIAÇÃO
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          console.log(`   Analisando primeira linha após FILIAÇÃO: "${nextLine}"`);
          
          if (this.isValidName(nextLine) && nextLine.length > 5) {
            console.log('✅ Nome encontrado após FILIAÇÃO:', nextLine);
            return this.formatName(nextLine);
          }
        }
      }
    }
    
    console.log('❌ Nome não encontrado');
    return null;
  }
  
  isValidName(text) {
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
  
  formatName(name) {
    return name.toUpperCase().trim();
  }
}

// Texto de teste com o padrão problemático
const textoTeste = `REPÚBLICA FEDERATIVA DO BRASIL
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

// Executar teste
console.log('🧪 Testando correção da extração de nome...\n');

const extractor = new TestNameExtractor();
const nomeExtraido = extractor.extractFullName(textoTeste);

console.log('\n📋 RESULTADO:');
console.log('Nome extraído:', nomeExtraido);
console.log('Status:', nomeExtraido ? '✅ SUCESSO' : '❌ FALHA');

if (nomeExtraido === 'DANIEL COELHO DA COSTA') {
  console.log('🎉 Correção funcionou perfeitamente!');
} else {
  console.log('⚠️ Correção precisa de ajustes');
}