import { randomUUID } from "node:crypto";

// Development-only repository implementation. Its public contract is designed
// to be replaced by an Azure SQL repository without changing callers.
export function createInMemoryRepository() {
  const records = new Map();

  return {
    async list() {
      return [...records.values()];
    },
    async findById(id) {
      return records.get(id) ?? null;
    },
    async create(values) {
      const timestamp = new Date().toISOString();
      const record = { id: randomUUID(), ...values, createdAt: timestamp, updatedAt: timestamp };
      records.set(record.id, record);
      return record;
    },
    async update(id, values) {
      const current = records.get(id);
      if (!current) return null;

      const record = { ...current, ...values, id, updatedAt: new Date().toISOString() };
      records.set(id, record);
      return record;
    },
    async remove(id) {
      const record = records.get(id);
      if (!record) return null;

      records.delete(id);
      return record;
    }
  };
}
