"use client";

import { useEffect, useRef, useState } from "react";

interface PostDetailMapProps {
  latitude: number;
  longitude: number;
}

declare global {
  interface Window {
    L?: any;
  }
}

export default function PostDetailMap({ latitude, longitude }: PostDetailMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Leaflet instances
  const leafletMapInstance = useRef<any>(null);
  const leafletMarkerInstance = useRef<any>(null);

  // Keep references updated to avoid stale closures
  const latRef = useRef(latitude);
  const lngRef = useRef(longitude);

  useEffect(() => {
    latRef.current = latitude;
    lngRef.current = longitude;
  }, [latitude, longitude]);

  // Khởi tạo bản đồ Leaflet (OpenStreetMap)
  const initLeafletMap = () => {
    if (!mapRef.current || !window.L) return;

    if (leafletMapInstance.current) {
      return; // Đã khởi tạo rồi, tránh chạy lại
    }

    const L = window.L;
    const lat = Number(latRef.current);
    const lng = Number(lngRef.current);
    const center = isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0 
      ? [10.73785, 106.729695] // Mặc định Quận 7, TP.HCM
      : [lat, lng];

    try {
      // Dọn dẹp DOM trước để tránh bị trùng lặp container
      mapRef.current.innerHTML = "";

      // Giải quyết triệt để lỗi "Map container is already initialized"
      if (mapRef.current) {
        (mapRef.current as any)._leaflet_id = null;
      }

      // Khắc phục lỗi hiển thị marker icon của Leaflet trong Next.js do sai đường dẫn tương đối
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current).setView(center, 15);
      leafletMapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const marker = L.marker(center, { draggable: false }).addTo(map);
      leafletMarkerInstance.current = marker;

      setIsMapLoaded(true);
    } catch (err) {
      console.error("Lỗi khi khởi tạo Leaflet Map: ", err);
    }
  };

  // Tải thư viện Leaflet từ CDN
  useEffect(() => {
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const jsId = "leaflet-js";
    let script = document.getElementById(jsId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = jsId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        initLeafletMap();
      };
      document.head.appendChild(script);
    } else {
      if (window.L) {
        initLeafletMap();
      } else {
        script.addEventListener("load", initLeafletMap);
      }
    }

    return () => {
      // Dọn dẹp khi component unmount
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
        leafletMarkerInstance.current = null;
      }
    };
  }, []);

  // Đồng bộ hóa Marker & Tâm bản đồ từ tọa độ bên ngoài
  useEffect(() => {
    if (!isMapLoaded || !window.L || !leafletMapInstance.current || !leafletMarkerInstance.current) return;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

    const newPos = [lat, lng];
    leafletMapInstance.current.setView(newPos, 15);
    leafletMarkerInstance.current.setLatLng(newPos);
  }, [latitude, longitude, isMapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef} 
        className="h-full w-full rounded-xl" 
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
