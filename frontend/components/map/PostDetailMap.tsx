"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Layers, Navigation } from "lucide-react";

interface PostDetailMapProps {
  latitude: number;
  longitude: number;
}

// Icon marker ghim định vị hiện đại, sắc nét dạng pulse màu xanh dương
const createCustomIcon = () => {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center w-10 h-10">
      <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.7)]"></div>
      <div class="relative w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
        <div class="w-2 h-2 rounded-full bg-white"></div>
      </div>
    </div>`,
    className: "custom-div-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const VOYAGER_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const DARK_MATTER_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const GOOGLE_HYBRID_URL = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const GOOGLE_ATTRIBUTION = '&copy; <a href="https://www.google.com/maps">Google Maps</a>';

export default function PostDetailMap({ latitude, longitude }: PostDetailMapProps) {
  const { resolvedTheme } = useTheme();
  const [isSatellite, setIsSatellite] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Đồng bộ hóa Tile Layer khi theme thay đổi hoặc chế độ xem vệ tinh đổi
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstance.current) return;

    if (isSatellite) {
      tileLayerRef.current.setUrl(GOOGLE_HYBRID_URL);
      tileLayerRef.current.options.attribution = GOOGLE_ATTRIBUTION;
    } else {
      const tileUrl = VOYAGER_URL;
      tileLayerRef.current.setUrl(tileUrl);
      tileLayerRef.current.options.attribution = ATTRIBUTION;
    }
  }, [isSatellite]);

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstance.current) return; // Tránh khởi tạo lại

    const lat = Number(latitude);
    const lng = Number(longitude);
    const center: L.LatLngExpression = isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0 
      ? [10.73785, 106.729695] // Mặc định Quận 7, TP.HCM
      : [lat, lng];

    try {
      mapRef.current.innerHTML = "";
      (mapRef.current as any)._leaflet_id = null;

      // Khôi phục hiệu ứng chuyển động mượt mà khi tương tác bản đồ
      const map = L.map(mapRef.current, {
        zoomControl: false,
        preferCanvas: true,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true
      }).setView(center, 15);
      mapInstance.current = map;

      const initialTileUrl = isSatellite 
        ? GOOGLE_HYBRID_URL 
        : VOYAGER_URL;
      const tileLayer = L.tileLayer(initialTileUrl, {
        attribution: isSatellite ? GOOGLE_ATTRIBUTION : ATTRIBUTION,
        detectRetina: true,
        maxZoom: 20,
        maxNativeZoom: 18,
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 3
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      const marker = L.marker(center, { 
        draggable: false,
        icon: createCustomIcon()
      }).addTo(map);
      markerInstance.current = marker;

      // Click vào marker sẽ dịch chuyển tức thời không chạy animation
      marker.on("click", () => {
        map.setView(center, 17);
      });
    } catch (err) {
      console.error("Lỗi khi khởi tạo Leaflet Map: ", err);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerInstance.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Đồng bộ hóa Marker & Tâm bản đồ từ tọa độ bên ngoài
  useEffect(() => {
    if (!mapInstance.current || !markerInstance.current) return;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

    const newPos: L.LatLngExpression = [lat, lng];
    mapInstance.current.setView(newPos, 15);
    markerInstance.current.setLatLng(newPos);
  }, [latitude, longitude]);

  // Click nút xem vị trí sẽ dịch chuyển tức thời không chạy animation
  const handleFocusMarker = () => {
    if (mapInstance.current) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        const targetPos: L.LatLngExpression = [lat, lng];
        mapInstance.current.setView(targetPos, 17);
      }
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[var(--border)] shadow-md">
      <div 
        ref={mapRef} 
        className="h-full w-full" 
        style={{ height: "100%", width: "100%" }}
      />

      {/* Nút điều khiển bản đồ nổi góc phải thiết kế tối giản hiện đại */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        {/* Nút chuyển đổi Vệ tinh */}
        <button
          type="button"
          onClick={() => setIsSatellite(prev => !prev)}
          className="flex h-10 w-24 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold shadow-lg transition-all hover:bg-[var(--hover)] hover:scale-105 backdrop-blur-md bg-opacity-80 cursor-pointer"
          title="Bật/Tắt ảnh bản đồ Vệ tinh"
        >
          <Layers className="h-4 w-4 text-[var(--accent)]" />
          {isSatellite ? "Bản đồ" : "Vệ tinh"}
        </button>

        {/* Nút tìm và phóng to vị trí Bất động sản */}
        <button
          type="button"
          onClick={handleFocusMarker}
          className="flex h-10 w-24 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold shadow-lg transition-all hover:bg-[var(--hover)] hover:scale-105 backdrop-blur-md bg-opacity-80 cursor-pointer"
          title="Phóng to và căn giữa vị trí bất động sản"
        >
          <Navigation className="h-4 w-4 text-[var(--accent)]" />
          Xem vị trí
        </button>
      </div>
    </div>
  );
}
