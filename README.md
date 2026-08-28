# My Stock Analyzer

**Smart Metrics. Real-Time Insights.**

My Stock Analyzer is a mobile-first stock research app for beginner and intermediate investors. Search a company, read the business, check fundamentals, get an explainable score, compare peers, and follow news — without a Bloomberg-style terminal.

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

### Phone (Termux)

Keep the project in Termux home (`$HOME`), not shared storage. Then:

```bash
pkg update && pkg install nodejs-lts git
cd ~
git clone https://github.com/mdibnesiampayel/my-stock-analyzer.git
cd my-stock-analyzer
npm install
termux-wake-lock
npm run build
npm start
```

Open Chrome or Firefox on the same phone: `http://127.0.0.1:3001`

Leave Termux running. New session: from the Termux hamburger menu. Stop with `Ctrl+C`, then `termux-wake-unlock`.

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
