/**
 * Sistema de debugging para rastrear fluxo de execução entre funções e arquivos
 * Mostra exatamente quando cada função é chamada e transições entre módulos
 */

interface FlowStep {
  timestamp: string;
  file: string;
  function: string;
  action: 'ENTER' | 'EXIT' | 'TRANSITION' | 'DATA' | 'ERROR';
  data?: any;
  duration?: number;
}

class FlowDebugger {
  private static steps: FlowStep[] = [];
  private static startTimes: Map<string, number> = new Map();

  /**
   * Marca entrada em uma função
   */
  static enter(file: string, functionName: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1];
    const key = `${file}:${functionName}`;
    
    this.startTimes.set(key, Date.now());
    
    console.log(`🔵 [${timestamp}] ENTRADA → ${file} :: ${functionName}()${data ? ' | Dados: ' + JSON.stringify(data).substring(0, 100) : ''}`);
    
    this.steps.push({
      timestamp,
      file,
      function: functionName,
      action: 'ENTER',
      data
    });
  }

  /**
   * Marca saída de uma função
   */
  static exit(file: string, functionName: string, result?: any) {
    const timestamp = new Date().toISOString().split('T')[1];
    const key = `${file}:${functionName}`;
    const startTime = this.startTimes.get(key);
    const duration = startTime ? Date.now() - startTime : undefined;
    
    console.log(`🔴 [${timestamp}] SAÍDA ← ${file} :: ${functionName}()${duration ? ` | Duração: ${duration}ms` : ''}${result ? ' | Resultado: ' + JSON.stringify(result).substring(0, 100) : ''}`);
    
    this.steps.push({
      timestamp,
      file,
      function: functionName,
      action: 'EXIT',
      data: result,
      duration
    });

    this.startTimes.delete(key);
  }

  /**
   * Marca transição entre arquivos/módulos
   */
  static transition(fromFile: string, fromFunction: string, toFile: string, toFunction: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1];
    
    console.log(`🔄 [${timestamp}] TRANSIÇÃO → ${fromFile}::${fromFunction}() ➜ ${toFile}::${toFunction}()${data ? ' | Dados: ' + JSON.stringify(data).substring(0, 100) : ''}`);
    
    this.steps.push({
      timestamp,
      file: `${fromFile} → ${toFile}`,
      function: `${fromFunction} → ${toFunction}`,
      action: 'TRANSITION',
      data
    });
  }

  /**
   * Registra dados importantes durante execução
   */
  static data(file: string, functionName: string, label: string, data: any) {
    const timestamp = new Date().toISOString().split('T')[1];
    
    const dataStr = JSON.stringify(data) || 'undefined';
    console.log(`📊 [${timestamp}] DADOS → ${file} :: ${functionName}() | ${label}: ${dataStr.substring(0, 150)}`);
    
    this.steps.push({
      timestamp,
      file,
      function: functionName,
      action: 'DATA',
      data: { label, value: data }
    });
  }

  /**
   * Registra erros com contexto
   */
  static error(file: string, functionName: string, error: any) {
    const timestamp = new Date().toISOString().split('T')[1];
    
    console.log(`❌ [${timestamp}] ERRO → ${file} :: ${functionName}() | Erro: ${error?.message || error}`);
    
    this.steps.push({
      timestamp,
      file,
      function: functionName,
      action: 'ERROR',
      data: error
    });
  }

  /**
   * Gera relatório completo do fluxo
   */
  static getFlowReport(): FlowStep[] {
    return [...this.steps];
  }

  /**
   * Limpa histórico de debug
   */
  static clear() {
    this.steps = [];
    this.startTimes.clear();
    console.log('🧹 Debug flow limpo');
  }

  /**
   * Gera resumo das operações
   */
  static getSummary() {
    const functionSet = new Set(this.steps.map(s => s.function));
    const fileSet = new Set(this.steps.map(s => s.file));
    
    const summary = {
      totalSteps: this.steps.length,
      functions: Array.from(functionSet),
      files: Array.from(fileSet),
      errors: this.steps.filter(s => s.action === 'ERROR'),
      totalDuration: this.steps
        .filter(s => s.duration)
        .reduce((acc, s) => acc + (s.duration || 0), 0)
    };

    console.log('📈 RESUMO DO FLUXO:', summary);
    return summary;
  }
}

export { FlowDebugger };