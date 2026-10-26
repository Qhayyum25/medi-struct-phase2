/** Central query-key registry so cache invalidation stays consistent across pages. */
export const qk = {
  documents: (params?: unknown) => ["documents", params] as const,
  document: (id: string) => ["document", id] as const,
  documentEntities: (id: string, params?: unknown) => ["document", id, "entities", params] as const,
  documentRelations: (id: string, params?: unknown) => ["document", id, "relations", params] as const,
  entities: (params?: unknown) => ["entities", params] as const,
  relations: (params?: unknown) => ["relations", params] as const,
  patients: (params?: unknown) => ["patients", params] as const,
  patient: (id: string) => ["patient", id] as const,
  search: (params?: unknown) => ["search", params] as const,
  associationRules: (payload: unknown) => ["analytics", "association-rules", payload] as const,
  clusters: (payload: unknown) => ["analytics", "clusters", payload] as const,
  cohorts: (payload: unknown) => ["analytics", "cohorts", payload] as const,
};
