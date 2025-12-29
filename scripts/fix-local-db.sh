#!/bin/bash
# Fix Local Database Permissions
# This script helps set up PostgreSQL for local development

echo "🔧 Fixing local database permissions..."
echo ""

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found. Please install PostgreSQL."
    exit 1
fi

# Get database connection details from .env
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')
if [ -z "$DB_URL" ]; then
    echo "❌ DATABASE_URL not found in .env"
    exit 1
fi

# Parse connection string
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Database details:"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo ""

# Try to connect as postgres superuser to fix permissions
echo "Attempting to fix permissions..."
echo "You may be prompted for the PostgreSQL superuser password (usually 'postgres' or empty)"
echo ""

# Create database if it doesn't exist
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U postgres -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database may already exist"

# Grant permissions
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U postgres -d postgres <<EOF
-- Create user if it doesn't exist
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
  END IF;
END
\$\$;

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to the database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database permissions fixed!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npx prisma db push"
    echo "  2. Run: npx tsx scripts/test-db-connection.ts"
else
    echo ""
    echo "⚠️  Could not automatically fix permissions."
    echo ""
    echo "Manual steps:"
    echo "  1. Connect to PostgreSQL as superuser:"
    echo "     psql -U postgres"
    echo ""
    echo "  2. Run these commands:"
    echo "     CREATE DATABASE $DB_NAME;"
    echo "     CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
    echo "     GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    echo "     \\c $DB_NAME"
    echo "     GRANT ALL ON SCHEMA public TO $DB_USER;"
    echo ""
    echo "  3. Then run: npx prisma db push"
fi

