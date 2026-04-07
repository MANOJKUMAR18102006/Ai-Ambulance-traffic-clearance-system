# AI Ambulance Traffic Clearance System

A full-stack MERN simulation that demonstrates an AI-powered green corridor for ambulances.

## Prerequisites
- Node.js >= 18
- A free API key from [OpenRouteService](https://openrouteservice.org/dev/#/signup)

## Setup

### 1. Backend
```bash
cd backend
# Add your ORS API key to .env
# ORS_API_KEY=your_key_here
npm install
npm run dev
```
Backend runs on **http://localhost:5000**

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:5173**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/route?start=lat,lng&end=lat,lng` | Fetch optimal route |
| GET | `/api/hospitals?lat=&lng=` | Nearby hospitals via Overpass |
| GET | `/api/traffic` | Simulated traffic level |
| POST | `/api/signal` | Update signal states by ambulance position |

## How to Use

1. Open the app at `http://localhost:5173`
2. Click on the map to set the **ambulance start location**
3. Click again to set the **destination hospital**
4. Click **Get Route** to fetch the optimal path
5. Click **Start Simulation** to animate the ambulance
6. Watch signals turn **GREEN** as the ambulance approaches and **RED** behind it

## Project Structure

```
ambulance-ai-system/
├── backend/
│   ├── controllers/       # Route, hospital, traffic, signal controllers
│   ├── routes/            # Express routers
│   ├── services/
│   │   ├── orsService.js      # OpenRouteService integration
│   │   ├── hospitalService.js # Overpass API queries
│   │   └── aiService.js       # Traffic prediction & signal logic
│   ├── server.js
│   └── .env
└── frontend/
    └── src/
        ├── components/    # MapView, RouteInfo, HospitalList, Alert
        ├── hooks/         # useAmbulanceSimulation
        ├── pages/         # Dashboard
        ├── services/      # api.js (axios calls)
        └── utils/         # icons.js (Leaflet icons)
```
