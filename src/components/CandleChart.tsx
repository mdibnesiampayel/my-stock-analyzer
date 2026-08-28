import { useEffect, useRef } from "react";
import { ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { Candle } from "../types";
import { useMoney } from "../lib/money";

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "5Y"] as const;

export function CandleChart({
  candles,
  range,
  onRange,
}: {
  candles: Candle[];
  range: string;
  onRange: (r: string) => void;
}) {
  const money = useMoney();
  const wrap = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!wrap.current) return;
    const dark = document.documentElement.classList.contains("dark");
    const chart = createChart(wrap.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: dark ? "#93A0B0" : "#667085",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: dark ? "#1d2733" : "#eef1f4" },
        horzLines: { color: dark ? "#1d2733" : "#eef1f4" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: range === "1D" || range === "1W" },
      crosshair: { horzLine: { labelBackgroundColor: "#102033" }, vertLine: { labelBackgroundColor: "#102033" } },
      handleScroll: true,
      handleScale: true,
      width: wrap.current.clientWidth,
      height: wrap.current.clientHeight || (window.innerWidth >= 1024 ? 380 : 240),
    });
    const series = chart.addCandlestickSeries({
      upColor: "#1f8df9",
      downColor: "#dd7a2b",
      borderVisible: false,
      wickUpColor: "#1f8df9",
      wickDownColor: "#dd7a2b",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const ro = new ResizeObserver(() => {
      if (!wrap.current) return;
      chart.applyOptions({
        width: wrap.current.clientWidth,
        height: wrap.current.clientHeight || 240,
      });
    });
    ro.observe(wrap.current);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [range]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const data = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open * money.rate,
      high: c.high * money.rate,
      low: c.low * money.rate,
      close: c.close * money.rate,
    }));
    seriesRef.current.setData(data);
    chartRef.current.timeScale().fitContent();
  }, [candles, money.rate]);

  return (
    <div>
      <div ref={wrap} className="w-full" />
      <div className="mt-2 flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRange(r)}
            className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold"
            style={
              range === r
                ? { background: "var(--ink)", color: "var(--bg)" }
                : { background: "var(--bg-2)", color: "var(--muted)" }
            }
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
