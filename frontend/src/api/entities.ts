import { apiClient } from "./client";
import type { EntityRead, Page } from "../types/api";

export type ListEntitiesParams = {
  page?: number;
  page_size?: number;
  document_id?: string;
  entity_type?: string;
  entity_text?: string;
  min_confidence?: number;
}

export const entitiesApi = {
  list: (params: ListEntitiesParams = {}) => apiClient.get<Page<EntityRead>>("/api/entities", params),
  get: (id: string) => apiClient.get<EntityRead>(`/api/entities/${id}`),
  forDocument: (documentId: string, params: Omit<ListEntitiesParams, "document_id"> = {}) =>
    apiClient.get<Page<EntityRead>>(`/api/documents/${documentId}/entities`, params),
};
