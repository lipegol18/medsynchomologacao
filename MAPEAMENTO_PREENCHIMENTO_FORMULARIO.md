# Mapeamento: Dados Extraídos → Preenchimento do Formulário

## 🎯 Fluxo Completo: Carteirinha → Formulário

### 1. **Upload da Carteirinha**
```typescript
// Arquivo: client/src/components/patients/patient-form-dialog.tsx
// Linha 450-455
const handleInsuranceCardFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    processInsuranceCardWithOCR(file); // ← Inicia processamento
  }
};
```

### 2. **Processamento com Nova Arquitetura**
```typescript
// Linha 240-252: Envio para nova arquitetura modular
const processInsuranceCardWithOCR = async (file: File) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('documentType', 'insurance');

  const result = await apiRequest("/api/process-document", "POST", formData);
  // ↓ result.data contém dados extraídos pela nova arquitetura
}
```

### 3. **Dados Extraídos pela Nova Arquitetura** 
```json
// Estrutura retornada pelo extraction-orchestrator.ts:
{
  "success": true,
  "data": {
    "operadora": "SULAMERICA",
    "plano": "ESPECIAL", 
    "numeroCarteirinha": "88888487287680017",
    "nomeTitular": "ROSANA ROITMAN",
    "dataNascimento": "08/04/1965",
    "cns": "703601098762138",
    "ansCode": "006246",
    "normalizedOperadora": "Sul América" // ← Para busca no banco
  }
}
```

## 📝 Preenchimento Automático dos Campos

### **Campo 1: Seguradora/Operadora**
```typescript
// Linha 285-286: Seleciona operadora automaticamente
setSelectedProvider(provider);
form.setValue('insurance', provider.name);
```
- **Origem**: `result.data.normalizedOperadora` → busca no banco
- **Campo**: `insurance` (componente HealthInsuranceSearch)
- **Resultado**: "Sul América" selecionada automaticamente

### **Campo 2: Plano**
```typescript
// Linha 354-355: Seleciona plano por similaridade
setSelectedPlan(bestMatch);
form.setValue('plan', bestMatch.nmPlano || `Plano ${bestMatch.cdPlano}`);
```
- **Origem**: `result.data.plano` → busca por similaridade
- **Campo**: `plan` (componente HealthInsurancePlanSearch)  
- **Resultado**: "ESPECIAL" → encontra plano no banco com 90%+ similaridade

### **Campo 3: Número da Carteirinha**
```typescript
// Linha 412-414: Preenche número diretamente
if (result.data.numeroCarteirinha) {
  form.setValue('insuranceNumber', result.data.numeroCarteirinha);
}
```
- **Origem**: `result.data.numeroCarteirinha` (extrator Sul América)
- **Campo**: `insuranceNumber` (Input simples)
- **Resultado**: "88888487287680017" preenchido diretamente

### **Campo 4: Nome do Titular** (Se detectado)
```typescript
// Linha 801-803: Exibe nome extraído (informativo)
{extractedInfo.data.nomeTitular && (
  <div>Nome do Titular: {extractedInfo.data.nomeTitular}</div>
)}
```
- **Origem**: `result.data.nomeTitular`
- **Campo**: Exibição informativa (não preenche formulário automaticamente)
- **Resultado**: "ROSANA ROITMAN" mostrado como informação extraída

## 🔄 Processo de Busca Inteligente

### **Busca da Operadora:**
```typescript
// Linha 261: Busca operadora normalizada no banco
const searchUrl = `/api/health-insurance-providers/search?q=${encodeURIComponent(result.data.normalizedOperadora)}`;
```

### **Busca do Plano por Similaridade:**
```typescript
// Linha 301: Busca planos por similaridade
const searchUrl = `/api/health-insurance-plans/provider/${provider.ansCode}/search?q=${encodeURIComponent(result.data.plano)}`;
```

### **Critérios de Seleção Automática:**
```typescript
// Linha 341-351: Thresholds adaptativos
let scoreThreshold = 0.45; // padrão
if (isExactMatch) {
  scoreThreshold = 0.25; // mais permissivo para matches exatos
} else if (hasKeywordMatch && commonWords.length > 0) {
  scoreThreshold = 0.25; // muito permissivo para matches com palavras importantes
}
```

## 📊 Campos do Formulário Preenchidos

| **Campo do Formulário** | **Dados Extraídos** | **Método** | **Exemplo Sul América** |
|-------------------------|---------------------|------------|-------------------------|
| `insurance` | `normalizedOperadora` | Busca no banco | "Sul América" |
| `plan` | `plano` | Similaridade + threshold | "ESPECIAL" → "Plano Especial 100" |
| `insuranceNumber` | `numeroCarteirinha` | Direto | "88888487287680017" |
| *Informativo* | `nomeTitular` | Exibição | "ROSANA ROITMAN" |
| *Informativo* | `dataNascimento` | Exibição | "08/04/1965" |
| *Informativo* | `cns` | Exibição | "703601098762138" |

## 🎯 Resultado Final

Quando uma carteirinha Sul América é processada:

1. **Upload** → Nova arquitetura modular processa
2. **Extração** → SulAmericaExtractor extrai dados específicos
3. **Normalização** → Operadora mapeada para "Sul América"
4. **Busca** → Sistema encontra operadora no banco
5. **Preenchimento** → 3 campos preenchidos automaticamente:
   - ✅ Seguradora: "Sul América" 
   - ✅ Plano: "ESPECIAL" (ou plano similar do banco)
   - ✅ Número: "88888487287680017"
6. **Feedback** → Toast confirma sucesso com 93.33% confidence

O usuário só precisa revisar e confirmar os dados preenchidos automaticamente!