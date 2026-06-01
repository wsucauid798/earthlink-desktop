# EarthLink Desktop

A real-time geospatial visualization and analytics platform for the EarthLink virtual world. Built with Tauri, React, and MapLibre GL, this desktop application serves as the primary viewer for observing AI agents as they explore, learn, and interact across a simulated Earth.

## Overview

EarthLink Desktop connects to the EarthLink backend server and provides an interactive map-based interface for monitoring a virtual world populated by autonomous AI agents. Users can track agent movements in real time, inspect location data (weather, astronomy, geophysics, atmosphere), analyze agent behavior patterns, and control the simulation.

## Features

- **Interactive Map Visualization** — Three rendering modes: 2D (Mercator), 2.5D (pitched/tilted), and 3D (globe projection), all powered by MapLibre GL
- **Real-Time Agent Tracking** — Live agent positions, trajectories, and state updates streamed via WebSocket
- **Multi-Panel Layout** — Resizable Explorer (world stats), Inspector (selection details), and Bottom Panel with drag-handle resizing
- **World Statistics** — Population metrics, activity distribution, weather summaries, and geography stats updated each tick
- **Location Inspector** — Detailed weather, wind, astronomy, geophysics, and atmosphere data for any selected location
- **Agent Inspector** — Energy, knowledge, reward metrics, movement history, and conversational Q&A with individual agents
- **Viewport Tabs** — Switch between Map, Analytics, Decisions, and Traces views
- **Simulation Control** — Start, pause, and reset the simulation from the menu
- **Location Search** — Search locations by name, type, or region with fly-to animation
- **Theming** — Light, Dark, System, and Auto (time-of-day based) themes
- **Data Export** — Export locations as GeoJSON, agent history as CSV, world snapshots, and traces
- **Connection Management** — Auto-connect with exponential backoff, manual reconnect, and status indicators

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | [Tauri v2](https://v2.tauri.app/) (Rust) |
| Frontend | [React 19](https://react.dev/) + TypeScript |
| Build Tool | [Vite 7](https://vite.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Map Rendering | [MapLibre GL](https://maplibre.org/) |
| State Management | [Zustand](https://zustand.docs.pmnd.rs/) |
| Icons | [Lucide React](https://lucide.dev/) |

## Project Structure

```
earthlink-desktop/
├── src/                        # Frontend (TypeScript/React)
│   ├── api/                    # REST client, WebSocket manager, type definitions
│   ├── components/             # UI components (App, Map, Explorer, Inspector, etc.)
│   ├── hooks/                  # Custom hooks (useTheme, useResizable)
│   ├── store/                  # Zustand state stores
│   └── main.tsx                # React entry point
├── src-tauri/                  # Backend (Rust/Tauri)
│   ├── src/                    # Rust source (main.rs, lib.rs)
│   ├── icons/                  # App icons
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── public/                     # Static assets
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Node.js dependencies
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install) toolchain (required by Tauri)
- Access to an EarthLink backend server. By default the app connects to the
  hosted production server (`https://earthlink.yuxilabs.com`); point it at a
  local server via File → Connect to Server if you are running one.

For platform-specific Tauri prerequisites, see the [Tauri v2 prerequisites guide](https://v2.tauri.app/start/prerequisites/).

## Getting Started

```bash
# Install dependencies
npm install

# Start development (Vite dev server + Tauri window)
npx tauri dev
```

The Vite dev server runs on `http://localhost:1420` with hot module reloading. The Tauri window opens automatically and connects to the server resolved from config (see [Configuration](#configuration)) — the hosted production server by default.

## Building for Production

```bash
# Build frontend and create platform-specific bundle
npx tauri build
```

This compiles the TypeScript frontend with Vite, compiles the Rust backend, and produces platform-specific installers in `src-tauri/target/release/bundle/`.

## Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Backend server URL | `https://earthlink.yuxilabs.com` | See URL resolution below |
| Dev server port | `1420` | `vite.config.ts` |
| Window size | 1400 x 900 (min 800 x 500) | `src-tauri/tauri.conf.json` |

The backend URL is resolved in order of precedence (see `src/store/connectionStore.ts`):

1. **User override** — `~/.earthlink/config.json`, written by File → Connect to Server
2. **Bundled default** — `src-tauri/resources/default-config.json` (ships with the release; currently `https://earthlink.yuxilabs.com`)
3. **Hard fallback** — `http://localhost:8000`, only when neither config is present

## Architecture

The application follows a clean separation of concerns:

- **API Layer** (`src/api/`) — Typed REST client and WebSocket manager for communicating with the EarthLink backend
- **State Stores** (`src/store/`) — Zustand stores for connection state, world state, view mode, selections, logs, and agent history
- **Components** (`src/components/`) — React components for the map, panels, menus, and analysis views
- **Hooks** (`src/hooks/`) — Reusable logic for theming and panel resizing

Real-time updates flow from the backend via WebSocket tick events through the Zustand stores to the React UI. The map renders agent positions and location data using MapLibre GL with GeoJSON sources.

## API Integration

The desktop app communicates with the EarthLink backend through:

- **REST API** — World state, location queries, agent details, weather/astronomy/geophysics data, simulation control
- **WebSocket** (`/ws/world`) — Streaming tick events for real-time agent movement and world state updates with auto-reconnect and exponential backoff

## License

[MIT](LICENSE)
