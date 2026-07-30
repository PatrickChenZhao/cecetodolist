import { DATA_VERSION } from "@/lib/constants";

export function migrateStoredData(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const record = input as Record<string, unknown>;
  if (record.version === DATA_VERSION) return input;

  if (!record.version && Array.isArray(record.items)) {
    return { ...record, version: DATA_VERSION };
  }

  return input;
}
