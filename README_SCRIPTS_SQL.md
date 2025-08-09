# 📋 Scripts SQL para Sistema de Auto-preenchimento

## 📝 Descrição

Conjunto de scripts SQL organizados para popular as tabelas de associação do sistema de auto-preenchimento baseado em **CID + Conduta Cirúrgica**.

## 🗂️ Estrutura dos Scripts

### **Scripts Individuais (Ordem de Execução)**

| Script | Arquivo | Descrição | Dependências |
|--------|---------|-----------|--------------|
| 01 | `01_surgical_approaches.sql` | Condutas cirúrgicas | Nenhuma |
| 02 | `02_clinical_justifications.sql` | Justificativas clínicas | Nenhuma |
| 03 | `03_cid_surgical_approaches.sql` | CID × Conduta | `surgical_approaches`, `cid_codes` |
| 04 | `04_surgical_approach_procedures.sql` | Conduta × Procedimentos CBHPM | `surgical_approaches`, `procedures` |
| 05 | `05_surgical_approach_opme_items.sql` | Conduta × Itens OPME | `surgical_approaches`, `opme_items` |
| 06 | `06_surgical_approach_suppliers.sql` | Conduta × Fornecedores | `surgical_approaches`, `suppliers` |
| 07 | `07_surgical_approach_justifications.sql` | Conduta × Justificativas | `surgical_approaches`, `clinical_justifications` |
| 08 | `08_cid_surgical_approach_extra_cids.sql` | CIDs Extras Automáticos | `cid_codes`, `surgical_approaches` |

### **Script Master**

| Script | Arquivo | Descrição |
|--------|---------|-----------|
| 09 | `09_execute_all_scripts.sql` | Executa todos os scripts em ordem |

## 📊 Dados Incluídos

### **17 Condutas Cirúrgicas**
- Videoartroscopia
- Cirurgia Aberta
- Cirurgia Robótica
- Microcirurgia
- Cirurgia Endoscópica
- Artroscopia
- Cirurgia aberta
- Guiado por USG
- Latarjet
- LAC
- Artropatia
- Fratura
- Revisão
- Osteossíntese
- Placa e parafusos
- Haste intramedular
- Infiltração

### **13 Justificativas Clínicas**
- Ortopedia: 5 justificativas
- Cardiologia: 2 justificativas
- Oftalmologia: 2 justificativas
- Urologia: 2 justificativas
- Cirurgia Geral: 2 justificativas

### **Foco: CID M75.1 (Síndrome do manguito rotador)**
- 3 condutas associadas
- 22 procedimentos CBHPM
- 11 itens OPME
- 9 fornecedores
- 9 justificativas clínicas
- 3 CIDs extras automáticos

## 🚀 Como Usar

### **Opção 1: Script Master (Recomendado)**
```sql
-- Executar no PostgreSQL
\i 09_execute_all_scripts.sql
```

### **Opção 2: Scripts Individuais**
```sql
-- Executar na ordem numérica
\i 01_surgical_approaches.sql
\i 02_clinical_justifications.sql
\i 03_cid_surgical_approaches.sql
\i 04_surgical_approach_procedures.sql
\i 05_surgical_approach_opme_items.sql
\i 06_surgical_approach_suppliers.sql
\i 07_surgical_approach_justifications.sql
\i 08_cid_surgical_approach_extra_cids.sql
```

### **Opção 3: Executar via Interface**
```sql
-- Copiar e colar cada script individualmente no pgAdmin ou interface SQL
```

## 🔧 Configuração

### **Antes de Executar**
1. Certifique-se que as tabelas base existem:
   - `cid_codes`
   - `procedures`
   - `opme_items`
   - `suppliers`

2. Verifique as IDs de referência nos scripts se necessário

### **Após Executar**
1. Verifique os dados inseridos
2. Teste o sistema de auto-preenchimento
3. Confirme as associações do M75.1

## 🎯 Resultado Esperado

Após executar todos os scripts:

### **Sistema de Auto-preenchimento Funcionando**
- Seleção de **M75.1 + Conduta** → preenchimento automático de:
  - ✅ Procedimentos CBHPM
  - ✅ Itens OPME
  - ✅ Fornecedores
  - ✅ Justificativas clínicas
  - ✅ CIDs extras (S460)

### **Verificação Final**
```sql
-- Verificar todas as tabelas populadas
SELECT 'surgical_approaches' as tabela, COUNT(*) as registros FROM surgical_approaches
UNION ALL
SELECT 'cid_surgical_approaches', COUNT(*) FROM cid_surgical_approaches
UNION ALL
SELECT 'surgical_approach_procedures', COUNT(*) FROM surgical_approach_procedures;
```

## 📋 Observações

- **Ordem obrigatória**: Scripts devem ser executados na ordem numérica
- **Dependências**: Scripts 03-08 dependem dos scripts 01-02
- **IDs fixos**: Scripts usam IDs específicos baseados nos dados existentes
- **Limpeza**: Comando `DELETE` comentado em cada script para segurança
- **Verificação**: Cada script inclui consultas de verificação

## 🔄 Manutenção

Para adicionar novos dados:
1. Modifique os scripts individuais
2. Mantenha a ordem de execução
3. Atualize as IDs de referência
4. Teste o sistema após modificações

---

**Status**: ✅ Pronto para uso
**Foco**: CID M75.1 (Síndrome do manguito rotador)
**Último update**: 14/07/2025