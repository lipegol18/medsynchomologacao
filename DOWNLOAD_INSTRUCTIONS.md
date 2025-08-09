# 📦 MedSync - Backup do Código Fonte

## ✅ Backup Criado com Sucesso

**Arquivo:** `medsync-source-backup-YYYYMMDD_HHMMSS.tar.gz`  
**Localização:** Diretório raiz do projeto  
**Status:** Sistema 100% Relacional - Produção Estável

## 📋 Conteúdo do Backup

### Código Fonte Principal
- `client/` - Frontend React com TypeScript
- `server/` - Backend Express.js com TypeScript  
- `shared/` - Schemas Drizzle e tipos compartilhados
- `migrations/` - Migrações do banco PostgreSQL
- `public/` - Arquivos estáticos

### Arquivos de Configuração
- `package.json` e `package-lock.json`
- `drizzle.config.ts` - Configuração do ORM
- `tailwind.config.ts` - Estilos CSS
- `vite.config.ts` - Build e desenvolvimento
- `components.json` - Componentes Shadcn/ui
- `.replit` - Configuração do ambiente

### Documentação
- Todos os arquivos `.md` de documentação
- Scripts SQL de migração
- Arquivos de debug e testes

## 🚀 Como Usar o Backup

### 1. Download
```bash
# O arquivo está disponível no diretório raiz
# Use a interface do Replit para fazer download
```

### 2. Extração
```bash
tar -xzf medsync-source-backup-YYYYMMDD_HHMMSS.tar.gz
cd medsync-source-backup/
```

### 3. Instalação
```bash
npm install
```

### 4. Configuração
```bash
# Criar arquivo .env
cp .env.example .env

# Configurar variáveis:
DATABASE_URL=postgresql://...
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
SENDGRID_API_KEY=your_key
```

### 5. Banco de Dados
```bash
# Executar migrações
npm run db:push

# Ou importar backup SQL se disponível
psql $DATABASE_URL < backup_completo.sql
```

### 6. Execução
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 🔧 Arquitetura Implementada

### Backend (Node.js + Express)
- Autenticação com sessões
- APIs RESTful organizadas
- Upload de arquivos Multer
- Drizzle ORM com PostgreSQL

### Frontend (React + TypeScript)
- Componentes reutilizáveis Shadcn/ui
- TanStack Query para estado
- React Hook Form + Zod
- Routing com Wouter

### Banco de Dados (PostgreSQL)
- Estrutura 100% relacional
- Relacionamentos N:N otimizados
- Índices para performance
- Migrações versionadas

## 🎯 Funcionalidades Principais

### ✅ Gestão de Pedidos Médicos
- Criação end-to-end de pedidos
- Geração de PDF profissional
- Sistema de aprovações
- Tracking de status

### ✅ Extratores de Carteirinhas
- OCR com Google Vision
- Múltiplas operadoras de saúde
- Detecção automática de planos
- Validação de dados extraídos

### ✅ Sistema Relacional Completo
- CIDs, Procedimentos, OPME
- Fornecedores e Hospitais
- Pacientes e Usuários
- Relacionamentos normalizados

## 📊 Estatísticas do Backup

**Total de Arquivos:** Verificar com `tar -tzf arquivo.tar.gz | wc -l`  
**Principais Tecnologias:** React, Express, PostgreSQL, TypeScript  
**Tamanho Otimizado:** Excluídos node_modules e uploads  

## 🔐 Segurança

- Senhas e tokens não incluídos
- Configurações sensíveis em .env
- Validação robusta de dados
- Sanitização de inputs

## 📞 Suporte

- Código totalmente documentado
- Tipos TypeScript completos
- Estrutura modular escalável
- Padrões de desenvolvimento consistentes

---

**Desenvolvido:** Sistema MedSync  
**Data:** 23/06/2025  
**Versão:** Arquitetura 100% Relacional  
**Desenvolvedor:** Daniel Pozzatti