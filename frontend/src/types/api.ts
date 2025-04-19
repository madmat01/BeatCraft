export interface AnalysisResponse {
  tempo: number;
  swing_ratio: number;
  midi_path: string;
}

export interface ErrorResponse {
  detail: string;
} 