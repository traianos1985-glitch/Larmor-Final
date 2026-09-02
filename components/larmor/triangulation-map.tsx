"use client"

import { Fragment, useEffect, useMemo, useRef } from "react"
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L, { type LatLngBoundsExpression, type LatLngExpression } from "leaflet"
import { bearingBetween, destinationPoint, type TriResult, type TriStation } from "@/lib/physics"

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
    map.fitBounds(points as LatLngBoundsExpression, { padding: [36, 36], maxZoom: 20, animate: false })
  }, [signature, points, map])
  return null
}

// Κλικ σε κενό σημείο του χάρτη → προσθήκη νέας θέσης γεννήτριας.
function ClickToAdd({ onAdd }: { onAdd?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onAdd?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Εικονίδια divIcon (χωρίς εξωτερικά assets ώστε να μη «σπάει» το bundling).
function stationIcon(idx: number) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#8dffb0;color:#0a140d;font:700 12px ui-monospace,monospace;box-shadow:0 0 0 2px #0a140d,0 0 8px rgba(141,255,176,0.6);cursor:grab;">${idx + 1}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

const bearingHandleIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#0a140d;border:2px solid #8dffb0;box-shadow:0 0 6px rgba(141,255,176,0.7);cursor:grab;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export default function TriangulationMap({
  stations,
  result,
  onAddStation,
  onMoveStation,
  onSetBearing,
}: {
  stations: TriStation[]
  result: TriResult | null
  onAddStation?: (lat: number, lon: number) => void
  onMoveStation?: (id: string, lat: number, lon: number) => void
  onSetBearing?: (id: string, bearingDeg: number) => void
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
  const icons = useMemo(() => valid.map((_, i) => stationIcon(i)), [valid.length])

  return (
    <MapContainer
      center={center}
      zoom={17}
      minZoom={3}
      maxZoom={21}
      scrollWheelZoom
      doubleClickZoom={false}
      style={{ height: "100%", width: "100%" }}
      aria-label="Διαδραστικός χάρτης τριγωνισμού διευθύνσεων και ζώνης αβεβαιότητας"
    >
      <TileLayer
        attribution="Imagery © Google"
        url="https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        maxZoom={21}
        maxNativeZoom={21}
      />

      <ClickToAdd onAdd={onAddStation} />

      {/* Διευθύνσεις (ακτίνες) + σταθμοί γεννήτριας (μετακινούμενοι) + λαβή διόπτευσης */}
      {valid.map((s, i) => {
        const end = destinationPoint(s.lat, s.lon, s.bearingDeg, rayKm)
        return (
          <Fragment key={s.id}>
            <Polyline
              positions={[[s.lat, s.lon], end]}
              pathOptions={{ color: "#8dffb0", weight: 2, dashArray: "6 5", opacity: 0.85 }}
            />
            {/* Λαβή στην άκρη της ακτίνας: σύρσιμο → αλλαγή διόπτευσης */}
            <Marker
              position={end}
              icon={bearingHandleIcon}
              draggable={!!onSetBearing}
              zIndexOffset={400}
              eventHandlers={{
                drag: (e) => {
                  const ll = (e.target as L.Marker).getLatLng()
                  onSetBearing?.(s.id, Number(bearingBetween(s.lat, s.lon, ll.lat, ll.lng).toFixed(1)))
                },
              }}
            />
            {/* Σταθμός: σύρσιμο → μετακίνηση θέσης γεννήτριας */}
            <Marker
              position={[s.lat, s.lon]}
              icon={icons[i]}
              draggable={!!onMoveStation}
              zIndexOffset={500}
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng()
                  onMoveStation?.(s.id, Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)))
                },
              }}
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
