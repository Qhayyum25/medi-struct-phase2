import { apiClient } from "./client";
import type {
  DeidentificationResponse, DocumentDetail, DocumentStatus, DocumentStatusResponse,
  DocumentSummary, DocumentUploadResponse, ExtractionResponse, FileType, Page, ProcessingResponse,
} from "../types/api";

export type ListDocumentsParams = {
  page?: number;
  page_size?: number;
  status?: DocumentStatus;
  file_type?: FileType;
}

export const documentsApi = {
  list: (params: ListDocumentsParams = {}) =>
    apiClient.get<Page<DocumentSummary>>("/api/documents", params),

  get: (id: string, includeText = false) =>
    apiClient.get<DocumentDetail>(`/api/documents/${id}`, { include_text: includeText }),

  status: (id: string) => apiClient.get<DocumentStatusResponse>(`/api/documents/${id}/status`),

  upload: (file: File, signal?: AbortSignal) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.postForm<DocumentUploadResponse>("/api/documents/upload", form, { signal });
  },

  extract: (id: string) => apiClient.post<ExtractionResponse>(`/api/documents/${id}/extract`),

  deidentify: (id: string) => apiClient.post<DeidentificationResponse>(`/api/documents/${id}/deidentify`),

  process: (id: string) => apiClient.post<ProcessingResponse>(`/api/documents/${id}/process`),

  remove: (id: string) => apiClient.delete<void>(`/api/documents/${id}`),
};
