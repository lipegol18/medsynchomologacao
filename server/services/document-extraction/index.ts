import { ExtractionOrchestrator } from './core/extraction-orchestrator';
import { ExtractionResult } from './types/extraction-types';

/**
 * Interface principal do novo sistema de extração de documentos
 * Mantém compatibilidade com o sistema atual enquanto introduz a nova arquitetura
 */
export class DocumentExtractionService {
  private orchestrator: ExtractionOrchestrator;

  constructor() {
    this.orchestrator = new ExtractionOrchestrator();
  }

  /**
   * Processa documento de carteirinha de plano de saúde
   * @param imageBuffer Buffer da imagem
   * @returns Promise<ExtractionResult> Resultado estruturado da extração
   */
  async processInsuranceCard(imageBuffer: Buffer): Promise<ExtractionResult> {
    console.log('📋 Processando carteirinha de plano de saúde com nova arquitetura...');
    return await this.orchestrator.processDocument(imageBuffer);
  }

  /**
   * Método de compatibilidade para manter interface atual
   * Converte resultado novo para formato esperado pelo sistema atual
   */
  async processInsuranceCardLegacy(imageBuffer: Buffer): Promise<any> {
    const result = await this.processInsuranceCard(imageBuffer);
    
    if (!result.success) {
      throw new Error(result.errors?.join(', ') || 'Erro na extração');
    }

    // Converter para formato legacy esperado pelo sistema atual
    return {
      success: true,
      extractedText: 'Texto processado pela nova arquitetura',
      data: {
        ansCode: result.data.ansCode,
        nomeTitular: result.data.nomeTitular,
        dataNascimento: result.data.dataNascimento,
        plano: result.data.plano,
        numeroCarteirinha: result.data.numeroCarteirinha,
        cns: result.data.cns,
        operadora: result.data.operadora,
        confidence: result.confidence,
        method: result.method
      }
    };
  }
}

// Instância singleton para uso no sistema
export const documentExtractionService = new DocumentExtractionService();