"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyStat } from "@/lib/portal/types";

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

export function ConsistencyChart({
  weeks,
  height = 200,
}: {
  weeks: WeeklyStat[];
  height?: number;
}) {
  const { ref, width } = useContainerWidth();
  // Scale to the busiest week so the bars never clip.
  const maxY = Math.max(1, ...weeks.map((w) => Math.max(w.completed, w.planned)));

  return (
    <div ref={ref} style={{ height }}>
      {width > 0 && (
        <BarChart
          width={width}
          height={height}
          data={weeks}
          margin={{ top: 8, right: 10, bottom: 0, left: -8 }}
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf4" vertical={false} />
          <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: "#586079" }} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#586079" }}
            axisLine={false}
            tickLine={false}
            width={28}
            domain={[0, maxY + 1]}
          />
          <Tooltip
            cursor={{ fill: "#eef2ff" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e8eaf4", fontSize: 12 }}
          />
          {/* Target = sessions planned that week (faint gold), with completed in front. */}
          <Bar dataKey="planned" name="Target" fill="#e7cf95" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="completed" name="Completed" fill="#2f43d8" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      )}
    </div>
  );
}
