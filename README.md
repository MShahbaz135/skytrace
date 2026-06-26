# ✈️ SkyTrace — Live Flight Tracking

A modern, public-facing **flight-tracking web app** that lets you follow aircraft in real time on a beautiful, interactive map. SkyTrace shows live positions, routes, and telemetry (altitude, speed, heading) for flights across the globe — wrapped in a fast, polished, fully responsive interface.

> **Status:** UI/UX complete with simulated flight data. The data layer is fully isolated so live data can be wired in without touching the interface.

---

## Overview

SkyTrace is a single-page application built to feel like a real consumer product (think FlightRadar-style trackers). It focuses on a clean, app-like experience: a marketing landing page that sells the product, an interactive live map as the core feature, and dedicated detail pages for individual flights.

The project was built as a frontend showcase emphasizing **modern React architecture, thoughtful component design, smooth motion, and production-quality UI polish**.

## Features

- **Real-time-style live map** — a dark, custom-themed map with rotating aircraft markers oriented to their heading.
- **Interactive flight selection** — tap any plane (or list item) to reveal its great-circle route, progress, and live telemetry.
- **Search & filter** — instantly find flights by number, airline, city, or airport, and filter by status (en route, boarding, delayed, landed).
- **Flight detail pages** — a dedicated route per flight (`/flight/:id`) with the path drawn on the map and full telemetry tiles.
- **Animated landing page** — gradient hero, animated flight arcs, count-up statistics, feature grid, and an embedded interactive map preview.
- **Fully responsive** — adaptive layout with a collapsible flight drawer and bottom sheets on mobile.
- **Motion & micro-interactions** — page transitions, scroll-reveal animations, and hover states powered by Framer Motion.

## Tech Stack

| Area | Technology |
|------|------------|
| Framework | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite](https://vite.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Routing | [React Router](https://reactrouter.com/) |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Maps | [React-Leaflet](https://react-leaflet.js.org/) + OpenStreetMap / Carto tiles |
| Icons | [lucide-react](https://lucide.dev/) |

## Project Structure

```text
skytrace/
├─ public/                    # favicon and static assets
└─ src/
   ├─ data/
   │  └─ flights.ts           # mock flight data + TypeScript types (the "API" stand-in)
   ├─ lib/
   │  └─ utils.ts             # formatting helpers + cn() classname utility
   ├─ components/
   │  ├─ ui/                  # Logo, StatusBadge
   │  ├─ layout/              # Navbar, Footer
   │  ├─ map/                 # FlightMap (Leaflet integration)
   │  ├─ flights/             # FlightCard, RouteProgress, FlightDetailPanel
   │  └─ landing/             # Hero, LiveStats, Features, MapShowcase, CTA
   ├─ pages/                  # LandingPage, LivePage, FlightDetailPage
   ├─ App.tsx                 # routing + scroll management
   ├─ main.tsx                # app entry
   └─ index.css               # theme tokens + global styles
```

## Getting Started

**Prerequisites:** Node.js 18+ and npm.

```bash
# install dependencies
npm install

# start the dev server
npm run dev

# build for production
npm run build

# preview the production build
npm run preview
```

The app runs at `http://localhost:5173` by default.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page — hero, stats, features, map preview, CTA |
| `/live` | The live map experience with searchable/filterable flight list and detail panel |
| `/flight/:id` | Detailed view for a single flight with route map and telemetry |

## Data & Roadmap

All flight data currently lives in `src/data/flights.ts` and conforms to a single `Flight` TypeScript type that the entire UI is built against. This makes it straightforward to plug in a real backend later:

- [ ] Replace the static dataset with a live source (e.g. the free [OpenSky Network API](https://opensky-network.org/)) using TanStack Query.
- [ ] Stream position updates (polling or WebSockets) so markers move on the map in real time.
- [ ] Add flight following / alerts (departure, delay, landing).
- [ ] Persist favorites and recent searches.
- [ ] Add automated tests (Vitest + Playwright).

## Notes

- This is a client-side SPA — ideal for an app-like tracker. SEO-critical content would be a good fit for a future Next.js version.
- Flight data is **simulated** for demonstration purposes; airline flags are lightweight placeholders for logos.

## License

Released under the [MIT License](./LICENSE) © 2026 Muhammad Shahbaz. Free to use as a learning reference or starting point.
