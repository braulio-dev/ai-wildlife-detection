# AI Wildlife Detection — The Wildlife Detector

## Description

The Wildlife Detector is a real-time web application designed to help farmers, ranchers, and rural landowners in the Tijuana region monitor their property for wildlife threats. Using a live camera feed, the system continuously analyzes video frames to detect wild animals and immediately notifies the user a potentially dangerous species is spotted near their farm, stable, or crop field.

## Project structure

- `backend/`: API and inference logic (Python service).
  - `main.py`: backend entry point.
  - `inference.py`, `preprocess.py`: preprocessing and inference pipeline.
  - `alerts.py`: notifications/alerts.
  - `requirements.txt`: backend dependencies.
- `frontend/`: web UI (client).
  - `index.html`, `app.js`, `styles.css`.
  - `package.json`: frontend scripts and dependencies.
- `notebook/`: experimentation assets (models and `main.ipynb`).
- `requirements.txt`: root-level dependencies.

## How to run

### Backend

From the `backend/` folder:

```bash
uvicorn main:app
```

### Frontend

From the `frontend/` folder:

```bash
npm install
npm run dev
```
