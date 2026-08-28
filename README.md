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

Keep the project in Termux home (`$HOME`), not shared storage.

**First time only**

```bash
pkg update && pkg install nodejs-lts git
cd ~
git clone https://github.com/mdibnesiampayel/my-stock-analyzer.git
cd my-stock-analyzer
npm install
```

**Run (two Termux sessions)**

```bash
termux-wake-lock
```

Session 1:

```bash
cd ~/my-stock-analyzer
npm run server
```

Session 2 (Termux hamburger menu → New session):

```bash
cd ~/my-stock-analyzer
npm run client
```

Open Chrome or Firefox on the same phone: **http://127.0.0.1:5173**

That is the live app. Port `3001` is the API. If you previously ran `npm run build`, port `3001` can keep showing a frozen old copy — delete `dist` and use `5173`.

**Update to the latest GitHub code**

`git clone` does nothing if `~/my-stock-analyzer` already exists. Stop both sessions with `Ctrl+C`, then:

```bash
cd ~/my-stock-analyzer
git pull origin main
npm install
rm -rf dist
```

Start `npm run server` and `npm run client` again, then refresh **http://127.0.0.1:5173**.

Leave Termux running while you use the app. Stop with `Ctrl+C`, then `termux-wake-unlock`.

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
