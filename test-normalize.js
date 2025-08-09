function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const nomes = ['FelipeSantosCorrea', 'João do pé de Feijão1', 'Maria Silva Santos'];
const termo = 'joao';

console.log('Termo normalizado:', normalizeText(termo));
console.log('');

nomes.forEach(nome => {
  const nomeNormalizado = normalizeText(nome);
  const includes = nomeNormalizado.includes(normalizeText(termo));
  console.log(`Nome: ${nome}`);
  console.log(`Normalizado: ${nomeNormalizado}`);
  console.log(`Contém 'joao': ${includes}`);
  console.log('---');
});