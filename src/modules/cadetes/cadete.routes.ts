import { FastifyInstance } from "fastify";
import { cadetesController } from "./cadete.controller";
import { autoDocs } from '../../utils/docs';
const docs = autoDocs('Cadetes', 'Cadetes');

export default async function cadeteRoutes(app: FastifyInstance) {
    app.get('/cadetes',                      { schema: docs.list },   cadetesController.getAll);
    app.get('/cadetes/:id',                  { schema: docs.get },    cadetesController.getById);
    app.post('/cadete',                      { schema: docs.create }, cadetesController.create);
    app.put('/cadetes/:id',                  { schema: docs.update }, cadetesController.update);
    app.delete('/cadetes/:id',               { schema: docs.delete }, cadetesController.delete);
    app.get('/cadete/route/informations/:id',                         cadetesController.getRouteById);
}