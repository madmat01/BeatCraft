export interface AnalysisResponse {
  tempo: number;
  swing_ratio: number;
  midi_path: string;
  pattern: boolean[][];
}

export interface TransientDetectionResponse {
  first_transient_time: number;
}

export interface ErrorResponse {
  detail: string;
}