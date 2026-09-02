"use client"

import { useEffect } from "react"
import { Circle, CircleMarker, LayersControl, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import { destinationPoint, type Sighting, type TriangulationResult } from "@/lib/physics"

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    const valid = points.filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo))
    if (valid.length === 0) return
    if (valid.length === 1) {
      map.setView(valid[0] as LatLngExpression, Math.max(map.getZoom(), 17), { animate: true })
      return
    }
    map.fitBounds(valid as LatLngExpression[], { padding: [40, 40], maxZoom: 20, animate: true })
  }, [points, map])
  return null
}

export default function TriangulationMap({ sightings, result }: { sightings: Sighting[]; result: TriangulationResult | null }) {
  const valid = sightings.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
  const initial: LatLngExpression = valid.length
    ? [valid[0].lat, valid[0].lon]
    : result
      ? [result.lat, result.lon]
      : [37.9838, 23.7275]

  // Μήκος ημιευθείας διόπτευσης: αν υπάρχει τομή, ελαφρώς πέρα από αυτήν· αλλιώς 0.5 km.
  const rayLenKm = (s: Sighting) => {
    if (!result) return 0.5
    const dLat = ((result.lat - s.lat) * Math.PI) / 180
    const dLon = ((result.lon - s.lon) * Math.PI) / 180 * Math.cos((s.lat * Math.PI) / 180)
    const km = 6371 * Math.sqrt(dLat * dLat + dLon * dLon)
    return Math.max(0.05, km * 1.25)
  }

  const allPoints: [number, number][] = [
    ...valid.map((s) => [s.lat, s.lon] as [number, number]),
    ...(result ? [[result.lat, result.lon] as [number, number]] : []),
  ]

  return (
    <MapContainer center={initial} zoom={17} minZoom={3} maxZoom={21} scrollWheelZoom style={{ height: "100%", width: "100%" }} aria-label="Χάρτης τριγωνισμού διοπτεύσεων">
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Google Satellite (έως z21)">
          <TileLayer attribution="Imagery © Google" url="https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" subdomains={["0", "1", "2", "3"]} maxZoom={21} maxNativeZoom={21} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Google Υβριδικό">
          <TileLayer attribution="Imagery © Google" url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" subdomains={["0", "1", "2", "3"]} maxZoom={21} maxNativeZoom={21} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Esri World Imagery">
          <TileLayer attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={21} maxNativeZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Ημιευθείες διόπτευσης από κάθε γεννήτρια προς την κατεύθυνση του στόχου */}
      {valid.map((s) => {
        const end = destinationPoint(s.lat, s.lon, s.bearingDeg, rayLenKm(s))
        return (
          <Polyline
            key={"ray-" + s.id}
            positions={[[s.lat, s.lon], [end.lat, end.lon]]}
            pathOptions={{ color: "#8dffb0", weight: 2, opacity: 0.75, dashArray: "6 5" }}
          />
        )
      })}

      {/* Σημεία γεννήτριας/παρατήρησης */}
      {valid.map((s, i) => (
        <CircleMarker key={"pt-" + s.id} center={[s.lat, s.lon]} radius={7} pathOptions={{ color: "#8dffb0", fillColor: "#0b0f0d", fillOpacity: 0.9, weight: 3 }}>
        </CircleMarker>
      ))}

      {/* Σημείο τομής + κύκλος αβεβαιότητας */}
      {result && (
        <>
          <Circle
            center={[result.lat, result.lon]}
            radius={Math.max(1, result.uncertaintyM)}
            pathOptions={{ color: "#e6b85c", fillColor: "#e6b85c", fillOpacity: 0.15, weight: 1.5 }}
          />
          <CircleMarker center={[result.lat, result.lon]} radius={9} pathOptions={{ color: "#e6b85c", fillColor: "#e6b85c", fillOpacity: 0.95, weight: 3 }} />
        </>
      )}

      <FitBounds points={allPoints} />
    </MapContainer>
  )
}
