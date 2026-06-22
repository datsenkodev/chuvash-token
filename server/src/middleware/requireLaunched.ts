import { FastifyRequest, FastifyReply } from 'fastify'
import { isProjectLaunched } from '../services/setup.service.js'

export async function requireProjectLaunched(request: FastifyRequest, reply: FastifyReply) {
  const launched = await isProjectLaunched()
  if (!launched) {
    return reply.status(503).send({
      error: 'Project not launched',
      code: 'SETUP_REQUIRED',
      message: 'Complete server wallet funding and launch in admin setup first.',
    })
  }
}
