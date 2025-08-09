# 📍 LOCALIZAÇÃO DOS 5 EXTRATORES FUNCIONAIS

## 🗂️ ONDE ESTÃO OS CÓDIGOS ATUALMENTE

### 1. **LOCALIZAÇÃO ATUAL (Temporária)**
Os 5 extratores estão implementados em:
**`server/services/document-extraction/core/extraction-orchestrator.ts`**
- Linhas 146-179: Métodos privados básicos
- Função `extractCardNumberByOperator()` (linha 125-141)

### 2. **NOVA LOCALIZAÇÃO (Arquitetura Modular)**
Estou movendo para extratores específicos organizados em:
**`server/services/document-extraction/extractors/`**

```
extractors/
├── sulamerica-extractor.ts     ✅ Criado
├── bradesco-extractor.ts       ✅ Criado  
├── unimed-extractor.ts         🔄 Criando agora
├── amil-extractor.ts           🔄 Criando agora
└── porto-extractor.ts          🔄 Criando agora
```

## 📋 CÓDIGO ATUAL DOS 5 EXTRATORES

### **Sul América** (linha 160-165)
```typescript
private extractSulAmericaCard(text: string): string | null {
  const pattern = /\b(8{3,4}\d{13,14})\b/;
  const match = text.match(pattern);
  return match ? match[1] : null;
}
```

### **Bradesco** (linha 146-151)
```typescript
private extractBradescoCard(text: string): string | null {
  const pattern = /(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/;
  const match = text.match(pattern);
  return match ? match[1].replace(/\s/g, '') : null;
}
```

### **Unimed** (linha 153-158)
```typescript
private extractUnimedCard(text: string): string | null {
  const pattern = /(\d)\s+(\d{3})\s+(\d{12})\s+(\d)/;
  const match = text.match(pattern);
  return match ? match[1] + match[2] + match[3] + match[4] : null;
}
```

### **Amil** (linha 167-172)
```typescript
private extractAmilCard(text: string): string | null {
  const pattern = /(\d{8})\s+(\d)/;
  const match = text.match(pattern);
  return match ? match[1] + match[2] : null;
}
```

### **Porto Seguro** (linha 174-179)
```typescript
private extractPortoCard(text: string): string | null {
  const pattern = /(\d{4})\s+(\d{4})\s+(\d{4})\s+(\d{4})/;
  const match = text.match(pattern);
  return match ? match[1] + match[2] + match[3] + match[4] : null;
}
```

## 🎯 STATUS ATUAL

✅ **FUNCIONANDO**: Os 5 extratores estão implementados e funcionais
🔄 **EM MIGRAÇÃO**: Movendo para arquitetura modular mais robusta
📋 **TESTING**: Validados com padrões específicos de cada operadora

## 🔄 PRÓXIMAS AÇÕES

1. Finalizar criação dos extratores modulares restantes
2. Integrar extratores modulares no orquestrador
3. Manter compatibilidade com implementação atual
4. Adicionar debugging avançado para cada extrator