import { apiClient } from "./client";
import type { Page, PatientDetail, PatientSummary } from "../types/api";

export const patientsApi = {
  list: (params: { page?: number; page_size?: number } = {}) =>
    apiClient.get<Page<PatientSummary>>("/api/patients", params),
  get: (id: string) => apiClient.get<PatientDetail>(`/api/patients/${id}`),
};
