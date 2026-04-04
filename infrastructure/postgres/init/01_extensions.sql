-- SCALD PostgreSQL initialization script
-- Runs once at container first start (postgis/postgis:16-3.4-alpine)
-- Extensions are created by Alembic migration; this script is a safety net
-- for local dev and CI environments.

-- Required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;         -- pgvector
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- fast LIKE / ILIKE on text columns

-- Schemas (Alembic also creates these, but idempotent here)
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS data;
CREATE SCHEMA IF NOT EXISTS iot;

-- Grant schema usage to the application role
-- The 'scald' user is created by POSTGRES_USER env var in docker-compose
GRANT USAGE ON SCHEMA core TO scald;
GRANT USAGE ON SCHEMA data TO scald;
GRANT USAGE ON SCHEMA iot  TO scald;

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA core TO scald;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA data TO scald;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA iot  TO scald;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA core TO scald;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA data TO scald;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA iot  TO scald;

-- Default privileges for future tables created by Alembic
ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT ALL ON TABLES    TO scald;
ALTER DEFAULT PRIVILEGES IN SCHEMA data GRANT ALL ON TABLES    TO scald;
ALTER DEFAULT PRIVILEGES IN SCHEMA iot  GRANT ALL ON TABLES    TO scald;
ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT ALL ON SEQUENCES TO scald;
ALTER DEFAULT PRIVILEGES IN SCHEMA data GRANT ALL ON SEQUENCES TO scald;
ALTER DEFAULT PRIVILEGES IN SCHEMA iot  GRANT ALL ON SEQUENCES TO scald;
