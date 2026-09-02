"use client"

import { useEffect, useState } from "react"
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import type { LatLngExpression } from "leaflet"

function ClickHandler({ mode, onPick }: { mode: "generator" | "target"; onPick: (mode: "generator" | "target", lat: number, lon: number) => void }) {
  useMapEvents({ click(e) { onPick(mode, Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))) } })
  return null
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => { if (Number.isFinite(lat) && Number.isFinite(lon)) map.setView([lat, lon], Math.max(map.getZoom(), 15), { animate: true }) }, [lat, lon, map])
  return null
}

export default function MapPicker({ generator, target, onPick }: {
  generator: { lat: number; lon: number }
  target: { lat: number; lon: number }
  onPick: (mode: "generator" | "target", lat: number, lon: number) => void
}) {
  const [mode, setMode] = useState<"generator" | "target">("generator")
  const validGenerator = Number.isFinite(generator.lat) && Number.isFinite(generator.lon)
  const validTarget = Number.isFinite(target.lat) && Number.isFinite(target.lon)
  const center: LatLngExpression = validGenerator ? [generator.lat, generator.lon] : [37.9838, 23.7275]
  return <div className="relative h-full w-full">
    <MapContainer center={center} zoom={15} minZoom={3} maxZoom={20} scrollWheelZoom doubleClickZoom style={{ height: "100%", width: "100%" }} aria-label="Δορυφορικός χάρτης επιλογής γεννήτριας και τελικής θέσης">
      <TileLayer attribution='Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={20} />
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.25} maxZoom={20} />
      <ClickHandler mode={mode} onPick={onPick} />
      {validGenerator && <CircleMarker center={[generator.lat, generator.lon]} radius={9} pathOptions={{ color: "#8dffb0", fillColor: "#8dffb0", fillOpacity: 0.85, weight: 3 }} />}
      {validTarget && <CircleMarker center={[target.lat, target.lon]} radius={9} pathOptions={{ color: "#e6b85c", fillColor: "#e6b85c", fillOpacity: 0.85, weight: 3 }} />}
      <Recenter lat={generator.lat} lon={generator.lon} />
    </MapContainer>
    <div className="absolute left-2 top-2 z-[1000] flex flex-col gap-1 rounded-sm border border-panel-line bg-background/90 p-1 shadow-lg backdrop-blur-sm">
      <button type="button" onClick={() => setMode("generator")} className={`rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${mode === "generator" ? "bg-phosphor text-background" : "text-foreground"}`}>+ Γεννήτρια</button>
      <button type="button" onClick={() => setMode("target")} className={`rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${mode === "target" ? "bg-brass text-background" : "text-foreground"}`}>+ Τελική θέση</button>
    </div>
    <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] rounded-sm border border-panel-line bg-background/85 px-2 py-1 font-mono text-[10px] text-foreground backdrop-blur-sm">{mode === "generator" ? "Πάτησε για γεννήτρια" : "Πάτησε για τελική θέση"}</div>
  </div>
}
