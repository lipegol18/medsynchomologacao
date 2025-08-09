# MedSync - PostgreSQL Database Restore Instructions

## Database Backup Information

**Created:** July 09, 2025 at 12:45 UTC  
**Backup Files:**
- `medsync_backup_20250709_124525.sql.gz` (407 KB compressed, 2.9 MB uncompressed)
- `medsync_data_only_20250709_124540.sql.gz` (Data only backup)

**Database Version:** PostgreSQL 16.5  
**Encoding:** UTF-8  

## System Requirements

- PostgreSQL 16.x (recommended) or PostgreSQL 15.x minimum
- Minimum 4GB RAM
- 10GB free disk space
- Ubuntu 20.04+ / CentOS 8+ / Windows 10+ / macOS 10.15+

## Complete Restoration Process

### 1. PostgreSQL Installation

#### Ubuntu/Debian:
```bash
# Update package list
sudo apt update

# Install PostgreSQL 16
sudo apt install postgresql-16 postgresql-client-16 postgresql-contrib-16

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL:
```bash
# Install PostgreSQL repository
sudo dnf install https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL 16
sudo dnf install postgresql16-server postgresql16-contrib

# Initialize database
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb

# Start service
sudo systemctl enable postgresql-16
sudo systemctl start postgresql-16
```

#### macOS (using Homebrew):
```bash
# Install PostgreSQL
brew install postgresql@16

# Start service
brew services start postgresql@16
```

#### Windows:
Download PostgreSQL 16 from: https://www.postgresql.org/download/windows/

### 2. Database Setup

#### Create Database User:
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database user
CREATE USER medsync WITH PASSWORD 'your_secure_password';

# Create database
CREATE DATABASE medsync_db OWNER medsync;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE medsync_db TO medsync;

# Exit psql
\q
```

#### Configure Authentication:
Edit `/etc/postgresql/16/main/pg_hba.conf` (Ubuntu) or equivalent:
```
# Add this line for local connections
local   medsync_db      medsync                                md5
host    medsync_db      medsync         127.0.0.1/32           md5
```

### 3. Restore Database

#### Option A: Complete Restore (Recommended)
```bash
# Decompress backup
gunzip medsync_backup_20250709_124525.sql.gz

# Restore complete database
psql -U medsync -d medsync_db -f medsync_backup_20250709_124525.sql

# Or using postgres superuser if needed
sudo -u postgres psql -d medsync_db -f medsync_backup_20250709_124525.sql
```

#### Option B: Data Only Restore
```bash
# First create the schema (use schema-only backup)
pg_dump --schema-only --format=plain --file=schema_only.sql

# Apply schema
psql -U medsync -d medsync_db -f schema_only.sql

# Then restore data
gunzip medsync_data_only_20250709_124540.sql.gz
psql -U medsync -d medsync_db -f medsync_data_only_20250709_124540.sql
```

### 4. Verify Restoration

```sql
-- Connect to database
psql -U medsync -d medsync_db

-- Check tables
\dt

-- Verify data counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'medical_orders', COUNT(*) FROM medical_orders
UNION ALL
SELECT 'patients', COUNT(*) FROM patients
UNION ALL
SELECT 'hospitals', COUNT(*) FROM hospitals
UNION ALL
SELECT 'cbhpm_procedures', COUNT(*) FROM cbhpm_procedures
UNION ALL
SELECT 'cid_codes', COUNT(*) FROM cid_codes
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'opme_items', COUNT(*) FROM opme_items;

-- Check for any sequence issues
SELECT schemaname, tablename, attname, seq_name 
FROM pg_tables t 
JOIN pg_attribute a ON a.attrelid = t.schemaname::regclass::oid 
JOIN pg_depend d ON d.refobjid = a.attrelid AND d.refobjsubid = a.attnum 
JOIN pg_class c ON c.oid = d.objid 
WHERE c.relkind = 'S' AND t.schemaname = 'public';
```

### 5. Environment Configuration

Create `.env` file in your application directory:
```env
# Database Configuration
DATABASE_URL=postgresql://medsync:your_secure_password@localhost:5432/medsync_db
PGHOST=localhost
PGPORT=5432
PGUSER=medsync
PGPASSWORD=your_secure_password
PGDATABASE=medsync_db

# Application Configuration
NODE_ENV=production
PORT=5000

# Security
SESSION_SECRET=your_session_secret_here

# Email Configuration (optional)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# Google Cloud Vision (optional)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

### 6. Application Setup

```bash
# Install Node.js dependencies
npm install

# Run database migrations (if needed)
npm run db:push

# Start application
npm run dev
```

### 7. Post-Restoration Checklist

- [ ] Database connection successful
- [ ] All tables created and populated
- [ ] User authentication working
- [ ] Medical orders displaying correctly
- [ ] File uploads directory created (`/uploads`)
- [ ] All relationships and foreign keys intact
- [ ] Sequences properly reset
- [ ] Application starts without errors

### 8. Troubleshooting

#### Common Issues:

**Connection refused:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check configuration
sudo -u postgres psql -c "SHOW config_file;"
```

**Permission denied:**
```bash
# Reset user permissions
sudo -u postgres psql
ALTER USER medsync WITH SUPERUSER;
```

**Sequence issues:**
```sql
-- Fix sequence values
SELECT setval(pg_get_serial_sequence('users', 'id'), MAX(id)) FROM users;
SELECT setval(pg_get_serial_sequence('medical_orders', 'id'), MAX(id)) FROM medical_orders;
-- Repeat for other tables with auto-increment IDs
```

**Missing extensions:**
```sql
-- Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 9. Security Recommendations

1. **Change default passwords** after restoration
2. **Configure firewall** to restrict database access
3. **Enable SSL** for production environments
4. **Regular backups** schedule setup
5. **Monitor database** performance and logs

### 10. Performance Optimization

```sql
-- Analyze tables for better query planning
ANALYZE;

-- Update statistics
VACUUM ANALYZE;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
```

### 11. Data Validation

Expected data counts after restoration:
- Users: ~10-20 users
- Medical Orders: ~180+ orders
- Patients: ~50+ patients
- Hospitals: ~100+ hospitals
- CBHPM Procedures: ~8,000+ procedures
- CID Codes: ~10,000+ codes
- Suppliers: ~100+ suppliers
- OPME Items: ~1,000+ items

### 12. Support Information

For technical support or issues during restoration:
- Check PostgreSQL logs: `/var/log/postgresql/`
- Application logs: Check console output
- Database integrity: Run `VACUUM FULL ANALYZE;`

## Backup Details

This backup includes:
- ✅ Complete database schema
- ✅ All user data and authentication
- ✅ Medical orders and procedures
- ✅ Patient information
- ✅ Hospital and supplier data
- ✅ CBHPM and CID code mappings
- ✅ System configuration and settings
- ✅ All relational data and foreign keys
- ✅ Indexes and constraints
- ✅ Triggers and functions

**Created by:** MedSync System  
**Version:** 1.0.0  
**Date:** July 09, 2025