# Instruções para Banco de Dados MedSync

## Arquivos Disponíveis para Download

1. **database_structure_complete.sql** - Estrutura completa em inglês
2. **criar_estrutura_banco_dados.sql** - Script de criação em português

## Como Usar os Arquivos

### 1. Instalação PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql postgresql-server

# macOS (com Homebrew)
brew install postgresql
```

### 2. Criar Banco de Dados
```bash
# Conectar como usuário postgres
sudo -u postgres psql

# Criar banco de dados
CREATE DATABASE medsync;
CREATE USER medsync_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE medsync TO medsync_user;
\q
```

### 3. Executar Script de Criação
```bash
# Executar o script de estrutura
psql -h localhost -U medsync_user -d medsync -f criar_estrutura_banco_dados.sql

# Ou se preferir em inglês
psql -h localhost -U medsync_user -d medsync -f database_structure_complete.sql
```

### 4. Configurar Aplicação
No arquivo `.env` da aplicação:
```
DATABASE_URL=postgresql://medsync_user:sua_senha_segura@localhost:5432/medsync
```

## Comandos Úteis de Administração

### Verificar Estrutura
```sql
-- Listar todas as tabelas
\dt

-- Verificar estrutura de uma tabela
\d medical_orders

-- Contar registros em tabelas principais
SELECT 'users' as tabela, COUNT(*) FROM users
UNION ALL
SELECT 'patients', COUNT(*) FROM patients
UNION ALL
SELECT 'medical_orders', COUNT(*) FROM medical_orders;
```

### Backup e Restore
```bash
# Fazer backup completo
pg_dump -h localhost -U medsync_user -d medsync > backup_medsync.sql

# Fazer backup apenas da estrutura
pg_dump -h localhost -U medsync_user -d medsync --schema-only > estrutura_medsync.sql

# Restaurar backup
psql -h localhost -U medsync_user -d medsync < backup_medsync.sql
```

### Monitoramento
```sql
-- Verificar conexões ativas
SELECT datname, usename, state, query_start 
FROM pg_stat_activity 
WHERE datname = 'medsync';

-- Verificar tamanho das tabelas
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

## Dados de Teste

### Usuário Administrador Padrão
- **Usuário:** admin
- **Senha:** admin123
- **Email:** admin@medsync.com

### Importar Dados de Referência
Os dados de CID-10, CBHPM e outros estão nos arquivos CSV em `attached_assets/`. Para importar:

```sql
-- Exemplo para CID-10
COPY cid_codes(code, description, category) 
FROM '/caminho/para/CID-10_toImport.csv' 
DELIMITER ',' CSV HEADER;

-- Exemplo para procedimentos CBHPM
COPY procedures(code, name, description, porte, custo_operacional) 
FROM '/caminho/para/CBHPM_ORTO_to_Import.csv' 
DELIMITER ',' CSV HEADER;
```

## Configuração para Produção

### Segurança
1. Alterar senha do usuário admin
2. Configurar SSL/TLS no PostgreSQL
3. Configurar firewall para permitir apenas IPs autorizados
4. Configurar backup automático

### Performance
```sql
-- Configurações recomendadas para PostgreSQL
-- No arquivo postgresql.conf:

shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
```

### Manutenção Regular
```sql
-- Executar semanalmente
VACUUM ANALYZE;

-- Reindexar mensalmente
REINDEX DATABASE medsync;

-- Atualizar estatísticas
ANALYZE;
```

## Troubleshooting

### Problemas Comuns

1. **Erro de conexão:**
   - Verificar se PostgreSQL está rodando
   - Verificar configurações de firewall
   - Verificar string de conexão

2. **Erro de permissão:**
   - Verificar se usuário tem permissões na base
   - Verificar configuração no pg_hba.conf

3. **Performance lenta:**
   - Verificar índices nas consultas
   - Executar VACUUM e ANALYZE
   - Verificar configurações de memória

### Logs Importantes
```bash
# Localização dos logs (varia por sistema)
# Ubuntu/Debian
/var/log/postgresql/

# CentOS/RHEL
/var/lib/pgsql/data/log/

# Verificar configuração atual
SHOW log_directory;
SHOW log_filename;
```

## Suporte

Para problemas específicos do MedSync:
1. Verificar logs da aplicação
2. Verificar logs do PostgreSQL
3. Validar estrutura do banco com os scripts fornecidos
4. Verificar variáveis de ambiente da aplicação

## Versões Testadas

- PostgreSQL: 14.x, 15.x, 16.x
- Node.js: 18.x, 20.x
- Sistema: Ubuntu 20.04+, CentOS 8+, macOS 12+