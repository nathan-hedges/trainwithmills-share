"use client";

import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartPoint {
  date: string;
  weight: number;
}

function formatShort(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function CustomTooltip(props: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ value?: number | string }>;
  unit: string;
}) {
  const { active, payload, label, unit } = props;
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-elevated">
      <div className="font-medium text-ink">{label}</div>
      <div className="font-semibold text-royal-700">
        {payload[0]?.value} {unit}
      </div>
    </div>
  );
}

/** Measures its container width via ResizeObserver, so the chart only renders at a
 *  real pixel size (avoids Recharts' ResponsiveContainer "-1" warning). */
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function ProgressionChart({
  data,
  unit = "kg",
  height = 180,
}: {
  data: ChartPoint[];
  unit?: string;
  height?: number;
}) {
  const { ref, width } = useContainerWidth();

  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="grid place-items-center rounded-xl bg-paper text-sm text-muted"
      >
        No history yet - log a session to start tracking.
      </div>
    );
  }

  const formatted = data.map((d) => ({ ...d, label: formatShort(d.date) }));

  return (
    <div ref={ref} style={{ height }}>
      {width > 0 && (
        <AreaChart
          width={width}
          height={height}
          data={formatted}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="royalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f43d8" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2f43d8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#586079" }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#586079" }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={[
              (min: number) => Math.max(0, Math.floor(min - 5)),
              (max: number) => Math.ceil(max + 5),
            ]}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Area
            type="monotone"
            dataKey="weight"
            stroke="#2f43d8"
            strokeWidth={2.5}
            fill="url(#royalFill)"
            dot={{ r: 3, fill: "#2f43d8", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      )}
    </div>
  );
}
