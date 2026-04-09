import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  /**
   * Decorates fastify instance with an `authenticate` hook that can be
   * used as preHandler on any protected route.
   *
   * Usage:
   *   route.get('/protected', { preHandler: [fastify.authenticate] }, handler)
   */

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });
});

export default authPlugin;

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
