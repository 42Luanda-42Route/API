import fp from 'fastify-plugin'
import prisma from '../infrastructure/database/prismaClient'

export default fp(async (fastify) => {
  await prisma.$connect()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async (app) => {
    await app.prisma.$disconnect()
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}
