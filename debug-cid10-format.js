// Debug script para testar formatação CID-10
function formatCID10Code(value) {
  // Remove espaços e converte para maiúsculo
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  
  // Se não há conteúdo, retorna vazio
  if (!cleaned) return '';
  
  // Verifica se começa com letra (padrão CID-10)
  if (!/^[A-Z]/.test(cleaned)) {
    return cleaned; // Retorna como está se não começar com letra
  }
  
  // Se já está formatado corretamente (ex: M17.0), retorna como está
  if (/^[A-Z]\d{2}(\.\d+)?$/.test(cleaned)) {
    return cleaned;
  }
  
  // Extrai a letra inicial e os números
  const letter = cleaned.charAt(0);
  const numbers = cleaned.slice(1).replace(/\D/g, ''); // Remove tudo que não é número
  
  // Limita a 3 dígitos no máximo
  const limitedNumbers = numbers.slice(0, 3);
  
  // Aplica a formatação progressiva
  let formatted = letter + limitedNumbers;
  
  // Se tem mais de 2 dígitos, adiciona ponto antes do terceiro
  if (limitedNumbers.length > 2) {
    formatted = letter + limitedNumbers.slice(0, 2) + '.' + limitedNumbers.slice(2);
  }
  
  return formatted;
}

// Testes
const testCodes = ['M17.0', 'M171', 'M17', 'M751', 'A001'];

console.log('Testando formatação CID-10:');
testCodes.forEach(code => {
  console.log(`Input: "${code}" -> Output: "${formatCID10Code(code)}"`);
});