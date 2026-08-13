import { FastifyInstance } from "fastify"

export default async function healthRoutes(app: FastifyInstance) {
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Verificar saúde do sistema",
        description: "Verifica a integridade da API e a conectividade com o banco de dados PostgreSQL.",
        response: {
          200: {
            description: "Sistema operacional e banco de dados conectado",
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              database: { type: "string", example: "connected" },
              timestamp: { type: "string", example: "2026-08-13T22:00:00.000Z" },
            },
          },
          503: {
            description: "Serviço indisponível ou falha na conexão com o banco de dados",
            type: "object",
            properties: {
              status: { type: "string", example: "error" },
              database: { type: "string", example: "disconnected" },
              timestamp: { type: "string", example: "2026-08-13T22:00:00.000Z" },
              error: { type: "string", example: "Database connection failed" },
            },
          },
        },
      },
    },
    async (req, reply) => {
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
    },
  )
}
