import fs from 'fs';

// Ler arquivo CSV
const csvContent = fs.readFileSync('attached_assets/Book2_1753569716085.csv', 'utf-8');
const lines = csvContent.split('\n');
const justificativas = [];

// Processar cada linha (pular cabeçalho)
let currentJustification = '';
let insideQuotes = false;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Verificar se a linha começa com aspas
    if (line.startsWith('"') && !insideQuotes) {
        insideQuotes = true;
        currentJustification = line.substring(1); // Remove aspas iniciais
    } else if (insideQuotes) {
        currentJustification += ' ' + line;
    }
    
    // Verificar se a linha termina com aspas
    if (line.endsWith('"') && insideQuotes) {
        insideQuotes = false;
        // Remove aspas finais e adiciona à lista
        currentJustification = currentJustification.slice(0, -1);
        if (currentJustification.trim()) {
            justificativas.push(currentJustification.trim());
        }
        currentJustification = '';
    }
}

console.log(`Total de justificativas processadas: ${justificativas.length}`);

// Analisar e classificar as justificativas
function classificarJustificativa(texto) {
    const textoLower = texto.toLowerCase();
    
    if (textoLower.includes('manguito rotador') && textoLower.includes('artroscóp')) {
        return { categoria: 'Reparo Manguito Rotador', conduta: 'Artroscopia' };
    } else if (textoLower.includes('manguito rotador') && textoLower.includes('aberta')) {
        return { categoria: 'Reparo Manguito Rotador', conduta: 'Cirurgia Aberta' };
    } else if (textoLower.includes('infiltração') && textoLower.includes('bloqueio')) {
        return { categoria: 'Infiltração e Bloqueio', conduta: 'Bloqueio - Guiado por USG' };
    } else if (textoLower.includes('luxação glenoumeral') && textoLower.includes('artroscóp')) {
        return { categoria: 'Luxação Glenoumeral', conduta: 'Artroscopia' };
    } else if (textoLower.includes('latarjet') || textoLower.includes('bristow')) {
        return { categoria: 'Luxação Glenoumeral', conduta: 'Latarjet' };
    } else if (textoLower.includes('acromioclavicular') || textoLower.includes('lac grau')) {
        return { categoria: 'Luxação Acrômio-Clavicular', conduta: 'LAC' };
    } else if (textoLower.includes('artroplastia reversa')) {
        if (textoLower.includes('fratura')) {
            return { categoria: 'Artroplastia Reversa', conduta: 'Fratura' };
        } else if (textoLower.includes('revisão') || textoLower.includes('falha')) {
            return { categoria: 'Artroplastia Reversa', conduta: 'Revisão' };
        } else {
            return { categoria: 'Artroplastia Reversa', conduta: 'Artroplastia' };
        }
    } else if (textoLower.includes('fratura da escápula') || textoLower.includes('escápula')) {
        return { categoria: 'Fratura da Escápula', conduta: 'Osteossíntese' };
    } else if (textoLower.includes('fratura') && textoLower.includes('clavícula')) {
        return { categoria: 'Fratura da Clavícula', conduta: 'Osteossíntese' };
    } else if (textoLower.includes('fratura') && textoLower.includes('coracóide')) {
        return { categoria: 'Fratura do Coracóide', conduta: 'Osteossíntese' };
    } else if (textoLower.includes('úmero proximal')) {
        return { categoria: 'Fratura Extremidade Proximal Úmero', conduta: 'Placa e Parafusos' };
    } else if (textoLower.includes('diafisária do úmero')) {
        if (textoLower.includes('haste')) {
            return { categoria: 'Fratura Diafisária Úmero', conduta: 'Haste Intramedular' };
        } else {
            return { categoria: 'Fratura Diafisária Úmero', conduta: 'Placa e Parafusos' };
        }
    } else if (textoLower.includes('úmero distal') || textoLower.includes('extremidade distal do úmero')) {
        return { categoria: 'Fratura Extremidade Distal Úmero', conduta: 'Placa e Parafusos' };
    } else if (textoLower.includes('cabeça do rádio')) {
        if (textoLower.includes('artroplastia')) {
            return { categoria: 'Fratura da Cabeça do Rádio', conduta: 'Artroplastia' };
        } else {
            return { categoria: 'Fratura da Cabeça do Rádio', conduta: 'Osteossíntese' };
        }
    } else if (textoLower.includes('olécrano')) {
        if (textoLower.includes('bursite')) {
            return { categoria: 'Bursite de Olécrano', conduta: 'Tratamento Cirúrgico' };
        } else {
            return { categoria: 'Fratura do Olécrano', conduta: 'Osteossíntese' };
        }
    } else if (textoLower.includes('epicondilite')) {
        if (textoLower.includes('artroscóp')) {
            return { categoria: 'Epicondilite', conduta: 'Artroscopia' };
        } else {
            return { categoria: 'Epicondilite', conduta: 'Cirurgia Aberta' };
        }
    } else if (textoLower.includes('peitoral maior')) {
        return { categoria: 'Ruptura Peitoral Maior', conduta: 'Cirurgia Aberta' };
    } else if (textoLower.includes('bíceps distal')) {
        return { categoria: 'Ruptura Bíceps Distal', conduta: 'Cirurgia Aberta' };
    } else if (textoLower.includes('antebraço') && textoLower.includes('diáfise')) {
        return { categoria: 'Fratura Ossos Antebraço', conduta: 'Osteossíntese' };
    } else if (textoLower.includes('extremidade distal do rádio')) {
        return { categoria: 'Fratura Extremidade Distal Rádio', conduta: 'Osteossíntese + Fios' };
    } else {
        return { categoria: 'Procedimento Ortopédico', conduta: 'Cirurgia Aberta' };
    }
}

// Gerar estatísticas
const stats = {};
justificativas.forEach(justificativa => {
    const classificacao = classificarJustificativa(justificativa);
    const key = `${classificacao.categoria} - ${classificacao.conduta}`;
    stats[key] = (stats[key] || 0) + 1;
});

console.log('\n=== ESTATÍSTICAS POR CATEGORIA ===');
Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([categoria, count]) => {
    console.log(`${categoria}: ${count} justificativas`);
});

// Gerar script SQL
let sqlScript = `-- Script de importação de justificativas clínicas
-- Data: ${new Date().toLocaleDateString('pt-BR')}
-- Total de justificativas: ${justificativas.length}

BEGIN;

`;

justificativas.forEach((justificativa, index) => {
    const classificacao = classificarJustificativa(justificativa);
    const titulo = `${classificacao.categoria} - ${classificacao.conduta}`;
    
    // Escapar aspas simples no SQL
    const conteudoEscapado = justificativa.replace(/'/g, "''");
    const tituloEscapado = titulo.replace(/'/g, "''");
    
    sqlScript += `-- Justificativa ${index + 1}: ${titulo}
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    '${tituloEscapado}',
    '${conteudoEscapado}',
    '${classificacao.categoria.replace(/'/g, "''")}',
    'Ortopedia e Traumatologia',
    '${classificacao.conduta.replace(/'/g, "''")}',
    true
);

`;
});

sqlScript += `COMMIT;

-- Verificar importação
SELECT COUNT(*) as total_justificativas FROM clinical_justifications;
SELECT category, COUNT(*) as count FROM clinical_justifications GROUP BY category ORDER BY count DESC;`;

// Salvar script SQL
fs.writeFileSync('import_clinical_justifications.sql', sqlScript, 'utf-8');
console.log('\n✅ Script SQL gerado: import_clinical_justifications.sql');
console.log(`📝 Total de ${justificativas.length} justificativas processadas`);