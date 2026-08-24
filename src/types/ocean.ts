// ── Core domain types ─────────────────────────────────────────────────────────

export type StationType = 'buoy' | 'argo' | 'satellite' | 'coastal';
export type AnomalyStatus = 'normal' | 'warning' | 'critical';
export type OceanLayer = 'model' | 'observation' | 'difference' | 'anomaly';
export type OceanParameter = 'temperature' | 'salinity' | 'waveHeight' | 'currentSpeed' | 'seaLevel';
export type DepthLevel = 0 | 10 | 50 | 100 | 500 | 1000;

export type CameraStage =
  | 'intro'
  | 'space'
  | 'earth'
  | 'indianOcean'
  | 'bayOfBengal'
  | 'exploration';

export interface Station {
  id: string;
  name: string;
  type: StationType;
  region: string;
  latitude: number;
  longitude: number;
  depth: number;
  isOnline: boolean;
  lastSyncMinutes: number;
  // Observations
  temperature: number;
  salinity: number;
  waveHeight: number;
  currentSpeed: number;
  seaLevel: number;
  // Model predictions
  modelTemperature: number;
  modelSalinity: number;
  modelWaveHeight: number;
  modelCurrentSpeed: number;
  modelSeaLevel: number;
  // Derived
  status: AnomalyStatus;
}

export interface StationComparison {
  parameter: OceanParameter;
  label: string;
  unit: string;
  modelValue: number;
  observedValue: number;
  difference: number;
  percentageDifference: number;
  confidence: number;
  status: AnomalyStatus;
}

export interface OceanInsight {
  id: string;
  stationId?: string;
  title: string;
  description: string;
  confidence: number;
  severity: AnomalyStatus;
}

export interface TimePoint {
  label: string;
  offsetHours: number; // negative = past, 0 = now, positive = forecast
}

export interface ParameterConfig {
  key: OceanParameter;
  label: string;
  shortLabel: string;
  unit: string;
  min: number;
  max: number;
  colors: [string, string, string]; // low, mid, high
}
