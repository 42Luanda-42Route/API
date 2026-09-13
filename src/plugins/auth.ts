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
      return reply.code(401).send({ error: "Unauthorized", message: "Invalid or expired token" })
    }
  }

  fastify.decorate("authenticate", authenticate)

  fastify.decorate("authorizeRoles", (...allowedRoles: UserRole[]): preHandlerHookHandler => {
    return async (request, reply) => {
      await authenticate(request, reply)
      if (reply.sent) return

      if (!hasRole(request.user as AuthenticatedUser, allowedRoles)) {
        return reply.code(403).send({ error: "Forbidden", message: "Insufficient permissions" })
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
        if (!Number.isInteger(resourceId) || !isSelfOrRole(request.user as AuthenticatedUser, resourceId, ownerRole, allowedRoles)) {
          return reply.code(403).send({ error: "Forbidden", message: "Cannot act on this resource" })
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
