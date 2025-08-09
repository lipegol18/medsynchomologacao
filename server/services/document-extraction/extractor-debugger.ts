import { EXTRATORES_STATUS, DEBUGGING_FEATURES, gerarRelatorioOperadoras } from './status-report';

/**
 * Sistema de debugging para extratores de operadoras
 * Mostra logs detalhados de cada etapa da extração
 */
export class ExtractorDebugger {
  
  /**
   * Debug específico para Sul América
   */
  static debugSulAmerica(text: string): any {
    console.log('\n🔍 DEBUG SUL AMÉRICA');
    console.log('='.repeat(40));
    
    const pattern = /\b(8{3,4}\d{13,14})\b/;
    console.log('Padrão usado:', pattern.source);
    console.log('Texto analisado:', text.substring(0, 200) + '...');
    
    // Buscar todos os números que começam com 8
    const numerosComOito = text.match(/8\d+/g) || [];
    console.log('Números encontrados começando com 8:', numerosComOito);
    
    // Aplicar padrão específico
    const match = text.match(pattern);
    if (match) {
      console.log('✅ Match encontrado:', match[1]);
      console.log('Tamanho:', match[1].length, 'dígitos');
      console.log('Começa com 888/8888:', /^8{3,4}/.test(match[1]));
      return { success: true, numero: match[1], detalhes: match };
    } else {
      console.log('❌ Nenhum match encontrado');
      return { success: false, motivo: 'Padrão não encontrado' };
    }
  }
  
  /**
   * Debug específico para Bradesco
   */
  static debugBradesco(text: string): any {
    console.log('\n🔍 DEBUG BRADESCO');
    console.log('='.repeat(40));
    
    // Verificar se há CNS presente (contexto importante)
    const cnsPattern = /CNS[\s:]*(\d{15})/;
    const cnsMatch = text.match(cnsPattern);
    console.log('CNS detectado:', cnsMatch ? cnsMatch[1] : 'Não');
    
    const pattern = /(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/;
    console.log('Padrão usado:', pattern.source);
    
    // Buscar todos os grupos de números
    const gruposNumeros = text.match(/\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3}/g) || [];
    console.log('Grupos encontrados:', gruposNumeros);
    
    const match = text.match(pattern);
    if (match) {
      const numeroLimpo = match[1].replace(/\s/g, '');
      console.log('✅ Match encontrado:', match[1]);
      console.log('Número limpo:', numeroLimpo);
      console.log('Tamanho final:', numeroLimpo.length, 'dígitos');
      return { success: true, numero: numeroLimpo, original: match[1] };
    } else {
      console.log('❌ Nenhum match encontrado');
      return { success: false, motivo: 'Padrão não encontrado' };
    }
  }
  
  /**
   * Debug específico para Unimed
   */
  static debugUnimed(text: string): any {
    console.log('\n🔍 DEBUG UNIMED');
    console.log('='.repeat(40));
    
    const pattern = /(\d)\s+(\d{3})\s+(\d{12})\s+(\d)/;
    console.log('Padrão usado:', pattern.source);
    console.log('Formato esperado: X XXX XXXXXXXXXXXX X');
    
    const match = text.match(pattern);
    if (match) {
      console.log('✅ Match encontrado:');
      console.log('  Grupo 1 (1º dígito):', match[1]);
      console.log('  Grupo 2 (3 dígitos):', match[2]);
      console.log('  Grupo 3 (12 dígitos):', match[3]);
      console.log('  Grupo 4 (último dígito):', match[4]);
      
      const numeroFinal = match[1] + match[2] + match[3] + match[4];
      console.log('Número concatenado:', numeroFinal);
      console.log('Tamanho total:', numeroFinal.length, 'dígitos');
      
      return { 
        success: true, 
        numero: numeroFinal, 
        grupos: [match[1], match[2], match[3], match[4]] 
      };
    } else {
      console.log('❌ Nenhum match encontrado');
      // Tentar encontrar números similares para debug
      const numerosSeparados = text.match(/\d+\s+\d+\s+\d+\s+\d+/g) || [];
      console.log('Números separados por espaço encontrados:', numerosSeparados);
      return { success: false, motivo: 'Padrão não encontrado', alternativas: numerosSeparados };
    }
  }
  
