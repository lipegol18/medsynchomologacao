# MedSync - Backup do Código Fonte

## Data do Backup
**Data:** 23 de Junho de 2025  
**Versão:** Sistema 100% Relacional  
**Status:** Produção Estável

## Estrutura do Projeto

### Principais Diretórios
- `/client/` - Frontend React com TypeScript
- `/server/` - Backend Express.js com TypeScript  
- `/shared/` - Schemas e tipos compartilhados (Drizzle ORM)
- `/migrations/` - Migrações do banco de dados
- `/public/` - Arquivos estáticos
- `/uploads/` - Uploads de arquivos (não incluído no backup)

### Principais Funcionalidades Implementadas

#### ✅ Sistema de Pedidos Médicos
- Criação, edição e visualização de pedidos
- Geração de PDF com quebra automática de páginas
- Upload de documentos e imagens
- Status de aprovação e acompanhamento

#### ✅ Arquitetura 100% Relacional
- **CID-10:** Tabela `medical_order_cids` com relacionamento N:N
- **Procedimentos:** Tabela `medical_order_procedures` com controle individual
- **OPME:** Tabela `medical_order_opme_items` com quantidades
- **Fornecedores:** Tabela `medical_order_suppliers`

#### ✅ Extratores de Carteirinhas
- Bradesco (OCR + QR Code)
- Amil (Texto estruturado)
- SulAmérica (Formato compacto)
- Unimed (Múltiplos formatos)
- RG e CNH (Google Vision API)

#### ✅ Gestão Completa
- Pacientes com dados completos
- Hospitais com CNES e IBGE
- Usuários com roles e permissões
- Notificações em tempo real

## Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Vite** como bundler
- **TailwindCSS** para styling
- **Shadcn/ui** como biblioteca de componentes
- **TanStack Query** para gerenciamento de estado
- **Wouter** para roteamento
- **React Hook Form** com validação Zod

### Backend
- **Node.js** com Express.js
- **TypeScript** para tipagem
- **Drizzle ORM** com PostgreSQL
- **Multer** para upload de arquivos
- **Passport.js** para autenticação
- **Express Session** para sessões

### Banco de Dados
- **PostgreSQL** (Neon)
- **Drizzle ORM** com migrações
- Relacionamento 1:N e N:N otimizados
- Índices para performance

### APIs Externas
- **Google Cloud Vision** para OCR
- **SendGrid** para emails
- **IBGE** para municípios

## Instalação e Configuração

### Pré-requisitos
```bash
Node.js 18+
PostgreSQL (ou Neon database)
```

### Variáveis de Ambiente
```env
DATABASE_URL=postgresql://...
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
SENDGRID_API_KEY=your_sendgrid_key
SESSION_SECRET=your_session_secret
```

### Comandos de Instalação
```bash
# Instalar dependências
npm install

# Executar migrações
npm run db:push

# Iniciar desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Migração Completa Realizada

### ✅ Eliminação de Arrays PostgreSQL
- Removidos todos os campos do tipo `integer[]` e `text[]`
- Implementadas tabelas relacionais normalizadas
- Integridade referencial garantida

### ✅ APIs Relacionais Implementadas
- `/api/orders/:orderId/cids` - Gerenciar CIDs
- `/api/orders/:orderId/procedures` - Gerenciar procedimentos
- `/api/orders/:orderId/opme-items` - Gerenciar itens OPME
- `/api/orders/:orderId/suppliers` - Gerenciar fornecedores

### ✅ Frontend Conectado
- Salvamento automático em tempo real
- Sincronização entre estado local e banco
- Feedback visual para o usuário

## Performance e Otimizações

- Índices no banco de dados para consultas rápidas
- Lazy loading de componentes
- Debounce em buscas
- Cache de consultas com TanStack Query
- Compressão de arquivos estáticos

## Segurança

- Autenticação por sessão
- Validação de dados no frontend e backend
- Sanitização de inputs
- Proteção contra CSRF
- Upload de arquivos controlado

## Monitoramento

- Logs estruturados no servidor
- Notificações de sistema
- Webhooks para integração
- Backup automático do banco

## Suporte e Manutenção

- Código documentado e tipado
- Testes unitários implementados
- Estrutura modular e escalável
- Deploy automatizado via Replit

---

**Desenvolvido por:** Daniel Pozzatti  
**Sistema:** MedSync - Gestão de Pedidos Médicos  
**Arquitetura:** 100% Relacional PostgreSQL