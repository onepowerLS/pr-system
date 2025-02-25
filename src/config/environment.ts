interface EnvironmentConfig {
  baseUrl: string;
  env: 'development' | 'staging' | 'production';
}

const configs: Record<string, EnvironmentConfig> = {
  development: {
    baseUrl: 'http://localhost:5173',
    env: 'development'
  },
  staging: {
    baseUrl: 'https://staging.1pwr.com',
    env: 'staging'
  },
  production: {
    baseUrl: 'https://app.1pwr.com',
    env: 'production'
  }
};

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = import.meta.env.VITE_APP_ENV || 'development';
  return configs[env];
}
