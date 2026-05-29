# Tài Liệu Chức Năng: Bản Đồ Tương Tác & Tối Ưu Hóa Form Đăng Tin mới

Tài liệu này mô tả chi tiết chức năng đăng tin mới của hệ thống bất động sản, tập trung vào thiết kế tối ưu giao diện 2 cột, tích hợp danh mục hành chính Việt Nam, tự động định vị địa lý (Geocoding) và bản đồ tương tác OpenStreetMap (Leaflet).

---

## 1. Tổng Quan Tính Năng
Trang đăng tin bất động sản mới (`/posts/create`) được thiết kế lại nhằm cải thiện tối đa trải nghiệm người dùng (UX/UI):
* **Thiết kế gọn gàng (Single-page view):** Giao diện vừa vặn trên màn hình máy tính mà không gây cuộn trang chính (main scrollbar). Toàn bộ nội dung biểu mẫu và khu vực tải ảnh hiển thị song song.
* **Bản đồ tương tác độc lập (OpenStreetMap):** Thay thế Google Maps bằng OpenStreetMap thông qua thư viện Leaflet giúp hệ thống hoạt động hoàn toàn miễn phí, không cần cấu hình API Key hay thẻ tín dụng thanh toán, đồng thời tránh các lỗi phân quyền (`InvalidKeyMapError`).
* **Lưu bản nháp tự động:** Tránh mất dữ liệu nhập dở dang khi gặp sự cố trình duyệt hoặc tải lại trang.

---

## 2. Các Thành Phần Chính & Cơ Chế Hoạt Động

### 2.1. Giao Diện 2 Cột Tối Ưu (Layout)
Giao diện biểu mẫu chia làm 2 cột chính trên màn hình lớn (Desktop):
* **Cột trái (Form nhập thông tin chi tiết):**
  * Tiêu đề, loại hình bất động sản, nhu cầu đăng tin (Bán/Thuê/Cần mua).
  * Giá và Diện tích.
  * Bộ chọn khu vực hành chính 3 cấp (Tỉnh -> Quận -> Xã) và địa chỉ cụ thể.
  * Ô nhập tọa độ và Bản đồ tương tác trực tiếp.
  * Ô mô tả chi tiết bài đăng.
  * Toàn bộ cột trái hỗ trợ thanh cuộn nội bộ tự thiết kế (custom scrollbar).
* **Cột phải (Quản lý hình ảnh và Đăng bài):**
  * Vùng kéo thả file tải ảnh lên (tối đa 10 ảnh, định dạng JPG/PNG/WEBP, dung lượng tối đa 5MB/ảnh).
  * Danh sách xem trước ảnh nằm ngang hỗ trợ cuộn ngang (`overflow-x-auto`).
  * Tính năng chọn **Ảnh đại diện** (Avatar) của bài viết trực quan.
  * Nút "Đăng tin ngay" cố định ở chân trang cột phải giúp thao tác nhanh chóng.

