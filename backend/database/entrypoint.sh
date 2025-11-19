#!/bin/bash
# Wait for SQL Server to start
echo "Starting SQL Server..."
/opt/mssql/bin/sqlservr &

# Wait until SQL Server is ready
sleep 15s

# Function to run SQL in bash
run_sql() {
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P $SA_PASSWORD -C -No -i "$1"
}

if [ "$RESET_DB" = "true" ] ; then
  echo "RESET_DB = true detected. Resetting the database"
  # Dropping existing Database
  /opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P $SA_PASSWORD -C -No -Q \
        "IF DB_ID('BookXchange') IS NOT NULL BEGIN DROP DATABASE BookXchange; END"

  echo "Running initialization script..."
  # Run DDL file
  run_sql /database/BookXchangeSQL.sql
fi

if [ "$TEST_POPULATE" = "true" ] ; then
  echo "TEST_POPULATE = true detected. Populating the database..."

  # Run test population
  run_sql /database/population.sql
fi
# Keep the container running
wait