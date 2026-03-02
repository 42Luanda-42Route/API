import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: number;
      role: "ADMIN" | "DRIVER" | "CADETE";
      username: string;
    }
    user: {
      id: number;
      role: "ADMIN" | "DRIVER" | "CADETE";
      username: string;
    }
  }
}