export interface AnalysisResponse {
  tempo: number;
  swing_ratio: number;
  midi_path: string;
  pattern: boolean[][];
}

export interface ErrorResponse {
  detail: string;
}