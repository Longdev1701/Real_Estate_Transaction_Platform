"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CreatePostMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

// Khắc phục lỗi hiển thị marker icon của Leaflet trong Next.js do sai đường dẫn tương đối
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function CreatePostMap({ latitude, longitude, onChange }: CreatePostMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);

  // Lưu trữ onChange trong ref để tránh stale closures
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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

      const marker = L.marker(center, { draggable: true }).addTo(map);
      markerInstance.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        if (pos) {
          onChangeRef.current(pos.lat, pos.lng);
        }
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        const clickedLatLng = e.latlng;
        if (clickedLatLng) {
          marker.setLatLng(clickedLatLng);
          onChangeRef.current(clickedLatLng.lat, clickedLatLng.lng);
        }
      });
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

    // Tránh setView/setLatLng liên tục nếu tọa độ trùng khớp để tránh giật hình
    const currentLatLng = markerInstance.current.getLatLng();
    if (Math.abs(currentLatLng.lat - lat) > 0.0001 || Math.abs(currentLatLng.lng - lng) > 0.0001) {
      const newPos: L.LatLngExpression = [lat, lng];
      mapInstance.current.setView(newPos, 15);
      markerInstance.current.setLatLng(newPos);
    }
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

