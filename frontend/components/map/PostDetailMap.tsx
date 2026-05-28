"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PostDetailMapProps {
  latitude: number;
  longitude: number;
}

// Khắc phục lỗi hiển thị marker icon của Leaflet trong Next.js do sai đường dẫn tương đối
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function PostDetailMap({ latitude, longitude }: PostDetailMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);

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

      const map = L.map(mapRef.current).setView(center, 15);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const marker = L.marker(center, { draggable: false }).addTo(map);
      markerInstance.current = marker;
    } catch (err) {
      console.error("Lỗi khi khởi tạo Leaflet Map: ", err);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerInstance.current = null;
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
