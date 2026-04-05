"use client";

import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type NearMapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  href: string;
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeHref(href: string): string {
  if (!href.startsWith("/") || href.includes("//")) return "#";
  return href;
}

type Props = {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  markers: NearMapMarker[];
};

/**
 * OpenStreetMap + Leaflet: search center, radius circle, and result pins.
 * Only mount when geo search is active (parent passes valid coordinates).
 */
export function NearResultsMap({ centerLat, centerLng, radiusKm, markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersKey = useMemo(
    () =>
      JSON.stringify(
        markers.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, title: m.title, href: m.href })),
      ),
    [markers],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    void import("leaflet").then((Lmod) => {
      if (cancelled || !containerRef.current) return;
      const L = Lmod.default;

      el.innerHTML = "";
      map = L.map(el, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const layers: import("leaflet").Layer[] = [];

      const circle = L.circle([centerLat, centerLng], {
        radius: radiusKm * 1000,
        color: "#b45309",
        weight: 2,
        fillColor: "#f59e0b",
        fillOpacity: 0.12,
      });
      circle.addTo(map);
      layers.push(circle);

      const centerIcon = L.divIcon({
        className: "near-map-div-icon",
        html: '<div class="near-map-center-dot" aria-hidden="true"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([centerLat, centerLng], { icon: centerIcon, title: "Search center" }).addTo(map);

      for (const m of markers) {
        const placeIcon = L.divIcon({
          className: "near-map-div-icon",
          html: '<div class="near-map-place-dot" aria-hidden="true"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const mk = L.marker([m.lat, m.lng], { icon: placeIcon, title: m.title });
        const href = safeHref(m.href);
        mk.bindPopup(
          `<a class="font-medium text-amber-900 underline" href="${escapeHtml(href)}">${escapeHtml(m.title)}</a>`,
        );
        mk.addTo(map);
        layers.push(mk);
      }

      const fg = L.featureGroup(layers);
      try {
        map.fitBounds(fg.getBounds(), { padding: [28, 28], maxZoom: 14 });
      } catch {
        map.setView([centerLat, centerLng], 11);
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
      map = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markersKey encodes markers content
  }, [centerLat, centerLng, radiusKm, markersKey]);

  return (
    <div
      ref={containerRef}
      className="relative z-0 h-[min(420px,55vh)] w-full overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-100"
      role="region"
      aria-label="Map of search results"
    />
  );
}
