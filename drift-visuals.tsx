"use client"

export function Compass({
  bearing1,
  bearing2,
  xTotal,
  isTIR,
}: {
  bearing1: number
  bearing2: number
  xTotal: number
  isTIR: boolean
}) {
  const S = 140
  const cx = S / 2
  const cy = S / 2
  const R = S / 2 - 14
  const toXY = (bearing: number, r: number) => {
    const a = ((bearing - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }
  const p1 = toXY(bearing1, R - 8)
  const p2 = toXY(bearing2, R - 8)
  const arrowColor = isTIR ? "var(--destructive)" : xTotal > 3 ? "var(--brass)" : "var(--phosphor)"
  const cardinals = [
    { b: 0, label: "Β" },
    { b: 90, label: "Α" },
    { b: 180, label: "Ν" },
    { b: 270, label: "Δ" },
  ]
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="h-36 w-36" role="img" aria-label="Πυξίδα κατεύθυνσης drift">
      <circle cx={cx} cy={cy} r={R} fill="var(--readout-bg)" stroke="var(--panel-line)" strokeWidth={1} />
      {cardinals.map((c) => {
        const o = toXY(c.b, R - 3)
        const i = toXY(c.b, R - 9)
        return <line key={c.b} x1={o.x} y1={o.y} x2={i.x} y2={i.y} stroke="var(--muted-foreground)" strokeWidth={1} />
      })}
      {cardinals.map((c) => {
        const p = toXY(c.b, R + 4)
        return (
          <text
            key={c.label}
            x={p.x}
            y={p.y}
            fill="var(--muted-foreground)"
            fontSize={9}
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {c.label}
          </text>
        )
      })}
      {!isTIR && (
        <>
          <line x1={cx} y1={cy} x2={p1.x} y2={p1.y} stroke={arrowColor} strokeWidth={2} />
          <line x1={cx} y1={cy} x2={p2.x} y2={p2.y} stroke={arrowColor} strokeWidth={2} strokeDasharray="3 3" />
          <circle cx={p1.x} cy={p1.y} r={3} fill={arrowColor} />
          <circle cx={p2.x} cy={p2.y} r={3} fill={arrowColor} />
        </>
      )}
      <circle cx={cx} cy={cy} r={3} fill="var(--brass)" />
    </svg>
  )
}

export function RayDiagram({
  d,
  h,
  theta1,
  theta2,
  isTIR,
  xExit,
  xTotal,
  nr,
}: {
  d: number
  h: number
  theta1: number
  theta2: number | null
  isTIR: boolean
  xExit: number
  xTotal: number
  nr: number
}) {
  const W = 520
  const H = 200
  const groundY = H * 0.52
  const soilH = groundY - 20
  const airH = H - groundY - 20
  const scale = Math.min((W * 0.42) / Math.max(xTotal || xExit, 0.01), 60)
  const targetX = W * 0.18
  const targetY = groundY - 10 + Math.min(soilH - 20, d * scale)
  const exitX = targetX + xExit * scale
  const receiverX = Math.min(W - 20, targetX + xTotal * scale)
  const receiverY = groundY - Math.min(airH - 10, h * scale * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Γεωμετρικό διάγραμμα ray-path">
      <rect x={0} y={groundY} width={W} height={H - groundY} fill="var(--readout-bg)" />
      <rect x={0} y={0} width={W} height={groundY} fill="oklch(0.22 0.014 220)" />
      <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="var(--brass-dim)" strokeWidth={1.5} />
      <text x={10} y={18} fill="var(--muted-foreground)" fontSize={10} fontFamily="var(--font-mono)">
        ΑΕΡΑΣ
      </text>
      <text x={10} y={groundY + 16} fill="var(--muted-foreground)" fontSize={10} fontFamily="var(--font-mono)">
        ΕΔΑΦΟΣ n_r={nr.toFixed(3)}
      </text>

      {/* target */}
      <circle cx={targetX} cy={targetY} r={6} fill="var(--brass)" />
      <text x={targetX + 10} y={targetY + 4} fill="var(--brass)" fontSize={10} fontFamily="var(--font-mono)">
        ΣΤΟΧΟΣ d={d}m
      </text>

      {/* incident ray inside soil */}
      <line x1={targetX} y1={targetY} x2={exitX} y2={groundY} stroke="var(--phosphor)" strokeWidth={2} />
      <text x={(targetX + exitX) / 2 - 20} y={(targetY + groundY) / 2} fill="var(--phosphor-dim)" fontSize={9} fontFamily="var(--font-mono)">
        θ₁={theta1}°
      </text>

      {/* exit point */}
      <circle cx={exitX} cy={groundY} r={4} fill="var(--phosphor)" />

      {isTIR ? (
        <text x={exitX + 6} y={groundY - 8} fill="var(--destructive)" fontSize={10} fontFamily="var(--font-mono)">
          ΟΕΑ (TIR)
        </text>
      ) : (
        <>
          <line x1={exitX} y1={groundY} x2={receiverX} y2={receiverY} stroke="var(--phosphor)" strokeWidth={2} strokeDasharray="4 3" />
          {theta2 != null && (
            <text x={exitX + 6} y={groundY - 10} fill="var(--phosphor-dim)" fontSize={9} fontFamily="var(--font-mono)">
              θ₂={theta2.toFixed(1)}°
            </text>
          )}
          <circle cx={receiverX} cy={receiverY} r={5} fill="var(--brass)" />
          <text x={receiverX - 10} y={receiverY - 8} fill="var(--brass)" fontSize={10} fontFamily="var(--font-mono)">
            ΔΕΚΤΗΣ
          </text>
        </>
      )}

      {/* x_total measure */}
      <line x1={targetX} y1={H - 8} x2={receiverX} y2={H - 8} stroke="var(--muted-foreground)" strokeWidth={1} />
      <text x={(targetX + receiverX) / 2} y={H - 12} fill="var(--muted-foreground)" fontSize={9} fontFamily="var(--font-mono)" textAnchor="middle">
        x_total={xTotal.toFixed(2)}m
      </text>
    </svg>
  )
}
