"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Navigation, Layers } from "lucide-react";

interface CreatePostMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  onLocationSelect?: (address: string | null, displayName?: string) => void;
}

// Icon marker ghim định vị hiện đại, sắc nét dạng pulse màu xanh dương
const createCustomIcon = () => {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center w-10 h-10">
      <div class="absolute w-8 h-8 rounded-full bg-blue-500 opacity-40 animate-ping"></div>
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

export default function CreatePostMap({ latitude, longitude, onChange, onLocationSelect }: CreatePostMapProps) {
  const { resolvedTheme } = useTheme();
  const [isSatellite, setIsSatellite] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Lưu trữ onChange trong ref để tránh stale closures
  const onChangeRef = useRef(onChange);
  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onChangeRef.current = onChange;
    onLocationSelectRef.current = onLocationSelect;
  }, [onChange, onLocationSelect]);

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

      // Tối ưu hóa tối đa các tùy chọn hiệu năng của Leaflet
      const map = L.map(mapRef.current, {
        zoomControl: false,
        preferCanvas: true,          // Sử dụng Canvas thay vì SVG để vẽ (nhẹ hơn)
        fadeAnimation: true,         // Bật hiệu ứng mờ chuyển tiếp mượt mà
        zoomAnimation: true,         // Bật hiệu ứng phóng to thu nhỏ bằng GPU
        markerZoomAnimation: true,   // Zoom marker mượt mà
      }).setView(center, 15);
      mapInstance.current = map;

      const initialTileUrl = isSatellite 
        ? GOOGLE_HYBRID_URL 
        : VOYAGER_URL;
      const tileLayer = L.tileLayer(initialTileUrl, {
        attribution: isSatellite ? GOOGLE_ATTRIBUTION : ATTRIBUTION,
        detectRetina: true,
        maxZoom: 20,                 // Cho phép phóng to tối đa mức 20
        maxNativeZoom: 18,           // Giới hạn tải ảnh gốc từ server ở mức 18, zoom lớn hơn sẽ tự động co giãn ảnh (tránh bị trắng map)
        updateWhenZooming: false,    // Không tải mảnh bản đồ mới khi đang trong hiệu ứng zoom
        updateWhenIdle: true,        // Chỉ tải mảnh bản đồ mới sau khi dừng di chuyển (giúp drag cực mượt)
        keepBuffer: 3                // Tải trước 3 hàng gạch đệm xung quanh để kéo không bị khoảng trắng
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      const marker = L.marker(center, { 
        draggable: true,
        icon: createCustomIcon()
      }).addTo(map);
      markerInstance.current = marker;

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        if (pos) {
          onChangeRef.current(pos.lat, pos.lng);
          if (onLocationSelectRef.current) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&accept-language=vi`,
                {
                  headers: {
                    "User-Agent": "TrustEstate/1.0"
                  }
                }
              );
              const data = await response.json();
              const addr = data.address;
              if (addr) {
                const addressParts = [addr.house_number, addr.road].filter(Boolean);
                const detailedAddress = addressParts.length > 0 ? addressParts.join(" ") : null;
                onLocationSelectRef.current(detailedAddress, data.display_name);
              }
            } catch (err) {
              console.error("Lỗi khi lấy thông tin vị trí:", err);
            }
          }
        }
      });

      map.on("click", async (e: L.LeafletMouseEvent) => {
        const clickedLatLng = e.latlng;
        if (clickedLatLng) {
          marker.setLatLng(clickedLatLng);
          onChangeRef.current(clickedLatLng.lat, clickedLatLng.lng);
          if (onLocationSelectRef.current) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickedLatLng.lat}&lon=${clickedLatLng.lng}&accept-language=vi`,
                {
                  headers: {
                    "User-Agent": "TrustEstate/1.0"
                  }
                }
              );
              const data = await response.json();
              const addr = data.address;
              if (addr) {
                const addressParts = [addr.house_number, addr.road].filter(Boolean);
                const detailedAddress = addressParts.length > 0 ? addressParts.join(" ") : null;
                onLocationSelectRef.current(detailedAddress, data.display_name);
              }
            } catch (err) {
              console.error("Lỗi khi lấy thông tin vị trí:", err);
            }
          }
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

    // Tránh setView/setLatLng liên tục nếu tọa độ trùng khớp để tránh giật hình
    const currentLatLng = markerInstance.current.getLatLng();
    if (Math.abs(currentLatLng.lat - lat) > 0.0001 || Math.abs(currentLatLng.lng - lng) > 0.0001) {
      const newPos: L.LatLngExpression = [lat, lng];
      mapInstance.current.setView(newPos, 15);
      markerInstance.current.setLatLng(newPos);
    }
  }, [latitude, longitude]);

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị vị trí.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        if (mapInstance.current && markerInstance.current) {
          const newPos: L.LatLngExpression = [lat, lng];
          const currentCenter = mapInstance.current.getCenter();
          const dist = currentCenter.distanceTo(newPos);

          if (dist > 5000) {
            mapInstance.current.setView(newPos, 16);
          } else {
            mapInstance.current.flyTo(newPos, 16);
          }
          markerInstance.current.setLatLng(newPos);
          onChangeRef.current(lat, lng);

          if (onLocationSelectRef.current) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
                {
                  headers: {
                    "User-Agent": "TrustEstate/1.0"
                  }
                }
              );
              const data = await response.json();
              const addr = data.address;
              if (addr) {
                const addressParts = [addr.house_number, addr.road].filter(Boolean);
                const detailedAddress = addressParts.length > 0 ? addressParts.join(" ") : null;
                onLocationSelectRef.current(detailedAddress, data.display_name);
              }
            } catch (err) {
              console.error("Lỗi khi lấy thông tin vị trí định vị:", err);
            }
          }
        }
      },
      (error) => {
        console.error("Lỗi định vị:", error);
        alert("Không thể truy cập vị trí hiện tại. Vui lòng kiểm tra quyền cài đặt trình duyệt của bạn.");
      },
      { enableHighAccuracy: true }
    );
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

        {/* Nút định vị GPS */}
        <button
          type="button"
          onClick={handleLocateUser}
          className="flex h-10 w-24 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold shadow-lg transition-all hover:bg-[var(--hover)] hover:scale-105 backdrop-blur-md bg-opacity-80 cursor-pointer"
          title="Định vị vị trí hiện tại của tôi"
        >
          <Navigation className="h-4 w-4 text-[var(--accent)]" />
          Định vị
        </button>
      </div>
    </div>
  );
}

