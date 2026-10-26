import { apiClient } from "./client";
import type {
  AssociationRuleRequest, AssociationRuleResponse, ClusterRequest, ClusterResponse,
  CohortRequest, CohortResponse,
} from "../types/api";

export const analyticsApi = {
  associationRules: (payload: AssociationRuleRequest) =>
    apiClient.post<AssociationRuleResponse>("/api/analytics/association-rules", payload),
  clusters: (payload: ClusterRequest) =>
    apiClient.post<ClusterResponse>("/api/analytics/clusters", payload),
  cohorts: (payload: CohortRequest) =>
    apiClient.post<CohortResponse>("/api/analytics/cohorts", payload),
};
