export function createResourceController(service) {
  return {
    list: async (_request, response, next) => {
      try { response.json({ data: await service.list() }); } catch (error) { next(error); }
    },
    get: async (request, response, next) => {
      try { response.json({ data: await service.get(request.params.id) }); } catch (error) { next(error); }
    },
    create: async (request, response, next) => {
      try { response.status(201).json({ data: await service.create(request.body) }); } catch (error) { next(error); }
    },
    update: async (request, response, next) => {
      try { response.json({ data: await service.update(request.params.id, request.body) }); } catch (error) { next(error); }
    },
    remove: async (request, response, next) => {
      try { await service.remove(request.params.id); response.status(204).send(); } catch (error) { next(error); }
    }
  };
}
