import { FastifyInstance } from "fastify"

export default async function statsRoutes(app: FastifyInstance) {
  app.get(
    "/stats/overview",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Stats"],
        summary: "Estatísticas gerais do sistema",
        description:
          "Retorna contagens agregadas de cadetes, motoristas, administradores, rotas e paragens, incluindo a repartição de cadetes com/sem paragem atribuída e motoristas com/sem rota atribuída. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Estatísticas agregadas do sistema",
            type: "object",
            properties: {
              totalCadetes: { type: "integer", example: 120 },
              totalDrivers: { type: "integer", example: 8 },
              totalAdmins: { type: "integer", example: 3 },
              totalRoutes: { type: "integer", example: 5 },
              totalStops: { type: "integer", example: 22 },
              cadetesWithStop: { type: "integer", example: 95, description: "Cadetes com paragem atribuída (usam transporte)" },
              cadetesWithoutStop: { type: "integer", example: 25, description: "Cadetes sem paragem atribuída" },
              driversWithRoute: { type: "integer", example: 6, description: "Motoristas atualmente atribuídos a uma rota" },
              driversWithoutRoute: { type: "integer", example: 2, description: "Motoristas sem rota atribuída" },
            },
          },
          401: {
            description: "Não autorizado",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      const [
        totalCadetes,
        totalDrivers,
        totalAdmins,
        totalRoutes,
        totalStops,
        cadetesWithStop,
        driversWithRoute,
      ] = await Promise.all([
        app.prisma.cadetes.count(),
        app.prisma.drivers.count(),
        app.prisma.admins.count(),
        app.prisma.route.count(),
        app.prisma.miniBusStop.count(),
        app.prisma.cadetes.count({ where: { stop_id: { not: null } } }),
        app.prisma.drivers.count({ where: { current_route_id: { not: null } } }),
      ])

      return reply.send({
        totalCadetes,
        totalDrivers,
        totalAdmins,
        totalRoutes,
        totalStops,
        cadetesWithStop,
        cadetesWithoutStop: totalCadetes - cadetesWithStop,
        driversWithRoute,
        driversWithoutRoute: totalDrivers - driversWithRoute,
      })
    },
  )

  app.get(
    "/stats/routes",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Stats"],
        summary: "Estatísticas por rota",
        description:
          "Retorna, para cada rota, a contagem de paragens, motoristas atualmente atribuídos e cadetes servidos (via as paragens da rota). Útil para gráficos de utilização por rota. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Lista de estatísticas por rota",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                routeName: { type: "string", example: "Talatona - Kilamba" },
                stopsCount: { type: "integer", example: 4 },
                driversCount: { type: "integer", example: 2 },
                cadetesCount: { type: "integer", example: 37 },
              },
            },
          },
          401: {
            description: "Não autorizado",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      const routes = await app.prisma.route.findMany({
        orderBy: { id: "asc" },
        include: {
          _count: {
            select: { stops: true, drivers: true },
          },
          stops: {
            include: {
              _count: {
                select: { cadetes: true },
              },
            },
          },
        },
      })

      const result = routes.map((route: any) => ({
        id: route.id,
        routeName: route.route_name,
        stopsCount: route._count.stops,
        driversCount: route._count.drivers,
        cadetesCount: route.stops.reduce((sum: number, stop: any) => sum + stop._count.cadetes, 0),
      }))

      return reply.send(result)
    },
  )
}
