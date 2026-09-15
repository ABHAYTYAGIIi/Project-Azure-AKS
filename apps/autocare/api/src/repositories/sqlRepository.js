import { getSqlPool } from "../db/sqlClient.js";

function mapRecord(record, columns) {
  if (!record) return null;
  return Object.fromEntries(columns.map(({ property, column }) => [property, record[column]]));
}

// Table and column names are supplied only from static application configuration.
// Values are always bound as SQL parameters through mssql Request.input().
export function createSqlRepository({ table, columns }) {
  const byProperty = new Map(columns.map((column) => [column.property, column]));
  const selectColumns = columns.map(({ column }) => `[${column}]`).join(", ");
  const insertedColumns = columns.map(({ column }) => `INSERTED.[${column}] AS [${column}]`).join(", ");
  const deletedColumns = columns.map(({ column }) => `DELETED.[${column}] AS [${column}]`).join(", ");

  async function execute(query, parameters = {}) {
    const pool = await getSqlPool();
    const request = pool.request();
    for (const [name, value] of Object.entries(parameters)) request.input(name, value);
    return request.query(query);
  }

  return {
    async list() {
      const result = await execute(`SELECT ${selectColumns} FROM ${table} ORDER BY [created_at] ASC;`);
      return result.recordset.map((record) => mapRecord(record, columns));
    },
    async findById(id) {
      const result = await execute(
        `SELECT ${selectColumns} FROM ${table} WHERE [id] = @id;`,
        { id }
      );
      return mapRecord(result.recordset[0], columns);
    },
    async create(values) {
      const writable = Object.entries(values).map(([property, value]) => ({ ...byProperty.get(property), value }));
      const fieldNames = writable.map(({ column }) => `[${column}]`).join(", ");
      const parameterNames = writable.map(({ property }) => `@${property}`).join(", ");
      const result = await execute(
        `INSERT INTO ${table} (${fieldNames}) OUTPUT ${insertedColumns} VALUES (${parameterNames});`,
        Object.fromEntries(writable.map(({ property, value }) => [property, value]))
      );
      return mapRecord(result.recordset[0], columns);
    },
    async update(id, values) {
      const writable = Object.entries(values).map(([property, value]) => ({ ...byProperty.get(property), value }));
      const assignments = writable.map(({ column, property }) => `[${column}] = @${property}`);
      assignments.push("[updated_at] = SYSUTCDATETIME()");
      const result = await execute(
        `UPDATE ${table} SET ${assignments.join(", ")} OUTPUT ${insertedColumns} WHERE [id] = @id;`,
        { id, ...Object.fromEntries(writable.map(({ property, value }) => [property, value])) }
      );
      return mapRecord(result.recordset[0], columns);
    },
    async remove(id) {
      const result = await execute(
        `DELETE FROM ${table} OUTPUT ${deletedColumns} WHERE [id] = @id;`,
        { id }
      );
      return mapRecord(result.recordset[0], columns);
    }
  };
}