### 2.2. Dữ Liệu Hành Chính Việt Nam Phân Tầng (Cascading Selects)
* Hệ thống tích hợp dịch vụ API công khai [provinces.open-api.vn](https://provinces.open-api.vn/) để tải dữ liệu hành chính:
  1. Khi tải trang, hệ thống gọi API lấy danh sách **Tỉnh / Thành phố**.
  2. Khi người dùng chọn Tỉnh, hệ thống gọi API tải danh sách **Quận / Huyện** trực thuộc Tỉnh đó.
  3. Khi chọn Quận, hệ thống tải tiếp danh sách **Phường / Xã** thuộc Quận đó.
* Quá trình này giúp chuẩn hóa dữ liệu địa chỉ đầu vào phục vụ cho việc tìm kiếm và lọc bài đăng sau này.

### 2.3. Tự Động Xác Định Tọa Độ (Auto-Geocoding)
* Khi người dùng nhập xong **Địa chỉ cụ thể** và rời con trỏ (`onBlur`), hoặc khi thay đổi **Phường/Xã**, hệ thống sẽ tự động gọi **Nominatim API** của OpenStreetMap:
  ```
  https://nominatim.openstreetmap.org/search?format=json&q={address}&countrycodes=vn&limit=1
  ```
* **Chiến lược tìm kiếm đa tầng:** Hệ thống tự động tìm kiếm từ địa chỉ chi tiết đến khái quát để đảm bảo luôn trả về kết quả gần đúng nhất nếu địa chỉ quá chi tiết không tìm thấy:
  1. `Địa chỉ cụ thể, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố, Việt Nam`
  2. `Phường/Xã, Quận/Huyện, Tỉnh/Thành phố, Việt Nam`
  3. `Quận/Huyện, Tỉnh/Thành phố, Việt Nam`
  4. `Tỉnh/Thành phố, Việt Nam`
* Khi có kết quả tọa độ từ API, các trường `latitude` và `longitude` trong form sẽ tự động cập nhật, đồng thời bản đồ tự động dịch chuyển tâm và Marker đến vị trí mới.

### 2.4. Bản Đồ Tương Tác OpenStreetMap (Component [CreatePostMap.tsx](file:///c:/Users/A.Long/OneDrive/Desktop/Accommodation_Platform/frontend/components/map/CreatePostMap.tsx))
* Do Leaflet sử dụng các biến toàn cục của trình duyệt (`window`, `document`), component này được import động dưới dạng **Client-only component** bằng tính năng `dynamic` của Next.js với thuộc tính `{ ssr: false }`.
* **Cơ chế tải thư viện động:** Bản đồ tự động chèn các tệp CSS và JS của Leaflet từ CDN `unpkg.com` vào thẻ `<head>` lúc runtime khi component mount lần đầu.
* **Khắc phục lỗi Marker Icon trong Next.js:** Leaflet mặc định phân giải đường dẫn ảnh icon theo dạng tương đối, gây ra lỗi 404 trong Next.js. Dự án khắc phục bằng cách cấu hình lại mặc định đường dẫn marker sang CDN của Leaflet:
  ```javascript
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
  ```
* **Tương tác 2 chiều:**
  * Kéo thả Marker trên bản đồ tự động tính toán lại tọa độ Lat/Lng và cập nhật ngược về form.
  * Click chuột vào bất kỳ điểm nào trên bản đồ sẽ di chuyển Marker tới đó và cập nhật tọa độ về form.
  * Thay đổi tọa độ hoặc địa chỉ trong form sẽ tự động di chuyển Marker và phóng tới vị trí đó trên bản đồ.

### 2.5. Tự Động Lưu Nháp (Auto-Save Draft)
* Mọi thay đổi trên các trường dữ liệu của biểu mẫu được theo dõi (`watch` trong React Hook Form) và lưu trữ tự động vào `localStorage` dưới khóa `trustestate-create-post-draft`.
* Khi tải lại trang, nếu có bản nháp cũ, hệ thống sẽ khôi phục tuần tự tất cả dữ liệu (bao gồm cả việc tải lại danh sách Quận/Huyện/Xã tương ứng với Tỉnh/Quận đã chọn trước đó) và hiển thị thông báo Toast góc trên bên phải để người dùng biết.
* Sau khi người dùng đăng bài viết thành công, bản nháp trong `localStorage` sẽ được xóa bỏ tự động để sẵn sàng cho lần đăng tiếp theo.

---

## 3. Quy Trình Cài Đặt & Cấu Hình

### 3.1. Biến môi trường (`.env.local`)
Do chuyển đổi hoàn toàn sang dùng OpenStreetMap (Leaflet), hệ thống **không yêu cầu** bất kỳ API Key nào. File `.env.local` ở frontend chỉ cần chứa các biến API cơ bản:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```

### 3.2. Cấu trúc thư mục liên quan
* **[CreatePostMap.tsx](file:///c:/Users/A.Long/OneDrive/Desktop/Accommodation_Platform/frontend/components/map/CreatePostMap.tsx):** Chứa component bản đồ dự trên Leaflet & OpenStreetMap.
* **[page.tsx](file:///c:/Users/A.Long/OneDrive/Desktop/Accommodation_Platform/frontend/app/posts/create/page.tsx):** Biểu mẫu tạo bài viết mới, xử lý dữ liệu hành chính Việt Nam, tải ảnh, tự động lưu nháp và gọi API gửi bài viết.
* **[globals.css](file:///c:/Users/A.Long/OneDrive/Desktop/Accommodation_Platform/frontend/app/globals.css):** Bổ sung CSS tùy chỉnh scrollbar và màu nền tối cho dropdown trong dark mode.
