# Ocean Sentry Backend

Real-time ocean model-observation comparison and anomaly detection system.

## Architecture

```
Raw Data Sources (Copernicus, Argo)
        ↓
Data Ingestion (scripts/ingest.py)
        ↓
Preprocessing & QC (scripts/preprocess.py)
        ↓
Model-Observation Collocation (scripts/collocate.py)
        ↓
ML Training (scripts/train.py)
        ↓
FastAPI Service (app/main.py)
        ↓
Existing 3D Frontend
```

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and configure credentials if available.

## Running the Pipeline

```bash
# 1. Ingest raw data (downloads from ArgoVis, generates synthetic model)
python scripts/ingest.py

# 2. Preprocess and quality-control
python scripts/preprocess.py

# 3. Collocate model with observations
python scripts/collocate.py

# 4. Train anomaly detection model
python scripts/train.py
```

## Running the API

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/ocean/status` | Data pipeline status |
| `GET /api/stations` | Observation stations |
| `GET /api/ocean/observations` | Observation data |
| `GET /api/ocean/model` | Model data |
| `GET /api/ocean/comparison` | Model vs observation |
| `GET /api/ocean/anomalies` | Detected anomalies |
| `POST /api/ml/predict` | ML anomaly prediction |

## Data Sources

### Currently Implemented
- **Model**: Synthetic grid based on CMEMS GLOBAL_ANALYSISFORECAST_PHY_001_024 structure
- **Observations**: Real Argo float profiles via ArgoVis API

### Variables Found in Data
- Temperature (°C)
- Salinity (PSU)
- Zonal current (m/s)
- Meridional current (m/s)
- Sea level (m)

### Region
- Bay of Bengal / Indian Ocean
- Latitude: 5°N to 22°N
- Longitude: 75°E to 95°E

## ML Model

- **Algorithm**: Isolation Forest (unsupervised anomaly detection)
- **Features**: 16 (location, depth, model values, observed values, differences, temporal)
- **Note**: Prototype thresholds — NOT scientifically validated

## Pipeline Results (First Run)

| Metric | Value |
|--------|-------|
| Argo profiles downloaded | 107 (real) |
| Argo measurements | 25,161 |
| Model grid points | 281,260 |
| Collocated records | 1,443 |
| Match rate | 5.7% |
| Temperature MAE | 2.11°C |
| Temperature RMSE | 2.68°C |
| Salinity MAE | 4.36 PSU |

## Project Status

- [x] FastAPI foundation
- [x] Real Argo data ingestion (ArgoVis API)
- [x] Synthetic model grid generation
- [x] Data preprocessing with QC
- [x] Model-observation collocation
- [x] Baseline error analysis
- [x] Isolation Forest training
- [x] ML prediction endpoint
- [ ] Real Copernicus model data (requires credentials)
- [ ] Frontend API integration
- [ ] PostgreSQL/PostGIS database
- [ ] Pretrained forecast model integration
