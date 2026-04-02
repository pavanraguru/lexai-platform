import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      tenant_id: string;
      role: string;
      email: string;
    };
    user: {
      id: string;
      tenant_id: string;
      role: string;
      email: string;
    };
  }
}
