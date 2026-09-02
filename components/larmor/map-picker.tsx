"use client"

import { useEffect, useRef, useState } from "react"
import { CircleMarker, LayersControl, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import type { LatLngExpression } from "leaflet"

function ClickHandler({ mode, onPick }: { mode: "generator" | "target"; onPick: (mode: "generator" | "target", lat: number, lon: number) => void }) {
  useMapEvents({ click(e) { onPick(mode, Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))) } })
  return null
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => { if (Number.isFinite(lat) && Number.isFinite(lon)) map.setView([lat, lon], Math.max(map.getZoom(), 18), { animate: true }) }, [lat, lon, map])
  return null
}

// Παρακολουθεί το κέντρο και το zoom του χάρτη για το σταυρόνημα ακριβούς τοποθέτησης.
// Το onChange κρατιέται σε ref ώστε το effect αρχικοποίησης να τρέχει μόνο στο mount
// και να μην δημιουργείται βρόχος επανασχεδίασης (setState → νέο onChange → effect → …).
function CenterTracker({ onChange }: { onChange: (lat: number, lon: number, zoom: number) => void }) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const map = useMapEvents({
    move() { const c = map.getCenter(); onChangeRef.current(c.lat, c.lng, map.getZoom()) },
    zoom() { const c = map.getCenter(); onChangeRef.current(c.lat, c.lng, map.getZoom()) },
  })
  useEffect(() => { const c = map.getCenter(); onChangeRef.current(c.lat, c.lng, map.getZoom()) }, [map])
  return null
}

export default function MapPicker({ generator, target, onPick }: {
  generator: { lat: number; lon: number }
  target: { lat: number; lon: number }
  onPick: (mode: "generator" | "target", lat: number, lon: number) => void
}) {
  const [mode, setMode] = useState<"generator" | "target">("generator")
  const [center, setCenter] = useState<{ lat: number; lon: number; zoom: number }>({ lat: generator.lat, lon: generator.lon, zoom: 18 })
  const validGenerator = Number.isFinite(generator.lat) && Number.isFinite(generator.lon)
  const validTarget = Number.isFinite(target.lat) && Number.isFinite(target.lon)
  const initialCenter: LatLngExpression = validGenerator ? [generator.lat, generator.lon] : [37.9838, 23.7275]

  return <div className="relative h-full w-full">
    <MapContainer center={initialCenter} zoom={18} minZoom={3} maxZoom={21} scrollWheelZoom doubleClickZoom style={{ height: "100%", width: "100%" }} aria-label="Δορυφορικός χάρτης επιλογής γεννήτριας και τελικής θέσης">
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Google Satellite (έως z21)">
          <TileLayer
            attribution="Imagery © Google"
            url="https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            subdomains={["0", "1", "2", "3"]}
            maxZoom={21}
            maxNativeZoom={21}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Google Υβριδικό (δρόμοι + δορυφόρος)">
          <TileLayer
            attribution="Imagery © Google"
            url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            subdomains={["0", "1", "2", "3"]}
            maxZoom={21}
            maxNativeZoom={21}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Esri World Imagery">
          <TileLayer
            attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={21}
            maxNativeZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <ClickHandler mode={mode} onPick={onPick} />
      <CenterTracker onChange={(lat, lon, zoom) => setCenter({ lat, lon, zoom })} />
      {validGenerator && <CircleMarker center={[generator.lat, generator.lon]} radius={9} pathOptions={{ color: "#8dffb0", fillColor: "#8dffb0", fillOpacity: 0.85, weight: 3 }} />}
      {validTarget && <CircleMarker center={[target.lat, target.lon]} radius={9} pathOptions={{ color: "#e6b85c", fillColor: "#e6b85c", fillOpacity: 0.85, weight: 3 }} />}
      <Recenter lat={generator.lat} lon={generator.lon} />
    </MapContainer>

    {/* Σταυρόνημα κέντρου — για ακριβή τοποθέτηση χωρίς εξάρτηση από το ακριβές κλικ */}
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className={mode === "generator" ? "text-phosphor" : "text-brass"}>
        <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
        <path d="M20 2v10M20 28v10M2 20h10M28 20h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
        <circle cx="20" cy="20" r="1.5" fill="currentColor" />
      </svg>
    </div>

    <div className="absolute left-2 top-2 z-[1000] flex flex-col gap-1 rounded-sm border border-panel-line bg-background/90 p-1 shadow-lg backdrop-blur-sm">
      <button type="button" onClick={() => setMode("generator")} className={`rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${mode === "generator" ? "bg-phosphor text-background" : "text-foreground"}`}>+ Γεννήτρια</button>
      <button type="button" onClick={() => setMode("target")} className={`rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${mode === "target" ? "bg-brass text-background" : "text-foreground"}`}>+ Τελική θέση</button>
    </div>

    {/* Κουμπί ακριβούς τοποθέτησης στο κέντρο του σταυρονήματος + ζωντανές συντεταγμένες */}
    <div className="absolute bottom-2 left-2 right-2 z-[1000] flex items-center justify-between gap-2">
      <div className="pointer-events-none rounded-sm border border-panel-line bg-background/85 px-2 py-1 font-mono text-[10px] text-foreground backdrop-blur-sm">
        {center.lat.toFixed(6)}, {center.lon.toFixed(6)} · z{Math.round(center.zoom)}
      </div>
      <button
        type="button"
        onClick={() => onPick(mode, Number(center.lat.toFixed(6)), Number(center.lon.toFixed(6)))}
        className={`rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wide shadow-lg ${mode === "generator" ? "bg-phosphor text-background" : "bg-brass text-background"}`}
      >
        Τοποθέτηση {mode === "generator" ? "γεννήτριας" : "τελικής θέσης"} εδώ
      </button>
    </div>
  </div>
}
