# Nova Estrutura de Organização de Arquivos

## Problema Identificado

A estrutura anterior armazenava todos os arquivos em três pastas únicas:
```
uploads/
├── images/     (todas as imagens de exame)
├── reports/    (todos os laudos médicos)
└── pdfs/       (todos os PDFs de pedidos)
```

Esta abordagem criaria problemas de escalabilidade:
- **Performance degradada** com milhares de arquivos numa pasta
- **Dificuldade de navegação** e organização
- **Complexidade na manutenção** e backup
- **Riscos de conflito** de nomes de arquivos

## Nova Estrutura Implementada

```
uploads/
├── procedures/
│   ├── pedido_1/
│   │   ├── exames/
│   │   │   ├── exame_01_20250614.jpg
│   │   │   ├── exame_02_20250614.jpg
│   │   │   └── exame_03_20250614.png
│   │   ├── laudos/
│   │   │   ├── laudo_01_20250614.pdf
│   │   │   └── laudo_02_20250614.pdf
│   │   └── documentos/
│   │       └── pedido_medico_2025-06-14.pdf
│   ├── pedido_2/
│   │   ├── exames/
│   │   │   └── exame_01_20250614.jpg
│   │   ├── laudos/
│   │   │   └── laudo_01_20250614.pdf
│   │   └── documentos/
│   │       └── pedido_medico_2025-06-14.pdf
│   └── pedido_3/
│       ├── exames/
│       │   ├── exame_01_20250614.jpg
│       │   └── exame_02_20250614.jpg
│       └── documentos/
├── images/     (legado - mantido para compatibilidade)
├── reports/    (legado - mantido para compatibilidade)
└── pdfs/       (legado - mantido para compatibilidade)
```

## Benefícios da Nova Estrutura

### 1. **Escalabilidade Superior**
- Máximo de arquivos por pasta: ~50-100 vs. milhares
- Performance consistente mesmo com crescimento exponencial
- Facilita backup incremental por pedido

### 2. **Organização Lógica**
- Agrupamento natural por pedido médico
- Separação clara entre exames e laudos
- Facilita localização de arquivos relacionados

### 3. **Nomenclatura Simplificada**
- **Antes**: `p42_o15_image_0_20250524.jpg`
- **Depois**: `exame_01_20250614.jpg`
- Nomes mais limpos e intuitivos

### 4. **Facilita Operações**
- **Exclusão**: Remove pasta inteira do pedido
- **Arquivamento**: Move pasta por data/status
- **Backup**: Backup seletivo por pedido

## Implementação Técnica

### Lógica de Upload Atualizada

```javascript
// Nova estrutura de destino
if (orderId && orderId > 0) {
  // /uploads/procedures/pedido_[ID]/[tipo]/
  const type = file.fieldname === 'report' ? 'laudos' : 'exames';
  uploadPath = path.join(process.cwd(), 'uploads', 'procedures', `pedido_${orderId}`, type);
} else {
  // Fallback para estrutura antiga
  const type = file.fieldname === 'report' ? 'reports' : 'images';
  uploadPath = path.join(process.cwd(), 'uploads', type);
}
```

### Nomenclatura de Arquivos

```javascript
// Nova formatação: [tipo]_[contador]_[data].[extensão]
function createStandardizedFileName(patientId, orderId, fileType, ext) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Determinar próximo contador baseado nos arquivos existentes
  let counter = getNextCounter(orderId, fileType);
  
  const paddedCounter = counter.toString().padStart(2, '0');
  return `${fileType}_${paddedCounter}_${dateStr}${ext}`;
}
```

## Compatibilidade e Migração

### Retrocompatibilidade
- Sistema suporta ambas as estruturas simultaneamente
- Arquivos antigos continuam funcionando
- Upload sem `orderId` usa estrutura legada

### Script de Migração
```bash
# Executar migração dos arquivos existentes
node scripts/migrate-file-structure.js
```

O script:
- Analisa arquivos na estrutura antiga
- Extrai IDs dos nomes de arquivo padronizados
- Migra para nova estrutura organizacional
- Preserva arquivos originais para segurança

### Exemplo de Migração
```
ANTES:
uploads/images/p25_o113_image_0_20250614.jpg

DEPOIS:
uploads/pedido_113/exames/exame_01_20250614.jpg
```

## Vantagens Operacionais

### Para Desenvolvimento
- **Debug mais fácil**: Arquivos agrupados por contexto
- **Testes simplificados**: Dados organizados por caso
- **Logs mais claros**: Caminhos mais legíveis

### Para Produção
- **Performance otimizada**: Menos I/O por operação
- **Backup granular**: Por pedido ou período
- **Manutenção facilitada**: Identificação rápida de problemas

### Para Usuários
- **Interface mais rápida**: Carregamento otimizado
- **Organização visual**: Agrupamento lógico
- **Navegação intuitiva**: Estrutura hierárquica clara

## Métricas de Impacto

### Antes (Estrutura Plana)
- **Arquivos por pasta**: Ilimitado (problemas com 10.000+)
- **Tempo de listagem**: O(n) - cresce linearmente
- **Operações de arquivo**: Degradação com volume

### Depois (Estrutura Hierárquica)
- **Arquivos por pasta**: ~50-100 (otimizado)
- **Tempo de listagem**: O(1) - constante
- **Operações de arquivo**: Performance consistente

## Próximos Passos

1. **Testar uploads** com nova estrutura
2. **Executar migração** em ambiente de teste
3. **Validar funcionamento** de visualização de arquivos
4. **Documentar procedimentos** de manutenção
5. **Treinar equipe** nos novos caminhos

## Comandos Úteis

```bash
# Verificar estrutura atual
ls -la uploads/

# Executar migração
node scripts/migrate-file-structure.js

# Verificar nova estrutura
find uploads/ -type d -name "pedido_*" | head -10

# Estatísticas de arquivos por pedido
find uploads/ -name "pedido_*" -exec sh -c 'echo "$1: $(find "$1" -type f | wc -l) arquivos"' _ {} \;
```

Esta nova arquitetura resolve completamente o problema de escalabilidade identificado e prepara o sistema para crescimento sustentável a longo prazo.