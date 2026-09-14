import { FastifyPluginAsync, FastifyRequest, FastifyReply, preHandlerHookHandler } from "fastify"
import fp from "fastify-plugin"

export type UserRole = "ADMIN" | "DRIVER" | "CADETE"

interface AuthenticatedUser {
  id?: number
  role?: string
}

export function hasRole(user: AuthenticatedUser | undefined, allowedRoles: UserRole[]): boolean {
  return Boolean(user?.role && allowedRoles.includes(user.role.toUpperCase() as UserRole))
}

export function isSelfOrRole(
  user: AuthenticatedUser | undefined,
  resourceId: number,
  ownerRole: UserRole,
  allowedRoles: UserRole[] = ["ADMIN"],
): boolean {
  if (hasRole(user, allowedRoles)) return true
  return hasRole(user, [ownerRole]) && Number(user?.id) === resourceId
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({
        error: "Token em falta, inválido ou expirado. Inicie sessão novamente.",
        code: "UNAUTHORIZED",
        hint: "Envie Authorization: Bearer <jwt> obtido em /api/auth/42/login, /api/auth/42/driver/login ou /api/auth/42/admin/login.",
      })
    }
  }

  fastify.decorate("authenticate", authenticate)

  fastify.decorate("authorizeRoles", (...allowedRoles: UserRole[]): preHandlerHookHandler => {
    return async (request, reply) => {
      await authenticate(request, reply)
      if (reply.sent) return

      const user = request.user as AuthenticatedUser
      if (!hasRole(user, allowedRoles)) {
        const current = user?.role?.toUpperCase() || "sem perfil"
        return reply.code(403).send({
          error: `Acesso recusado: o perfil ${current} não pode executar esta operação. É necessário um dos perfis: ${allowedRoles.join(", ")}.`,
          code: "FORBIDDEN_ROLE",
          hint: "Use uma conta com o perfil indicado ou um endpoint permitido para o seu perfil.",
        })
      }
    }
  })

  fastify.decorate(
    "authorizeSelfOrRoles",
    (ownerRole: UserRole, allowedRoles: UserRole[] = ["ADMIN"], paramName = "id"): preHandlerHookHandler => {
      return async (request, reply) => {
        await authenticate(request, reply)
        if (reply.sent) return

        const params = request.params as Record<string, unknown>
        const resourceId = Number(params?.[paramName])
        const user = request.user as AuthenticatedUser
        if (!Number.isInteger(resourceId) || !isSelfOrRole(user, resourceId, ownerRole, allowedRoles)) {
          return reply.code(403).send({
            error: `Só pode alterar o próprio registo (id ${user?.id ?? "desconhecido"}). Pediu o id ${resourceId}. Administradores podem atuar em qualquer id.`,
            code: "FORBIDDEN_RESOURCE",
            hint: `Use PUT/PATCH /.../${user?.id} ou autentique-se como ADMIN.`,
          })
        }
      }
    },
  )
})

export default authPlugin

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorizeRoles: (...allowedRoles: UserRole[]) => preHandlerHookHandler
    authorizeSelfOrRoles: (ownerRole: UserRole, allowedRoles?: UserRole[], paramName?: string) => preHandlerHookHandler
  }
}
