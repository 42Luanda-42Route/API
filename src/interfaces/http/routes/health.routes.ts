import { FastifyInstance } from "fastify"

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (req, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`
      return reply.send({
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      return reply.status(503).send({
        status: "error",
        database: "disconnected",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Database connection failed",
      })
    }
  })
}
