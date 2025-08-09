import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugGenderDetection() {
  console.log("🔍 Analisando documento para detecção de gênero...\n");
  
  // Usar o documento que você está testando
  const imagePath = path.join(__dirname, 'attached_assets/WhatsApp Image 2025-05-17 at 14.02.49.jpeg');
  
  try {
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Arquivo não encontrado: ${imagePath}`);
      return;
    }
    
    console.log("📄 Processando documento com OCR...");
    
    const result = await Tesseract.recognize(
      imagePath,
      'por',
      { 
        logger: m => console.log(`OCR: ${m?.status || JSON.stringify(m)}`)
      }
    );
    
    const extractedText = result.data.text;
    console.log("\n📝 TEXTO COMPLETO EXTRAÍDO:");
    console.log("=" .repeat(50));
    console.log(extractedText);
    console.log("=" .repeat(50));
    
    console.log("\n👤 ANÁLISE DE NOME:");
    console.log("-" .repeat(30));
    
    // Aplicar os mesmos padrões que o sistema usa para nome
    const namePatterns = [
      { name: "Nome:", pattern: /Nome:?\s*([A-Za-zÀ-ÿ\s]+?)(?:CPF|NASC|RG|Nasc|Doc|Data|Sexo|$)/i },
      { name: "Paciente:", pattern: /Paciente:?\s*([A-Za-zÀ-ÿ\s]+?)(?:CPF|NASC|RG|Nasc|Doc|Data|Sexo|$)/i },
      { name: "Titular:", pattern: /Titular:?\s*([A-Za-zÀ-ÿ\s]+?)(?:CPF|NASC|RG|Nasc|Doc|Data|Sexo|$)/i },
      { name: "NOME:", pattern: /NOME:?\s*([A-Za-zÀ-ÿ\s]+?)(?:FILIAÇÃO|NATURALIDADE|DOC|DATA|$)/i },
      { name: "Nome próprio:", pattern: /([A-Z][a-zÀ-ÿ]+\s+(?:[A-Z][a-zÀ-ÿ]+\s+){1,5}[A-Z][a-zÀ-ÿ]+)/ },
      { name: "Maiúsculas:", pattern: /([A-ZÀ-Ÿ]{2,}\s+(?:[A-ZÀ-Ÿ]{2,}\s+){1,5}[A-ZÀ-Ÿ]{2,})(?:\s|$)/ }
    ];
    
    let nameFound = false;
    
    for (const { name, pattern } of namePatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        let nome = match[1].trim()
          .replace(/\d+/g, '') // Remover dígitos
          .replace(/[^\wÀ-ÿ\s]/g, '') // Manter apenas letras, espaços e acentos
          .replace(/\s{2,}/g, ' ') // Normalizar espaços
          .trim();
        
        if (nome.length > 5 && nome.includes(' ')) {
          const nomeFormatado = nome.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          console.log(`✅ NOME ENCONTRADO - Padrão: ${name}`);
          console.log(`   Nome detectado: "${nome}"`);
          console.log(`   Nome formatado: "${nomeFormatado}"`);
          console.log(`   Contexto: "${match[0]}"`);
          
          nameFound = true;
          break;
        }
      } else {
        console.log(`❌ Não encontrado - Padrão: ${name}`);
      }
    }
    
    if (!nameFound) {
      console.log("\n⚠️  NENHUM PADRÃO DE NOME DETECTADO");
      console.log("Verificando linhas que podem conter nomes:");
      
      const lines = extractedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 5);
      
      console.log("Primeiras 10 linhas do documento:");
      lines.slice(0, 10).forEach((line, index) => {
        console.log(`  Linha ${index + 1}: "${line}"`);
      });
    }

    console.log("\n🔍 ANÁLISE DE GÊNERO:");
    console.log("-" .repeat(30));
    
    // Aplicar os mesmos padrões que o sistema usa
    const genderPatterns = [
      { name: "Sexo:", pattern: /Sexo:?\s*([MF])/i },
      { name: "Gênero:", pattern: /Gênero:?\s*([MF])/i },
      { name: "SEXO:", pattern: /SEXO:?\s*([MF])/i },
      { name: "Sex:", pattern: /Sex:?\s*([MF])\b/i },
      { name: "SEXO espaços:", pattern: /SEXO[\s:]*([MF])\b/i },
      { name: "SEX espaços:", pattern: /SEX[\s:]*([MF])\b/i },
      { name: "M/F em quebra linha:", pattern: /\n\s*([MF])\s*\n/i },
      { name: "M/F final linha:", pattern: /\n\s*([MF])\s*$/i },
      { name: "M/F com espaços:", pattern: /\s+([MF])\s+/i },
      { name: "M/F após data:", pattern: /\d{2}\/\d{2}\/\d{4}\s+([MF])/i },
      { name: "Palavra completa:", pattern: /\b(MASCULINO|FEMININO)\b/i },
      { name: "Abreviação:", pattern: /\b(MASC|FEM)\b/i }
    ];
    
    let genderFound = false;
    
    for (const { name, pattern } of genderPatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        const genderValue = match[1].toUpperCase();
        let mappedGender = '';
        
        if (genderValue === 'M' || genderValue === 'MASCULINO' || genderValue === 'MASC') {
          mappedGender = 'Masculino';
        } else if (genderValue === 'F' || genderValue === 'FEMININO' || genderValue === 'FEM') {
          mappedGender = 'Feminino';
        }
        
        console.log(`✅ ENCONTRADO - Padrão: ${name}`);
        console.log(`   Valor detectado: "${genderValue}"`);
        console.log(`   Mapeado para: "${mappedGender}"`);
        console.log(`   Contexto: "${match[0]}"`);
        
        genderFound = true;
        break; // Para no primeiro match, como o sistema real faz
      } else {
        console.log(`❌ Não encontrado - Padrão: ${name}`);
      }
    }
    
    if (!genderFound) {
      console.log("\n⚠️  NENHUM PADRÃO DE GÊNERO DETECTADO");
      console.log("Verificando se há letras M ou F isoladas no texto:");
      
      const linesWithMF = extractedText.split('\n')
        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
        .filter(({ line }) => line.includes('M') || line.includes('F'))
        .slice(0, 5); // Mostrar apenas as primeiras 5 linhas
      
      if (linesWithMF.length > 0) {
        console.log("Linhas que contêm M ou F:");
        linesWithMF.forEach(({ line, number }) => {
          console.log(`  Linha ${number}: "${line}"`);
        });
      } else {
        console.log("Não há M ou F no texto extraído.");
      }
    }
    
  } catch (error) {
    console.error("❌ Erro ao processar documento:", error);
  }
}

debugGenderDetection();