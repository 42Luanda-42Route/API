import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import prisma from '../infrastructure/database/prismaClient'

async function connectWithRetry(client: PrismaClient, attempts = 3): Promise<void> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await client.$connect()
      await client.$queryRaw`SELECT 1`
      return
    } catch (err) {
      lastError = err
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
      }
    }
  }
  throw lastError
}

export default fp(async (fastify) => {
  try {
    await connectWithRetry(prisma)
  } catch (err) {
    fastify.log.warn('Could not connect to database on startup: ' + (err as Error).message)
  }

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async (app) => {
    try {
      await app.prisma.$disconnect()
    } catch {
      // ignore disconnect errors
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}
