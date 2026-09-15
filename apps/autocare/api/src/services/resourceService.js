import { HttpError } from "./errors.js";
import { requireObject } from "./validation.js";

export function createResourceService({ repository, createValues, updateValues }) {
  return {
    async list() {
      return repository.list();
    },
    async get(id) {
      const record = await repository.findById(id);
      if (!record) throw new HttpError(404, "Resource not found.");
      return record;
    },
    async create(input) {
      requireObject(input);
      return repository.create(await createValues(input));
    },
    async update(id, input) {
      requireObject(input);
      const current = await this.get(id);
      return repository.update(id, await updateValues(input, current));
    },
    async remove(id) {
      const record = await repository.remove(id);
      if (!record) throw new HttpError(404, "Resource not found.");
    }
  };
}