  /**
   * Debug específico para Amil
   */
  static debugAmil(text: string): any {
    console.log('\n🔍 DEBUG AMIL');
    console.log('='.repeat(40));
    
    // Verificar contexto "Número do Beneficiário"
    const contexto = /Número do Beneficiário/i.test(text);
    console.log('Contexto "Número do Beneficiário" encontrado:', contexto);
    
    const pattern = /(\d{8})\s+(\d)/;
    console.log('Padrão usado:', pattern.source);
    console.log('Formato esperado: XXXXXXXX X');
    
    // Verificar se há datas que podem causar confusão
    const datas = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    console.log('Datas encontradas (possível confusão):', datas);
    
    const match = text.match(pattern);
    if (match) {
      const numeroCompleto = match[1] + match[2];
      console.log('✅ Match encontrado:');
      console.log('  Número principal:', match[1]);
      console.log('  Dígito verificador:', match[2]);
      console.log('  Número completo:', numeroCompleto);
      console.log('  Tamanho:', numeroCompleto.length, 'dígitos');
      
      // Verificar se não é uma data disfarçada
      const possivelData = match[1].match(/^\d{2}\d{2}\d{4}$/);
      if (possivelData) {
        console.log('⚠️ Aviso: Pode ser uma data disfarçada');
      }
      
      return { success: true, numero: numeroCompleto, principal: match[1], digito: match[2] };
    } else {
      console.log('❌ Nenhum match encontrado');
      const numerosAmil = text.match(/\d{8,12}/g) || [];
      console.log('Números de 8-12 dígitos encontrados:', numerosAmil);
      return { success: false, motivo: 'Padrão não encontrado', candidatos: numerosAmil };
    }
  }
  
  /**
   * Debug específico para Porto Saúde
   */
  static debugPorto(text: string): any {
    console.log('\n🔍 DEBUG PORTO SAÚDE');
    console.log('='.repeat(40));
    
    const pattern = /(\d{4})\s+(\d{4})\s+(\d{4})\s+(\d{4})/;
    console.log('Padrão usado:', pattern.source);
    console.log('Formato esperado: XXXX XXXX XXXX XXXX (tipo cartão de crédito)');
    
    const match = text.match(pattern);
    if (match) {
      console.log('✅ Match encontrado:');
      console.log('  Grupo 1:', match[1]);
      console.log('  Grupo 2:', match[2]);
      console.log('  Grupo 3:', match[3]);
      console.log('  Grupo 4:', match[4]);
      
      const numeroFinal = match[1] + match[2] + match[3] + match[4];
      console.log('Número concatenado:', numeroFinal);
      console.log('Tamanho total:', numeroFinal.length, 'dígitos');
      
      return { 
        success: true, 
        numero: numeroFinal, 
        grupos: [match[1], match[2], match[3], match[4]] 
      };
    } else {
      console.log('❌ Nenhum match encontrado');
      // Procurar números em formato de cartão
      const formatosCartao = text.match(/\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}/g) || [];
      console.log('Formatos de cartão encontrados:', formatosCartao);
      return { success: false, motivo: 'Padrão não encontrado', alternativas: formatosCartao };
    }
  }
  
  /**
   * Testa todos os extratores com um texto
   */
  static testarTodosExtratores(text: string): void {
    console.log('\n🧪 TESTE COMPLETO DE TODOS OS EXTRATORES');
    console.log('='.repeat(60));
    console.log('Texto de entrada:', text.substring(0, 100) + '...');
    
    const resultados = {
      sulAmerica: this.debugSulAmerica(text),
      bradesco: this.debugBradesco(text),
      unimed: this.debugUnimed(text),
      amil: this.debugAmil(text),
      porto: this.debugPorto(text)
    };
    
    console.log('\n📊 RESUMO DOS RESULTADOS:');
    console.log('='.repeat(30));
    Object.entries(resultados).forEach(([operadora, resultado]) => {
      const status = resultado.success ? '✅' : '❌';
      const numero = resultado.success ? resultado.numero : 'N/A';
      console.log(`${status} ${operadora.toUpperCase()}: ${numero}`);
    });
    
    return resultados;
  }
  
  /**
   * Mostra relatório completo do status
   */
  static mostrarRelatorioCompleto(): void {
    console.log(gerarRelatorioOperadoras());
    
    console.log('\n🛠️ RECURSOS DE DEBUG DISPONÍVEIS:');
    console.log('='.repeat(50));
    Object.entries(DEBUGGING_FEATURES).forEach(([operadora, recursos]) => {
      console.log(`\n${operadora}:`);
      recursos.forEach(recurso => console.log(`  • ${recurso}`));
    });
  }
}