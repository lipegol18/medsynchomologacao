# Associações entre CID, Condutas Cirúrgicas e Justificativas Clínicas

## Estrutura das Associações no Banco de Dados

### 1. **CID → Conduta Cirúrgica** (Tabela: `cid_surgical_approaches`)

```
┌─────────────┐    N:M    ┌─────────────────────┐
│  cid_codes  │ ←──────→  │ surgical_approaches │
└─────────────┘           └─────────────────────┘
       │                           │
       └─── cid_surgical_approaches ───┘

Campos da associação:
- cid_code_id (FK → cid_codes.id)
- surgical_approach_id (FK → surgical_approaches.id)
- is_preferred (boolean) - indica se é a conduta preferencial
- notes (text) - observações específicas da associação
```

**Exemplo prático:**
```sql
CID M75.1 (Síndrome do manguito rotador) pode ter:
├── Videoartroscopia (preferencial: TRUE)
├── Cirurgia Aberta (preferencial: FALSE)
└── Cirurgia Robótica (preferencial: FALSE)
```

### 2. **Conduta Cirúrgica → Justificativa Clínica** (Tabela: `surgical_approach_justifications`)

```
┌─────────────────────┐    N:M    ┌─────────────────────────┐
│ surgical_approaches │ ←──────→  │ clinical_justifications │
└─────────────────────┘           └─────────────────────────┘
           │                               │
           └── surgical_approach_justifications ──┘

Campos da associação:
- surgical_approach_id (FK → surgical_approaches.id)
- justification_id (FK → clinical_justifications.id)
- is_preferred (boolean) - indica se é a justificativa preferencial
- custom_notes (text) - adaptações específicas do texto
```

**Exemplo prático:**
```sql
Cirurgia Aberta pode ter justificativas para:
├── Artroplastia Total de Joelho (preferencial: TRUE)
├── Osteossíntese de Fratura de Fêmur (preferencial: FALSE)
└── Reparo de Lesão do Manguito Rotador (preferencial: FALSE)
```

### 3. **CIDs Automáticos** (Tabela: `cid_surgical_approach_extra_cids`)

```
CID Principal + Conduta Cirúrgica → CIDs Automáticos Adicionais

Campos:
- primary_cid_id (FK → cid_codes.id) - CID principal selecionado
- surgical_approach_id (FK → surgical_approaches.id) - Conduta escolhida
- extra_cid_id (FK → cid_codes.id) - CID adicional automático
- is_required (boolean) - se o CID adicional é obrigatório
- notes (text) - justificativa para a adição automática
```

## Fluxo de Funcionamento

### **Passo 1: Seleção do CID**
Médico seleciona CID principal (ex: M75.1 - Síndrome do manguito rotador)

### **Passo 2: Condutas Disponíveis**
Sistema consulta `cid_surgical_approaches` e retorna condutas possíveis:
```sql
SELECT sa.* FROM surgical_approaches sa
JOIN cid_surgical_approaches csa ON sa.id = csa.surgical_approach_id
WHERE csa.cid_code_id = [ID_DO_CID_M75.1]
ORDER BY csa.is_preferred DESC
```

### **Passo 3: Seleção da Conduta**
Médico escolhe conduta (ex: "Cirurgia Aberta")

### **Passo 4: Justificativas Disponíveis**
Sistema consulta `surgical_approach_justifications` e retorna justificativas:
```sql
SELECT cj.* FROM clinical_justifications cj
JOIN surgical_approach_justifications saj ON cj.id = saj.justification_id
WHERE saj.surgical_approach_id = [ID_DA_CIRURGIA_ABERTA]
ORDER BY saj.is_preferred DESC
```

### **Passo 5: CIDs Automáticos** (Opcional)
Sistema verifica se há CIDs automáticos para a combinação:
```sql
SELECT extra_cid.* FROM cid_codes extra_cid
JOIN cid_surgical_approach_extra_cids csaec ON extra_cid.id = csaec.extra_cid_id
WHERE csaec.primary_cid_id = [ID_DO_CID_M75.1]
  AND csaec.surgical_approach_id = [ID_DA_CIRURGIA_ABERTA]
```

## Exemplo Completo de Uso

**Cenário:** Médico cria pedido para "Síndrome do manguito rotador"

1. **Seleciona CID:** M75.1 - Síndrome do manguito rotador
2. **Sistema oferece condutas:**
   - ✅ Videoartroscopia (preferencial)
   - Cirurgia Aberta
   - Cirurgia Robótica
3. **Médico escolhe:** "Cirurgia Aberta"
4. **Sistema oferece justificativas:**
   - ✅ Reparo de Lesão do Manguito Rotador (preferencial)
   - Artroplastia Total de Joelho
   - Osteossíntese de Fratura de Fêmur
5. **Sistema adiciona CIDs automáticos:** S460 - Traumatismo de tendão do manguito rotador

## Vantagens desta Arquitetura

✅ **Flexibilidade:** Qualquer CID pode ter múltiplas condutas
✅ **Consistência:** Justificativas padronizadas por conduta
✅ **Automação:** CIDs complementares adicionados automaticamente
✅ **Rastreabilidade:** Histórico completo de escolhas médicas
✅ **Manutenibilidade:** Fácil adição de novas associações
✅ **Compliance:** Atende normas médicas brasileiras

## APIs Disponíveis

- `GET /api/cid-surgical-approaches/cid/:cidId` - Condutas para um CID
- `GET /api/surgical-approach-justifications/approach/:approachId` - Justificativas para uma conduta
- `GET /api/surgical-approaches/:id/complete` - Auto-preenchimento completo (CID + conduta)