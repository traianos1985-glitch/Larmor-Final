"use client"

import { Fragment, useEffect, useRef } from "react"
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet"
import { destinationPoint, type TriResult, type TriStation } from "@/lib/physics"

// Προσαρμόζει το viewport ώστε να χωρούν σταθμοί, εκτιμώμενο σημείο και έλλειψη.
// Εφαρμόζεται ΜΟΝΟ όταν αλλάζουν πραγματικά οι συντεταγμένες (μέσω signature +
// ref-guard), ώστε το animated fit να μην πυροδοτεί βρόχο επανασχεδίασης.
function FitBounds({ points, signature }: { points: Array<[number, number]>; signature: string }) {
  const map = useMap()
  const applied = useRef<string>("")
  useEffect(() => {
    if (applied.current === signature) return
    applied.current = signature
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 17, { animate: false })
      return
    }
    map.fitBounds(points as LatLngBoundsExpression, { padding: [32, 32], maxZoom: 20, animate: false })
  }, [signature, points, map])
  return null
}

export default function TriangulationMap({
  stations,
  result,
}: {
  stations: TriStation[]
  result: TriResult | null
}) {
  const valid = stations.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
  const center: LatLngExpression = valid.length ? [valid[0].lat, valid[0].lon] : [37.9838, 23.7275]

  const allPoints: Array<[number, number]> = []
  valid.forEach((s) => allPoints.push([s.lat, s.lon]))
  if (result?.ok) {
    allPoints.push([result.lat, result.lon])
    result.ellipsePolygon.forEach((p) => allPoints.push(p))
  }
  // Σταθερή «υπογραφή» των συντεταγμένων ώστε το fit να τρέχει μόνο σε αλλαγή.
  const fitSignature = allPoints.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join("|")

  const rayKm = 1.5

  return (
    <MapContainer
      center={center}
      zoom={17}
      minZoom={3}
      maxZoom={21}
      scrollWheelZoom
      doubleClickZoom
      style={{ height: "100%", width: "100%" }}
      aria-label="Χάρτης τριγωνισμού διευθύνσεων και ζώνης αβεβαιότητας"
    >
      <TileLayer
        attribution="Imagery © Google"
        url="https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        maxZoom={21}
        maxNativeZoom={21}
      />

      {/* Διευθύνσεις (ακτίνες) + σταθμοί γεννήτριας */}
      {valid.map((s) => {
        const end = destinationPoint(s.lat, s.lon, s.bearingDeg, rayKm)
        return (
          <Fragment key={s.id}>
            <Polyline
              positions={[[s.lat, s.lon], end]}
              pathOptions={{ color: "#8dffb0", weight: 2, dashArray: "6 5", opacity: 0.85 }}
            />
            <CircleMarker
              center={[s.lat, s.lon]}
              radius={7}
              pathOptions={{ color: "#8dffb0", fillColor: "#8dffb0", fillOpacity: 0.9, weight: 2 }}
            />
          </Fragment>
        )
      })}

      {/* Ζώνη αβεβαιότητας + σημεία τομής + εκτιμώμενος στόχος */}
      {result?.ok && (
        <>
          <Polygon
            positions={result.ellipsePolygon}
            pathOptions={{ color: "#e6b85c", fillColor: "#e6b85c", fillOpacity: 0.18, weight: 1.5 }}
          />
          {result.intersections.map((p, i) => (
            <CircleMarker
              key={`x-${i}`}
              center={[p.lat, p.lon]}
              radius={3}
              pathOptions={{ color: "#e6b85c", fillColor: "#e6b85c", fillOpacity: 0.55, weight: 1 }}
            />
          ))}
          <CircleMarker
            center={[result.lat, result.lon]}
            radius={6}
            pathOptions={{ color: "#ff5c5c", fillColor: "#ff5c5c", fillOpacity: 1, weight: 2 }}
          />
        </>
      )}

      <FitBounds points={allPoints} signature={fitSignature} />
    </MapContainer>
  )
}
