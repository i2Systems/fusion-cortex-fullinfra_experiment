# Local Database Setup Guide

If you're seeing database permission errors like:
```
User `user` was denied access on the database `fusion_cortex.public`
```

## Quick Fix

Run the automated fix script:
```bash
./scripts/fix-local-db.sh
```

This script will:
1. Create the database if it doesn't exist
2. Create the user if it doesn't exist
3. Grant all necessary permissions

## Manual Setup

If the script doesn't work, follow these steps:

### 1. Connect to PostgreSQL as superuser
```bash
psql -U postgres
```

### 2. Create database and user
```sql
CREATE DATABASE fusion_cortex;
CREATE USER user WITH PASSWORD 'your_password';
```

### 3. Grant permissions
```sql
GRANT ALL PRIVILEGES ON DATABASE fusion_cortex TO user;
\c fusion_cortex
GRANT ALL ON SCHEMA public TO user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO user;
```

### 4. Update your .env file
Make sure your `.env` file has the correct `DATABASE_URL`:
```env
DATABASE_URL="postgresql://user:your_password@localhost:5432/fusion_cortex"
```

### 5. Push the schema
```bash
npx prisma db push
```

### 6. Test the connection
```bash
npx tsx scripts/test-db-connection.ts
```

## Alternative: Use Supabase for Local Development

If you prefer not to set up a local PostgreSQL instance, you can use Supabase:

1. Create a free Supabase project at https://supabase.com
2. Get your connection string from the Supabase dashboard
3. Update your `.env` file with the Supabase connection string
4. Run `npx prisma db push` to sync the schema

## Troubleshooting

**"psql: command not found"**
- Install PostgreSQL: `brew install postgresql@14` (macOS) or use your system's package manager

**"Password authentication failed"**
- Check your `.env` file has the correct password
- Try resetting the PostgreSQL user password

**"Database does not exist"**
- Run the fix script or manually create the database as shown above

**Still having issues?**
- Check PostgreSQL is running: `pg_isready` or `brew services list` (macOS)
- Check your `.env` file is in the project root
- Make sure you're using the correct database URL format

