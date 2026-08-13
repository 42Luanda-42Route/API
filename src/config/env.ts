import "dotenv/config"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`\n❌ FATAL: Missing required environment variable: ${name}`)
    console.error(`   Please set ${name} in your .env file or environment.\n`)
    process.exit(1)
  }
  return value
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES: process.env.JWT_EXPIRES || "1h",
  FORTYTWO_CLIENT_ID: requireEnv("FORTYTWO_CLIENT_ID"),
  FORTYTWO_CLIENT_SECRET: requireEnv("FORTYTWO_CLIENT_SECRET"),
  APP_URL: requireEnv("APP_URL"),
  CORS_ORIGINS: process.env.CORS_ORIGINS || "*",
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  SWAGGER_USER: process.env.SWAGGER_USER || "admin",
  SWAGGER_PASSWORD: process.env.SWAGGER_PASSWORD || "admin42",
} as const
