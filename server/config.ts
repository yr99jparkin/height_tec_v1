import dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';

interface DatabaseConfig {
  url: string;
}

interface Config {
  database: DatabaseConfig;
  environment: string;
}

// Read database URLs from environment variables
const getDatabaseConfig = (): DatabaseConfig => {
  // For deployment/production, use the DATABASE_URL directly
  if (!isDevelopment) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be set for production environment');
    }
    return {
      url: process.env.DATABASE_URL,
    };
  }

  // For development, also use DATABASE_URL (could be changed to DEV_DATABASE_URL if needed)
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for development environment');
  }
  return {
    url: process.env.DATABASE_URL,
  };
};

export const config: Config = {
  database: getDatabaseConfig(),
  environment: isDevelopment ? 'development' : 'production',
};