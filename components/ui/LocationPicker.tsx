"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

interface AddressInfo {
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface LocationResult {
  lat: number;
  lng: number;
  displayName: string;
  address: AddressInfo;
}

interface Props {
  onLocationSelect: (result: LocationResult) => void;
  onClose: () => void;
  defaultCenter?: [number, number];
}

const DEFAULT_CENTER: [number, number] = [-6.9666, 110.4197]; // Kota Semarang

function FixLeafletIcon() {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ marker }: { marker: [number, number] | null }) {
  const map = useMap();
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    if (marker) {
      map.flyTo(marker, 15, { duration: 1 });
    }
  }, [marker, map]);

  return null;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

export default function LocationPicker({ onLocationSelect, onClose, defaultCenter }: Props) {
  const [marker, setMarker] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter ?? DEFAULT_CENTER);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "Accept-Language": "id" } },
      );
      const data = await res.json();

      onLocationSelect({
        lat,
        lng,
        displayName: data.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        address: {
          road: data.address?.road ?? data.address?.footway ?? "",
          city: data.address?.city ?? data.address?.town ?? data.address?.municipality ?? "",
          town: data.address?.town ?? "",
          village: data.address?.village ?? data.address?.hamlet ?? "",
          state: data.address?.state ?? "",
          postcode: data.address?.postcode ?? "",
          country: data.address?.country ?? "",
        },
      });
    } catch {
      onLocationSelect({
        lat,
        lng,
        displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        address: {},
      });
    } finally {
      setLoading(false);
      onClose();
    }
  }, [onLocationSelect, onClose]);

  const handlePick = useCallback((lat: number, lng: number) => {
    setMarker([lat, lng]);
  }, []);

  const handleConfirm = useCallback(() => {
    if (marker) reverseGeocode(marker[0], marker[1]);
  }, [marker, reverseGeocode]);

  const updateCenter = useCallback((lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMarker([lat, lng]);
    setMapKey((k) => k + 1);
  }, []);

  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung geolokasi");
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingLocation(false);
        updateCenter(pos.coords.latitude, pos.coords.longitude);
      },
      async (err) => {
        console.warn("[Geolocation] Browser error:", err.code, err.message);
        setDetectingLocation(false);

        if (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT) {
          try {
            const res = await fetch("https://ipapi.co/json/");
            if (!res.ok) throw new Error("IP fallback failed");
            const data = await res.json();
            if (data.latitude && data.longitude) {
              updateCenter(data.latitude, data.longitude);
              return;
            }
          } catch {
            console.warn("[Geolocation] IP fallback also failed");
          }
        }

        const messages: Record<number, string> = {
          [err.PERMISSION_DENIED]: "Akses lokasi ditolak. Harap izinkan di pengaturan browser, muat ulang, dan coba lagi.",
          [err.POSITION_UNAVAILABLE]: "Chrome di desktop memblokir deteksi lokasi otomatis. Silakan cari area Anda di atas atau klik pada peta untuk menentukan lokasi secara manual.",
          [err.TIMEOUT]: "Permintaan lokasi habis waktu. Coba lagi atau pilih secara manual pada peta.",
        };
        alert(messages[err.code] ?? "Tidak dapat mendeteksi lokasi Anda. Silakan pilih secara manual pada peta.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }, [updateCenter]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "id" } },
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectSearchResult = useCallback((result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSearchResults([]);
    setSearchQuery("");
    updateCenter(lat, lng);
  }, [updateCenter]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h3 className="text-sm font-medium text-white">Pilih Lokasi</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>
        </div>

        <div className="px-5 py-3 border-b border-white/10 shrink-0 relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                placeholder="Cari kota atau kecamatan..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full h-10 rounded-xl bg-white/[0.08] border border-white/10 px-4 pr-10 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="h-10 px-4 rounded-xl border border-white/20 text-sm text-neutral-300 hover:text-white hover:border-white/40 transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {detectingLocation ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              )}
              {detectingLocation ? "Mencari..." : "Lokasi Saya"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-5 right-5 top-full mt-1 bg-[#252525] border border-white/10 rounded-xl overflow-hidden shadow-xl z-[10000]">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSearchResult(r)}
                  className="w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                >
                  <span className="line-clamp-1">{r.display_name}</span>
                  <span className="text-[10px] text-neutral-500 capitalize">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative h-[350px] md:h-[400px]">
          <FixLeafletIcon />
          <MapContainer
            key={mapKey}
            center={mapCenter}
            zoom={13}
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={handlePick} />
            {marker && <Marker position={marker} />}
            {marker && <MapUpdater marker={marker} />}
          </MapContainer>

          {loading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[1000]">
              <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 shrink-0 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Klik pada peta, cari lokasi, atau gunakan &quot;Lokasi Saya&quot; untuk menentukan alamat pengiriman
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!marker || loading}
            className="h-9 px-5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Memproses..." : "Konfirmasi Lokasi"}
          </button>
        </div>
      </div>
    </div>
  );
}
