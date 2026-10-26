import { apiClient } from "./client";
import type { SearchResponse } from "../types/api";

export type SearchParams = {
  page?: number;
  page_size?: number;
  q?: string;
  entity_type?: string;
  entity_text?: string;
  relation_type?: string;
  document_id?: string;
  min_confidence?: number;
}

export const searchApi = {
  search: (params: SearchParams) => apiClient.get<SearchResponse>("/api/search", params),
};
