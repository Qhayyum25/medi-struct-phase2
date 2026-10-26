// Types mirror the backend's Pydantic schemas exactly (see backend/app/schemas/*.py).
// Field names and shapes are transcribed 1:1 — nothing here is invented.

export type DocumentStatus =
  | "uploaded"
  | "extracted"
  | "deidentified"
  | "processing"
  | "completed"
  | "failed";

export type FileType = "pdf" | "docx" | "txt";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: Array<{ field?: string; message: string }> | null;
}

export interface ErrorResponse {
  success: false;
  error: ErrorDetail;
}

// ---------------------------------------------------------------- auth
export interface UserRead {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// ---------------------------------------------------------------- documents
export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  status: DocumentStatus;
}

export interface DocumentSummary {
  id: string;
  filename: string;
  file_type: FileType;
  file_size: number;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  patient_id: string | null;
  error_message: string | null;
  entity_count: number;
  relation_count: number;
  extracted_text: string | null;
  deidentified_text: string | null;
}

export interface DocumentStatusResponse {
  document_id: string;
  status: DocumentStatus;
  error_message: string | null;
  updated_at: string;
}

export interface ExtractionMetadata {
  file_type: FileType;
  character_count: number;
  word_count: number;
  page_count: number | null;
  paragraph_count: number | null;
  table_count: number | null;
  encoding: string | null;
}

export interface ExtractionResponse {
  document_id: string;
  status: DocumentStatus;
  text: string;
  metadata: ExtractionMetadata;
}

export interface DeidentificationResponse {
  document_id: string;
  status: DocumentStatus;
  original_text: string;
  deidentified_text: string;
  identifiers_detected: number;
  identifiers_by_type: Record<string, number>;
}

export interface EntityRead {
  id: string;
  document_id: string;
  entity_text: string;
  entity_type: string;
  start_position: number;
  end_position: number;
  confidence: number;
  model_name: string | null;
}

export interface RelationRead {
  id: string;
  document_id: string;
  relation_type: string;
  confidence: number;
  subject_entity: EntityRead;
  object_entity: EntityRead;
}

export interface ProcessingStatistics {
  entity_count: number;
  relation_count: number;
  entities_by_type: Record<string, number>;
  relations_by_type: Record<string, number>;
  duration_ms: number;
  ner_model: string;
  relation_model: string;
}

export interface ProcessingResponse {
  document_id: string;
  status: DocumentStatus;
  entities: EntityRead[];
  relations: RelationRead[];
  statistics: ProcessingStatistics;
}

// ---------------------------------------------------------------- patients
export interface PatientSummary {
  id: string;
  anonymized_identifier: string;
  created_at: string;
  document_count: number;
  observation_count: number;
}

export interface PatientDetail extends PatientSummary {
  document_ids: string[];
}

// ---------------------------------------------------------------- search
export interface SearchResponse {
  entities: Page<EntityRead>;
  relations: Page<RelationRead>;
  documents: Page<DocumentSummary>;
}

// ---------------------------------------------------------------- analytics
export interface AssociationRuleRequest {
  item_level?: "entity_type" | "entity_text";
  entity_types?: string[] | null;
  min_support?: number;
  min_confidence?: number;
  min_lift?: number;
  max_len?: number | null;
}

export interface AssociationRule {
  antecedents: string[];
  consequents: string[];
  support: number;
  confidence: number;
  lift: number;
}

export interface AssociationRuleResponse {
  rules: AssociationRule[];
  transactions_considered: number;
}

export interface ClusterRequest {
  k: number;
  observation_types?: string[] | null;
}

export interface ClusterAssignment {
  patient_id: string;
  anonymized_identifier: string;
  cluster: number;
}

export interface ClusterSummary {
  cluster: number;
  size: number;
  mean_values: Record<string, number>;
}

export interface ClusterResponse {
  k: number;
  observation_types: string[];
  inertia: number;
  assignments: ClusterAssignment[];
  clusters: ClusterSummary[];
}

export interface EntityFilter {
  entity_type: string;
  entity_text?: string | null;
}

export interface ObservationFilter {
  observation_type: string;
  min_value?: number | null;
  max_value?: number | null;
}

export interface CohortRequest {
  entity_filters: EntityFilter[];
  observation_filters: ObservationFilter[];
  page?: number;
  page_size?: number;
}

export interface CohortDocumentRef {
  document_id: string;
  filename: string;
}

export interface CohortPatient {
  patient_id: string;
  anonymized_identifier: string;
  documents: CohortDocumentRef[];
}

export interface CohortResponse {
  items: CohortPatient[];
  total: number;
  page: number;
  page_size: number;
}
