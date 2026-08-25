from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class AnomalyStatus(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    HIGH = "high"


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "ocean-sentry-api"


class OceanStatusResponse(BaseModel):
    data_sources: list[str] = []
    last_updated: Optional[datetime] = None
    status: str = "prototype"


class OceanObservation(BaseModel):
    id: str
    source: str
    timestamp: datetime
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=360)
    depth: float = Field(ge=0)
    temperature: Optional[float] = None
    salinity: Optional[float] = None
    wave_height: Optional[float] = None
    current_u: Optional[float] = None
    current_v: Optional[float] = None
    quality_flag: Optional[int] = None


class OceanModelState(BaseModel):
    source: str
    timestamp: datetime
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=360)
    depth: float = Field(ge=0)
    temperature: Optional[float] = None
    salinity: Optional[float] = None
    current_u: Optional[float] = None
    current_v: Optional[float] = None
    wave_height: Optional[float] = None
    sea_level: Optional[float] = None


class CollocationRecord(BaseModel):
    timestamp: datetime
    latitude: float
    longitude: float
    depth: float

    model_temperature: Optional[float] = None
    observed_temperature: Optional[float] = None
    temperature_difference: Optional[float] = None

    model_salinity: Optional[float] = None
    observed_salinity: Optional[float] = None
    salinity_difference: Optional[float] = None

    model_current_u: Optional[float] = None
    model_current_v: Optional[float] = None
    observed_current_u: Optional[float] = None
    observed_current_v: Optional[float] = None

    observation_quality: Optional[int] = None


class AnomalyResult(BaseModel):
    station_id: Optional[str] = None
    latitude: float
    longitude: float
    depth: float
    timestamp: datetime
    parameter: str
    model_value: Optional[float] = None
    observed_value: Optional[float] = None
    difference: Optional[float] = None
    anomaly_score: float = Field(ge=0, le=1)
    status: AnomalyStatus
    confidence: float = Field(ge=0, le=1)


class ComparisonResponse(BaseModel):
    latitude: float
    longitude: float
    depth: float
    timestamp: datetime
    parameter: str
    model_value: Optional[float] = None
    observed_value: Optional[float] = None
    difference: Optional[float] = None
    percentage_difference: Optional[float] = None


class StationResponse(BaseModel):
    id: str
    name: str
    type: str
    latitude: float
    longitude: float
    depth: float
    last_update: Optional[datetime] = None
    status: AnomalyStatus = AnomalyStatus.NORMAL
    is_online: bool = True


class PredictionRequest(BaseModel):
    features: dict


class PredictionResponse(BaseModel):
    anomaly_score: float
    status: AnomalyStatus
    confidence: float = Field(ge=0, le=1, default=0.5)


class DataIngestionReport(BaseModel):
    source: str
    records_received: int
    records_valid: int
    records_removed: int
    records_missing: int
    variables_found: list[str]
    time_range: Optional[tuple[str, str]] = None
    lat_range: Optional[tuple[float, float]] = None
    lon_range: Optional[tuple[float, float]] = None
    depth_range: Optional[tuple[float, float]] = None
