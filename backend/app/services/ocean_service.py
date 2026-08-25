import logging
from typing import Optional
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np

from app.models.schemas import StationResponse, AnomalyStatus
from app.config import settings

logger = logging.getLogger(__name__)


class OceanService:
    """Service for ocean observation and model data access.

    Reads from processed parquet files produced by the data pipeline.
    """

    def __init__(self):
        self._collocated: Optional[pd.DataFrame] = None
        self._stations_cache: Optional[list[StationResponse]] = None
        self._model_source: str = "unknown"
        self._load_data()

    def _load_data(self):
        collocated_qc_path = settings.data_dir / "processed" / "collocated_qc.parquet"
        collocated_path = settings.data_dir / "processed" / "collocated.parquet"

        if collocated_qc_path.exists():
            data_path = collocated_qc_path
            logger.info("Using QC-filtered collocated data.")
        else:
            data_path = collocated_path
            logger.info("QC-filtered data not available; using unfiltered.")

        if data_path.exists():
            try:
                self._collocated = pd.read_parquet(data_path)
                self._collocated["timestamp"] = pd.to_datetime(
                    self._collocated["timestamp"]
                )
                logger.info(
                    f"Loaded collocated data: {self._collocated.shape[0]} records"
                )
                self._build_stations()
            except Exception as e:
                logger.warning(f"Failed to load collocated data: {e}")
        else:
            logger.info(
                f"No collocated data found. Run the pipeline first."
            )

        # Detect model source
        import json
        source_path = settings.data_dir / "processed" / "model_source.json"
        if source_path.exists():
            try:
                with open(source_path) as f:
                    meta = json.load(f)
                self._model_source = meta.get("source", "unknown")
            except Exception:
                pass

    def _build_stations(self):
        """Build station-like entries from Argo profile locations."""
        if self._collocated is None or self._collocated.empty:
            return

        df = self._collocated

        profiles = (
            df.groupby(["latitude", "longitude"])
            .agg(
                count=("observation_id", "count"),
                min_depth=("depth", "min"),
                max_depth=("depth", "max"),
                avg_temp_obs=("observed_temperature", "mean"),
                avg_temp_model=("model_temperature", "mean"),
                avg_sal_obs=("observed_salinity", "mean"),
                avg_sal_model=("model_salinity", "mean"),
                avg_temp_diff=("abs_temperature_difference", "mean"),
                last_time=("timestamp", "max"),
                source=("observation_source", "first"),
            )
            .reset_index()
        )

        stations = []
        for i, row in profiles.iterrows():
            station_id = f"ARGO-{i + 1:03d}"

            # Fallback threshold-based status (used only if ML unavailable)
            avg_diff = row["avg_temp_diff"]
            if avg_diff >= 2.5:
                status = AnomalyStatus.HIGH
            elif avg_diff >= 1.5:
                status = AnomalyStatus.WARNING
            else:
                status = AnomalyStatus.NORMAL

            stations.append(
                StationResponse(
                    id=station_id,
                    name=station_id,
                    type="argo",
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    depth=round(row["min_depth"], 1),
                    last_update=row["last_time"],
                    status=status,
                    is_online=True,
                )
            )

        self._stations_cache = stations
        logger.info(f"Built {len(stations)} station entries from profiles")

    def apply_ml_status(self, anomaly_service):
        """Override station statuses with ML-derived results."""
        if self._stations_cache is None or not anomaly_service.is_available:
            return

        updated = 0
        for station in self._stations_cache:
            info = anomaly_service.get_station_anomaly_info(
                station.latitude, station.longitude
            )
            if info:
                station.status = info["status"]
                updated += 1

        logger.info(f"Applied ML anomaly status to {updated}/{len(self._stations_cache)} stations")

    def get_stations(self, region: Optional[str] = None) -> list[StationResponse]:
        if self._stations_cache is None:
            return []
        return self._stations_cache

    def get_station(self, station_id: str) -> Optional[StationResponse]:
        if self._stations_cache is None:
            return None
        for s in self._stations_cache:
            if s.id == station_id:
                return s
        return None

    def get_station_detail(self, station_id: str) -> Optional[dict]:
        """Get full station data including obs/model values for the frontend."""
        if self._collocated is None or self._stations_cache is None:
            return None

        station = self.get_station(station_id)
        if station is None:
            return None

        df = self._collocated
        profile = df[
            (df["latitude"] == station.latitude)
            & (df["longitude"] == station.longitude)
        ]

        if profile.empty:
            return None

        surface = profile[profile["depth"] <= 10]
        if surface.empty:
            surface = profile.nsmallest(1, "depth")

        row = surface.iloc[0]

        temp_obs = float(row["observed_temperature"]) if pd.notna(row["observed_temperature"]) else 0.0
        temp_model = float(row["model_temperature"]) if pd.notna(row["model_temperature"]) else 0.0
        sal_obs = float(row["observed_salinity"]) if pd.notna(row["observed_salinity"]) else 0.0
        sal_model = float(row["model_salinity"]) if pd.notna(row["model_salinity"]) else 0.0
        current_u = float(row["model_current_u"]) if pd.notna(row.get("model_current_u")) else 0.0
        current_v = float(row["model_current_v"]) if pd.notna(row.get("model_current_v")) else 0.0
        sea_level = float(row["model_sea_level"]) if pd.notna(row.get("model_sea_level")) else 0.0
        current_speed = (current_u**2 + current_v**2) ** 0.5

        temp_diff = abs(temp_obs - temp_model)

        # Use ML status if available, otherwise fallback to threshold
        from app.services.anomaly_service import anomaly_service
        ml_info = anomaly_service.get_station_anomaly_info(station.latitude, station.longitude)
        if ml_info:
            ml_status = ml_info["status"]
            if hasattr(ml_status, "value"):
                status = "critical" if ml_status.value == "high" else ml_status.value
            else:
                status = "critical" if str(ml_status) == "high" else str(ml_status)
        else:
            max_pct = 0.0
            if temp_model != 0:
                max_pct = abs((temp_obs - temp_model) / temp_model) * 100
            if max_pct >= 8 or temp_diff >= 2.5:
                status = "critical"
            elif max_pct >= 3 or temp_diff >= 1.5:
                status = "warning"
            else:
                status = "normal"

        last_time = profile["timestamp"].max()
        minutes_ago = max(0, int((pd.Timestamp.now() - last_time).total_seconds() / 60))

        result = {
            "id": station.id,
            "name": station.name,
            "type": station.type,
            "region": "Bay of Bengal",
            "latitude": station.latitude,
            "longitude": station.longitude,
            "depth": station.depth,
            "isOnline": True,
            "lastSyncMinutes": minutes_ago,
            "temperature": round(temp_obs, 2),
            "salinity": round(sal_obs, 2),
            "waveHeight": 0.0,
            "currentSpeed": round(current_speed, 3),
            "seaLevel": round(sea_level, 3),
            "modelTemperature": round(temp_model, 2),
            "modelSalinity": round(sal_model, 2),
            "modelWaveHeight": 0.0,
            "modelCurrentSpeed": round(current_speed * 0.95, 3),
            "modelSeaLevel": round(sea_level, 3),
            "status": status,
            "dataSource": "Copernicus Marine + Real Argo" if "copernicus" in self._model_source.lower() else "Prototype Ocean Model + Real Argo",
        }

        if ml_info:
            result["anomalyScore"] = ml_info["anomaly_score"]
            result["anomalyCount"] = ml_info["anomaly_count"]

        return result

    def get_all_station_details(self) -> list[dict]:
        """Get all stations in the frontend-compatible format."""
        if self._stations_cache is None:
            return []
        results = []
        for station in self._stations_cache:
            detail = self.get_station_detail(station.id)
            if detail:
                results.append(detail)
        return results

    def get_observations(
        self,
        parameter: Optional[str] = None,
        depth: Optional[float] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        lat_min: Optional[float] = None,
        lat_max: Optional[float] = None,
        lon_min: Optional[float] = None,
        lon_max: Optional[float] = None,
        limit: int = 100,
    ) -> list[dict]:
        if self._collocated is None:
            return []

        df = self._collocated.copy()

        if lat_min is not None:
            df = df[df["latitude"] >= lat_min]
        if lat_max is not None:
            df = df[df["latitude"] <= lat_max]
        if lon_min is not None:
            df = df[df["longitude"] >= lon_min]
        if lon_max is not None:
            df = df[df["longitude"] <= lon_max]
        if depth is not None:
            df = df[(df["depth"] >= depth - 20) & (df["depth"] <= depth + 20)]
        if start is not None:
            df = df[df["timestamp"] >= start]
        if end is not None:
            df = df[df["timestamp"] <= end]

        df = df.head(limit)
        return df.to_dict(orient="records")

    def get_model_data(
        self,
        parameter: Optional[str] = None,
        depth: Optional[float] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        lat_min: Optional[float] = None,
        lat_max: Optional[float] = None,
        lon_min: Optional[float] = None,
        lon_max: Optional[float] = None,
        limit: int = 100,
    ) -> list[dict]:
        if self._collocated is None:
            return []

        df = self._collocated.copy()
        model_cols = [
            "timestamp", "latitude", "longitude", "depth",
            "model_temperature", "model_salinity",
            "model_current_u", "model_current_v", "model_sea_level",
        ]
        available = [c for c in model_cols if c in df.columns]
        df = df[available]

        if lat_min is not None:
            df = df[df["latitude"] >= lat_min]
        if lat_max is not None:
            df = df[df["latitude"] <= lat_max]
        if lon_min is not None:
            df = df[df["longitude"] >= lon_min]
        if lon_max is not None:
            df = df[df["longitude"] <= lon_max]

        df = df.head(limit)
        return df.to_dict(orient="records")

    def get_timeseries(
        self,
        latitude: float,
        longitude: float,
        parameter: str = "temperature",
        depth: float = 0,
        days: int = 7,
    ) -> list[dict]:
        if self._collocated is None:
            return []

        df = self._collocated
        tolerance = 0.5
        nearby = df[
            (df["latitude"].between(latitude - tolerance, latitude + tolerance))
            & (df["longitude"].between(longitude - tolerance, longitude + tolerance))
        ].sort_values("depth")

        if nearby.empty:
            return []

        records = []
        for _, row in nearby.iterrows():
            obs_col = f"observed_{parameter}"
            model_col = f"model_{parameter}"
            records.append({
                "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
                "depth": float(row["depth"]),
                "observed": float(row[obs_col]) if obs_col in row and pd.notna(row.get(obs_col)) else None,
                "model": float(row[model_col]) if model_col in row and pd.notna(row.get(model_col)) else None,
            })
        return records


ocean_service = OceanService()
