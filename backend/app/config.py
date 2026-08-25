from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Data sources
    copernicus_username: str = ""
    copernicus_password: str = ""
    copernicus_api_url: str = "https://nrt.cmems-du.eu/motu-web/Motu"

    # Paths
    data_dir: Path = Path(__file__).parent.parent / "data"
    model_path: Path = Path(__file__).parent.parent / "ml" / "models" / "anomaly_model.joblib"

    # Frontend
    frontend_url: str = "http://localhost:5173"

    # ML thresholds (prototype, not scientifically validated)
    anomaly_threshold_warning: float = 0.6
    anomaly_threshold_high: float = 0.85

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
