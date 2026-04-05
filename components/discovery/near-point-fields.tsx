"use client";

import { useState, type ReactNode } from "react";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";

type Props = {
  idPrefix: string;
  initialLat: string;
  initialLng: string;
  initialRadius: string;
  description: ReactNode;
};

export function NearPointFields({ idPrefix, initialLat, initialLng, initialRadius, description }: Props) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [radius, setRadius] = useState(initialRadius);
  const [geoMsg, setGeoMsg] = useState("");

  function useMyLocation() {
    setGeoMsg("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoMsg("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => setGeoMsg("Could not read your location. Allow location access in your browser and try again."),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 },
    );
  }

  return (
    <div className="sm:col-span-2 lg:col-span-3 border-t border-stone-200/80 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Near a point (optional)</p>
      <div className="mt-1 text-xs text-stone-500">{description}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          className={cn(ui.buttonSecondary, "min-h-9 px-3 py-1.5 text-xs")}
        >
          Use my location
        </button>
        {geoMsg ? <span className="text-xs text-amber-900">{geoMsg}</span> : null}
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={ui.label} htmlFor={`${idPrefix}-lat`}>
            Latitude
          </label>
          <input
            id={`${idPrefix}-lat`}
            name="lat"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 37.9755"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className={`${ui.input} mt-1.5`}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor={`${idPrefix}-lng`}>
            Longitude
          </label>
          <input
            id={`${idPrefix}-lng`}
            name="lng"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 23.7348"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className={`${ui.input} mt-1.5`}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor={`${idPrefix}-radius`}>
            Radius (km)
          </label>
          <input
            id={`${idPrefix}-radius`}
            name="radius"
            type="number"
            min={1}
            max={500}
            step="1"
            placeholder="50"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className={`${ui.input} mt-1.5`}
          />
        </div>
      </div>
    </div>
  );
}
