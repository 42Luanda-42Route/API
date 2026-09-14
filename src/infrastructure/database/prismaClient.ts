import { PrismaClient } from '@prisma/client'

export function normalizeDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw)
    const channelBinding = url.searchParams.get('channel_binding')
    if (channelBinding && !['require', 'prefer', 'disable'].includes(channelBinding)) {
      url.searchParams.delete('channel_binding')
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '15')
    }
    if (url.hostname.includes('-pooler') && !url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true')
    }
    return url.toString()
  } catch {
    return raw
  }
}

const databaseUrl = process.env.DATABASE_URL
  ? normalizeDatabaseUrl(process.env.DATABASE_URL)
  : undefined

const prisma = new PrismaClient(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
)

export default prisma
