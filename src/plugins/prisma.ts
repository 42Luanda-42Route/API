import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import prisma from '../infrastructure/database/prismaClient'

export default fp(async (fastify) => {
  try {
    await prisma.$connect()
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
