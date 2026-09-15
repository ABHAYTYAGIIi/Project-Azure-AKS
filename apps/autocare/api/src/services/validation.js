import { HttpError } from "./errors.js";

export function requireObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
}

export function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${field} is required and must be a non-empty string.`);
  }
  return value.trim();
}

export function optionalString(value, field) {
  if (value === undefined) return undefined;
  return requiredString(value, field);
}

export function requiredInteger(value, field, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new HttpError(400, `${field} must be an integer of at least ${minimum}.`);
  }
  return value;
}

export function optionalInteger(value, field, minimum = 0) {
  if (value === undefined) return undefined;
  return requiredInteger(value, field, minimum);
}

export function requiredNumber(value, field, minimum = 0) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new HttpError(400, `${field} must be a number of at least ${minimum}.`);
  }
  return value;
}

export function optionalNumber(value, field, minimum = 0) {
  if (value === undefined) return undefined;
  return requiredNumber(value, field, minimum);
}

export function requiredEmail(value) {
  const email = requiredString(value, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, "email must be a valid email address.");
  }
  return email;
}

export function optionalEmail(value) {
  if (value === undefined) return undefined;
  return requiredEmail(value);
}

export function requiredIsoDate(value, field) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, `${field} must be a valid ISO date-time string.`);
  }
  return new Date(value).toISOString();
}

export function optionalIsoDate(value, field) {
  if (value === undefined) return undefined;
  return requiredIsoDate(value, field);
}

export function optionalEnum(value, field, permitted) {
  if (value === undefined) return undefined;
  if (!permitted.includes(value)) {
    throw new HttpError(400, `${field} must be one of: ${permitted.join(", ")}.`);
  }
  return value;
}

export function definedValues(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
