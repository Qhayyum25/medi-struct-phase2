import { apiClient } from "./client";
import type { Page, RelationRead } from "../types/api";

export type ListRelationsParams = {
  page?: number;
  page_size?: number;
  document_id?: string;
  relation_type?: string;
  subject_type?: string;
  object_type?: string;
  min_confidence?: number;
}

export const relationsApi = {
  list: (params: ListRelationsParams = {}) => apiClient.get<Page<RelationRead>>("/api/relations", params),
  forDocument: (documentId: string, params: Omit<ListRelationsParams, "document_id"> = {}) =>
    apiClient.get<Page<RelationRead>>(`/api/documents/${documentId}/relations`, params),
};
