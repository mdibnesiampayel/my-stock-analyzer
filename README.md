# StockLens

**Smart Metrics. Real-Time Insights.**

A mobile-first stock research app for beginner and intermediate investors. Search a company, read the business, check fundamentals, get an explainable score, compare peers, and follow news — without a Bloomberg-style terminal.

Version 1 does **not** require login. Favourites and Follows are stored on the device.

## Run locally

```bash
npm install
npm run server
npm run client
```

- API: `http://localhost:3001`
- App: `http://localhost:5173`

Open the Vite URL. `/api` is proxied to the backend.

## What it does

- Search by ticker or company name
- Home tabs: Favourite, Hot, New, Gainers, Losers
- Stock page: price, candlestick chart, fundamentals, 8-question checklist, AI-style analysis, competitors, news
- Favourite (star) vs Follow (news) are separate actions
- Personalized news feed from followed names
- Dark mode and local notification opt-in

Hot is ranked from price movement, volume, and activity — it is not a copy of Gainers.

## Data

Quotes, charts, screeners, and headlines come from public Yahoo Finance endpoints. Fundamentals come from SEC EDGAR company facts. Company descriptions may use Wikipedia. Newly listed names use the Nasdaq IPO calendar.

Data can be delayed or incomplete. **This is not financial advice.**

## Stack

- React 18 + TypeScript + Vite + Tailwind CSS
- Express API (`server/`)
- Local storage for Favourites, Follows, and settings

The services are split so authentication and cloud sync can be added later without rewriting research logic.
