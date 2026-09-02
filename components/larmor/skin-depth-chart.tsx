"use client"

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { fmtDelta } from "@/lib/physics"

export interface SkinDepthPoint {
  label: string
  n: number
  f: number
  soil: number
  metal: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-sm border border-panel-line bg-readout px-3 py-2 font-mono text-xs">
      <p className="mb-1 text-muted-foreground">Ζώνη: {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === "soil" ? "έδαφος" : "μέταλλο"}: {fmtDelta(p.value)}
        </p>
      ))}
    </div>
  )
}

export function SkinDepthChart({ data }: { data: SkinDepthPoint[] }) {
  const valid = data.filter((d) => isFinite(d.soil) && d.soil > 0)
  if (valid.length < 2) {
    return (
      <div className="flex h-52 items-center justify-center font-mono text-xs text-muted-foreground">
        Ανεπαρκή δεδομένα για γράφημα.
      </div>
    )
  }
  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={1}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--panel-line)" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v) => String(v).replace("★ ", "")}
            stroke="var(--panel-line)"
          />
          <YAxis
            scale="log"
            domain={["auto", "auto"]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v) => fmtDelta(v)}
            width={58}
            stroke="var(--panel-line)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="soil"
            stroke="var(--brass)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--brass)" }}
            name="έδαφος"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="metal"
            stroke="var(--phosphor)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--phosphor)" }}
            name="μέταλλο"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
