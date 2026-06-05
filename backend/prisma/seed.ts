import "dotenv/config";

import bcrypt from "bcryptjs";

import {
  PostType,
  Prisma,
  PropertyType,
  UserRole,
  UserStatus,
} from "@prisma/client";

import { propertyFeatures } from "./data/property-features.js";
import { prisma } from "../src/prisma/prisma.service.js";

const adminEmail = "admin@realestate.local";
const seedPassword = "12345678";

type SeedUserProfile = {
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
  role?: UserRole;
};

type SeedPostInput = {
  address: string;
  area: number;
  city: string;
  description: string;
  district: string;
  images: Array<{
    caption: string;
    imageUrl: string;
    order: number;
  }>;
  latitude: number;
  longitude: number;
  postType: PostType;
  price: number;
  propertyType: PropertyType;
  title: string;
  ward?: string;
};

type SeedListing = {
  authorEmail: string;
  featureNames: string[];
  post: SeedPostInput;
};

type LocationProfile = {
  city: string;
  district: string;
  districtLabel: string;
  ward: string;
  latitude: number;
  longitude: number;
  streetName: string;
  priceMultiplier: number;
  rentMultiplier: number;
  areaOffset: number;
};

type ListingBlueprint = {
  titlePrefix: string;
  titleSuffix: string;
  summary: string;
  targetAudience: string;
  featureNames: string[];
  postType: PostType;
  propertyType: PropertyType;
  baseArea: number;
  basePrice: number;
};

type ImagePoolEntry = {
  caption: string;
  imageUrl: string;
};

const imageUrl = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const seedUsers: SeedUserProfile[] = [
  {
    email: adminEmail,
    fullName: "Nguyễn Hoàng Phúc",
    phone: "0900000001",
    avatarUrl: "https://i.pravatar.cc/300?img=12",
    role: UserRole.ADMIN,
  },
  {
    email: "nguyen.minh.khang@realestate.local",
    fullName: "Nguyễn Minh Khang",
    phone: "0900000002",
    avatarUrl: "https://i.pravatar.cc/300?img=32",
  },
  {
    email: "tran.gia.han@realestate.local",
    fullName: "Trần Gia Hân",
    phone: "0900000003",
    avatarUrl: "https://i.pravatar.cc/300?img=41",
  },
  {
    email: "le.hoang.nam@realestate.local",
    fullName: "Lê Hoàng Nam",
    phone: "0900000004",
    avatarUrl: "https://i.pravatar.cc/300?img=52",
  },
  {
    email: "pham.thu.uyen@realestate.local",
    fullName: "Phạm Thu Uyên",
    phone: "0900000005",
    avatarUrl: "https://i.pravatar.cc/300?img=29",
  },
  {
    email: "vo.tuan.anh@realestate.local",
    fullName: "Võ Tuấn Anh",
    phone: "0900000006",
    avatarUrl: "https://i.pravatar.cc/300?img=57",
  },
  {
    email: "do.khanh.linh@realestate.local",
    fullName: "Đỗ Khánh Linh",
    phone: "0900000007",
    avatarUrl: "https://i.pravatar.cc/300?img=15",
  },
  {
    email: "bui.quoc.dat@realestate.local",
    fullName: "Bùi Quốc Đạt",
    phone: "0900000008",
    avatarUrl: "https://i.pravatar.cc/300?img=11",
  },
  {
    email: "dang.hai.yen@realestate.local",
    fullName: "Đặng Hải Yến",
    phone: "0900000009",
    avatarUrl: "https://i.pravatar.cc/300?img=47",
  },
  {
    email: "hoang.duc.long@realestate.local",
    fullName: "Hoàng Đức Long",
    phone: "0900000010",
    avatarUrl: "https://i.pravatar.cc/300?img=59",
  },
  {
    email: "vu.ngoc.mai@realestate.local",
    fullName: "Vũ Ngọc Mai",
    phone: "0900000011",
    avatarUrl: "https://i.pravatar.cc/300?img=24",
  },
  {
    email: "phan.bao.chau@realestate.local",
    fullName: "Phan Bảo Châu",
    phone: "0900000012",
    avatarUrl: "https://i.pravatar.cc/300?img=63",
  },
  {
    email: "nguyen.thanh.tung@realestate.local",
    fullName: "Nguyễn Thành Tùng",
    phone: "0900000013",
    avatarUrl: "https://i.pravatar.cc/300?img=64",
  },
  {
    email: "le.thanh.truc@realestate.local",
    fullName: "Lê Thanh Trúc",
    phone: "0900000014",
    avatarUrl: "https://i.pravatar.cc/300?img=65",
  },
  {
    email: "tran.quynh.nhu@realestate.local",
    fullName: "Trần Quỳnh Như",
    phone: "0900000015",
    avatarUrl: "https://i.pravatar.cc/300?img=66",
  },
  {
    email: "pham.tien.dat@realestate.local",
    fullName: "Phạm Tiến Đạt",
    phone: "0900000016",
    avatarUrl: "https://i.pravatar.cc/300?img=67",
  },
  {
    email: "vo.minh.chau@realestate.local",
    fullName: "Võ Minh Châu",
    phone: "0900000017",
    avatarUrl: "https://i.pravatar.cc/300?img=68",
  },
  {
    email: "bui.thuy.linh@realestate.local",
    fullName: "Bùi Thùy Linh",
    phone: "0900000018",
    avatarUrl: "https://i.pravatar.cc/300?img=69",
  },
  {
    email: "dang.gia.khiem@realestate.local",
    fullName: "Đặng Gia Khiêm",
    phone: "0900000019",
    avatarUrl: "https://i.pravatar.cc/300?img=70",
  },
  {
    email: "ho.ngoc.thao@realestate.local",
    fullName: "Hồ Ngọc Thảo",
    phone: "0900000020",
    avatarUrl: "https://i.pravatar.cc/300?img=71",
  },
  {
    email: "do.duc.huy@realestate.local",
    fullName: "Đỗ Đức Huy",
    phone: "0900000021",
    avatarUrl: "https://i.pravatar.cc/300?img=72",
  },
];

const locationProfiles: LocationProfile[] = [
  { city: "Hà Nội", district: "Quận Hoàn Kiếm", districtLabel: "Hoàn Kiếm", ward: "Phường Tràng Tiền", latitude: 21.0285, longitude: 105.8542, streetName: "Phố Tràng Tiền", priceMultiplier: 1.22, rentMultiplier: 1.2, areaOffset: 6 },
  { city: "Thành phố Hồ Chí Minh", district: "Quận 1", districtLabel: "Quận 1", ward: "Phường Bến Nghé", latitude: 10.7769, longitude: 106.7009, streetName: "Đường Nguyễn Huệ", priceMultiplier: 1.28, rentMultiplier: 1.25, areaOffset: 8 },
  { city: "Hải Phòng", district: "Quận Ngô Quyền", districtLabel: "Ngô Quyền", ward: "Phường Lạch Tray", latitude: 20.8449, longitude: 106.6881, streetName: "Đường Lạch Tray", priceMultiplier: 1.06, rentMultiplier: 1.02, areaOffset: 4 },
  { city: "Huế", district: "Quận Thuận Hóa", districtLabel: "Thuận Hóa", ward: "Phường Phú Hội", latitude: 16.4637, longitude: 107.5909, streetName: "Đường Hùng Vương", priceMultiplier: 1.02, rentMultiplier: 0.98, areaOffset: 3 },
  { city: "Đà Nẵng", district: "Quận Hải Châu", districtLabel: "Hải Châu", ward: "Phường Hải Châu I", latitude: 16.0544, longitude: 108.2022, streetName: "Đường Bạch Đằng", priceMultiplier: 1.12, rentMultiplier: 1.1, areaOffset: 4 },
  { city: "Cần Thơ", district: "Quận Ninh Kiều", districtLabel: "Ninh Kiều", ward: "Phường An Khánh", latitude: 10.0452, longitude: 105.7469, streetName: "Đường 30 Tháng 4", priceMultiplier: 0.96, rentMultiplier: 0.95, areaOffset: 2 },
  { city: "Lào Cai", district: "Thành phố Lào Cai", districtLabel: "TP. Lào Cai", ward: "Phường Kim Tân", latitude: 22.4856, longitude: 103.9755, streetName: "Đường Hoàng Liên", priceMultiplier: 0.94, rentMultiplier: 0.9, areaOffset: 2 },
  { city: "Thái Nguyên", district: "Thành phố Thái Nguyên", districtLabel: "TP. Thái Nguyên", ward: "Phường Hoàng Văn Thụ", latitude: 21.5942, longitude: 105.8482, streetName: "Đường Hoàng Văn Thụ", priceMultiplier: 0.97, rentMultiplier: 0.94, areaOffset: 2 },
  { city: "Phú Thọ", district: "Thành phố Việt Trì", districtLabel: "Việt Trì", ward: "Phường Nông Trang", latitude: 21.3227, longitude: 105.4019, streetName: "Đường Hùng Vương", priceMultiplier: 0.95, rentMultiplier: 0.92, areaOffset: 2 },
  { city: "Bắc Ninh", district: "Thành phố Bắc Ninh", districtLabel: "TP. Bắc Ninh", ward: "Phường Suối Hoa", latitude: 21.1861, longitude: 106.0763, streetName: "Đường Lý Thái Tổ", priceMultiplier: 1.05, rentMultiplier: 1.01, areaOffset: 3 },
  { city: "Hưng Yên", district: "Thành phố Hưng Yên", districtLabel: "TP. Hưng Yên", ward: "Phường Hiến Nam", latitude: 20.6464, longitude: 106.0511, streetName: "Đường Điện Biên", priceMultiplier: 0.98, rentMultiplier: 0.93, areaOffset: 2 },
  { city: "Ninh Bình", district: "Thành phố Ninh Bình", districtLabel: "TP. Ninh Bình", ward: "Phường Đông Thành", latitude: 20.2506, longitude: 105.9745, streetName: "Đường Trần Hưng Đạo", priceMultiplier: 1.01, rentMultiplier: 0.96, areaOffset: 2 },
  { city: "Quảng Trị", district: "Thành phố Đông Hà", districtLabel: "Đông Hà", ward: "Phường 1", latitude: 16.7403, longitude: 107.1855, streetName: "Đường Lê Duẩn", priceMultiplier: 0.9, rentMultiplier: 0.88, areaOffset: 1 },
  { city: "Quảng Ngãi", district: "Thành phố Quảng Ngãi", districtLabel: "TP. Quảng Ngãi", ward: "Phường Nghĩa Chánh", latitude: 15.1205, longitude: 108.7923, streetName: "Đường Phạm Văn Đồng", priceMultiplier: 0.93, rentMultiplier: 0.9, areaOffset: 1 },
  { city: "Gia Lai", district: "Thành phố Pleiku", districtLabel: "Pleiku", ward: "Phường Hoa Lư", latitude: 13.9833, longitude: 108, streetName: "Đường Hùng Vương", priceMultiplier: 0.92, rentMultiplier: 0.89, areaOffset: 2 },
  { city: "Khánh Hòa", district: "Thành phố Nha Trang", districtLabel: "Nha Trang", ward: "Phường Lộc Thọ", latitude: 12.2388, longitude: 109.1967, streetName: "Đường Trần Phú", priceMultiplier: 1.08, rentMultiplier: 1.04, areaOffset: 3 },
  { city: "Lâm Đồng", district: "Thành phố Đà Lạt", districtLabel: "Đà Lạt", ward: "Phường 10", latitude: 11.9404, longitude: 108.4583, streetName: "Đường Trần Quốc Toản", priceMultiplier: 1.03, rentMultiplier: 0.99, areaOffset: 2 },
  { city: "Đắk Lắk", district: "Thành phố Buôn Ma Thuột", districtLabel: "Buôn Ma Thuột", ward: "Phường Tân An", latitude: 12.6664, longitude: 108.0372, streetName: "Đường Nguyễn Tất Thành", priceMultiplier: 0.94, rentMultiplier: 0.9, areaOffset: 2 },
  { city: "Đồng Nai", district: "Thành phố Biên Hòa", districtLabel: "Biên Hòa", ward: "Phường Tân Tiến", latitude: 10.9574, longitude: 106.8426, streetName: "Đường Đồng Khởi", priceMultiplier: 1.09, rentMultiplier: 1.04, areaOffset: 4 },
  { city: "Tây Ninh", district: "Thành phố Tây Ninh", districtLabel: "TP. Tây Ninh", ward: "Phường 3", latitude: 11.3104, longitude: 106.0983, streetName: "Đường Cách Mạng Tháng 8", priceMultiplier: 0.95, rentMultiplier: 0.91, areaOffset: 2 },
  { city: "Vĩnh Long", district: "Thành phố Vĩnh Long", districtLabel: "TP. Vĩnh Long", ward: "Phường 1", latitude: 10.2537, longitude: 105.9722, streetName: "Đường Phạm Thái Bường", priceMultiplier: 0.9, rentMultiplier: 0.87, areaOffset: 1 },
  { city: "Đồng Tháp", district: "Thành phố Cao Lãnh", districtLabel: "Cao Lãnh", ward: "Phường 1", latitude: 10.4672, longitude: 105.636, streetName: "Đường Lý Thường Kiệt", priceMultiplier: 0.89, rentMultiplier: 0.86, areaOffset: 1 },
  { city: "Cà Mau", district: "Thành phố Cà Mau", districtLabel: "TP. Cà Mau", ward: "Phường 5", latitude: 9.1769, longitude: 105.1524, streetName: "Đường Trần Hưng Đạo", priceMultiplier: 0.88, rentMultiplier: 0.85, areaOffset: 1 },
  { city: "An Giang", district: "Thành phố Long Xuyên", districtLabel: "Long Xuyên", ward: "Phường Mỹ Bình", latitude: 10.5216, longitude: 105.1259, streetName: "Đường Trần Hưng Đạo", priceMultiplier: 0.92, rentMultiplier: 0.89, areaOffset: 2 },
  { city: "Tuyên Quang", district: "Thành phố Tuyên Quang", districtLabel: "TP. Tuyên Quang", ward: "Phường Phan Thiết", latitude: 21.8239, longitude: 105.214, streetName: "Đường Bình Thuận", priceMultiplier: 0.9, rentMultiplier: 0.87, areaOffset: 1 },
  { city: "Cao Bằng", district: "Thành phố Cao Bằng", districtLabel: "TP. Cao Bằng", ward: "Phường Sông Bằng", latitude: 22.6657, longitude: 106.257, streetName: "Đường Kim Đồng", priceMultiplier: 0.9, rentMultiplier: 0.86, areaOffset: 1 },
  { city: "Điện Biên", district: "Thành phố Điện Biên Phủ", districtLabel: "Điện Biên Phủ", ward: "Phường Mường Thanh", latitude: 21.3847, longitude: 103.023, streetName: "Đường Võ Nguyên Giáp", priceMultiplier: 0.88, rentMultiplier: 0.84, areaOffset: 1 },
  { city: "Hà Tĩnh", district: "Thành phố Hà Tĩnh", districtLabel: "TP. Hà Tĩnh", ward: "Phường Nguyễn Du", latitude: 18.3428, longitude: 105.9057, streetName: "Đường Hà Huy Tập", priceMultiplier: 0.91, rentMultiplier: 0.88, areaOffset: 1 },
  { city: "Lai Châu", district: "Thành phố Lai Châu", districtLabel: "TP. Lai Châu", ward: "Phường Tân Phong", latitude: 22.3964, longitude: 103.4707, streetName: "Đường Trần Phú", priceMultiplier: 0.87, rentMultiplier: 0.83, areaOffset: 1 },
  { city: "Lạng Sơn", district: "Thành phố Lạng Sơn", districtLabel: "TP. Lạng Sơn", ward: "Phường Vĩnh Trại", latitude: 21.8537, longitude: 106.761, streetName: "Đường Hùng Vương", priceMultiplier: 0.92, rentMultiplier: 0.88, areaOffset: 1 },
  { city: "Nghệ An", district: "Thành phố Vinh", districtLabel: "Vinh", ward: "Phường Hưng Bình", latitude: 18.6796, longitude: 105.6813, streetName: "Đường Lê Mao", priceMultiplier: 0.97, rentMultiplier: 0.93, areaOffset: 2 },
  { city: "Quảng Ninh", district: "Thành phố Hạ Long", districtLabel: "Hạ Long", ward: "Phường Bãi Cháy", latitude: 20.9516, longitude: 107.08, streetName: "Đường Hạ Long", priceMultiplier: 1.04, rentMultiplier: 1, areaOffset: 2 },
  { city: "Sơn La", district: "Thành phố Sơn La", districtLabel: "TP. Sơn La", ward: "Phường Quyết Tâm", latitude: 21.328, longitude: 103.9144, streetName: "Đường Chu Văn Thịnh", priceMultiplier: 0.88, rentMultiplier: 0.84, areaOffset: 1 },
  { city: "Thanh Hóa", district: "Thành phố Thanh Hóa", districtLabel: "TP. Thanh Hóa", ward: "Phường Điện Biên", latitude: 19.8067, longitude: 105.7852, streetName: "Đường Lê Lợi", priceMultiplier: 0.98, rentMultiplier: 0.94, areaOffset: 2 },
];

const listingBlueprints: ListingBlueprint[] = [
  {
    titlePrefix: "Nhà phố sân thượng",
    titleSuffix: "phù hợp ở gia đình",
    summary:
      "Nhà phố hoàn thiện nội thất cơ bản, thiết kế thông thoáng, không gian sinh hoạt chia khu hợp lý và có thể vào ở ngay.",
    targetAudience: "gia đình trẻ hoặc người mua ở thực lâu dài",
    featureNames: [
      "Bảo vệ 24/7",
      "Bãi đỗ xe ô tô",
      "Sân thượng / Rooftop",
      "Sổ đỏ / Sổ hồng sẵn sàng",
      "Hẻm xe hơi",
      "Gần trường học",
      "Gần chợ",
    ],
    postType: PostType.SELL,
    propertyType: PropertyType.HOUSE,
    baseArea: 118,
    basePrice: 4200000000,
  },
  {
    titlePrefix: "Căn hộ 2PN full nội thất",
    titleSuffix: "gần trung tâm",
    summary:
      "Căn hộ hai phòng ngủ có ban công, logia và đầy đủ nội thất thiết yếu, phù hợp ở ngay hoặc cho thuê ổn định.",
    targetAudience: "chuyên gia trẻ, gia đình nhỏ hoặc nhà đầu tư cho thuê",
    featureNames: [
      "Ban công",
      "Logia phơi đồ",
      "Đầy đủ nội thất",
      "Điều hòa nhiệt độ",
      "Bể bơi",
      "Thang máy",
      "Phòng gym",
      "Hầm để xe",
      "Gần trung tâm thương mại",
    ],
    postType: PostType.RENT,
    propertyType: PropertyType.APARTMENT,
    baseArea: 72,
    basePrice: 18000000,
  },
  {
    titlePrefix: "Studio có gác lửng",
    titleSuffix: "phù hợp sinh viên",
    summary:
      "Studio gọn gàng, tối ưu diện tích sử dụng, có khu bếp riêng và tiện cho sinh hoạt hằng ngày.",
    targetAudience: "sinh viên, người độc thân hoặc nhân sự mới đi làm",
    featureNames: [
      "Wifi / Internet",
      "Chỗ đỗ xe máy",
      "Bếp riêng",
      "Không chung chủ",
      "Giờ giấc tự do",
      "Phù hợp sinh viên",
      "Gần trường học",
    ],
    postType: PostType.RENT,
    propertyType: PropertyType.ROOM,
    baseArea: 30,
    basePrice: 7000000,
  },
  {
    titlePrefix: "Biệt thự sân vườn",
    titleSuffix: "view thoáng, pháp lý rõ",
    summary:
      "Biệt thự diện tích lớn, sân vườn riêng, nội thất cao cấp và không gian phù hợp nghỉ dưỡng hoặc ở lâu dài.",
    targetAudience: "gia đình đa thế hệ, khách cần không gian rộng hoặc nghỉ dưỡng cuối tuần",
    featureNames: [
      "Sân vườn / Cảnh quan",
      "Bể bơi",
      "Smart home",
      "Camera an ninh",
      "Bãi đỗ xe ô tô",
      "Sổ riêng",
      "Không tranh chấp",
      "View sông / hồ",
    ],
    postType: PostType.SELL,
    propertyType: PropertyType.VILLA,
    baseArea: 285,
    basePrice: 18500000000,
  },
  {
    titlePrefix: "Văn phòng sàn thương mại",
    titleSuffix: "đầy đủ hạ tầng làm việc",
    summary:
      "Mặt bằng văn phòng có hạ tầng vận hành đồng bộ, dễ bố trí không gian làm việc và tiếp khách.",
    targetAudience: "doanh nghiệp vừa và nhỏ, startup hoặc văn phòng đại diện",
    featureNames: [
      "Wifi / Internet",
      "Điều hòa nhiệt độ",
      "Thang máy",
      "Hầm để xe",
      "Máy phát điện dự phòng",
      "PCCC đầy đủ",
      "Camera an ninh",
      "Được kinh doanh",
    ],
    postType: PostType.RENT,
    propertyType: PropertyType.OFFICE,
    baseArea: 140,
    basePrice: 32000000,
  },
  {
    titlePrefix: "Lô đất thổ cư",
    titleSuffix: "quy hoạch rõ ràng",
    summary:
      "Đất nền vuông vắn, mặt tiền dễ tiếp cận, phù hợp xây ở hoặc đầu tư trung hạn.",
    targetAudience: "người mua xây nhà, tích sản hoặc đầu tư đất nền",
    featureNames: [
      "Đất thổ cư 100%",
      "Sổ riêng",
      "Quy hoạch rõ ràng",
      "Không tranh chấp",
      "Mặt tiền đường chính",
      "Gần chợ",
      "Gần trường học",
    ],
    postType: PostType.SELL,
    propertyType: PropertyType.LAND,
    baseArea: 96,
    basePrice: 2400000000,
  },
  {
    titlePrefix: "Shophouse mặt tiền",
    titleSuffix: "khai thác kinh doanh tốt",
    summary:
      "Shophouse nằm trên trục thương mại, dễ nhận diện, phù hợp kết hợp kinh doanh và giữ tài sản.",
    targetAudience: "chủ kinh doanh, nhà đầu tư khai thác dòng tiền hoặc mua giữ tài sản",
    featureNames: [
      "Mặt tiền đường chính",
      "Hai mặt tiền",
      "Được kinh doanh",
      "Bãi đỗ xe ô tô",
      "Gần trung tâm thương mại",
      "Sổ riêng",
      "Đã hoàn công",
    ],
    postType: PostType.SELL,
    propertyType: PropertyType.SHOPHOUSE,
    baseArea: 128,
    basePrice: 9600000000,
  },
  {
    titlePrefix: "Kho xưởng có sân bãi",
    titleSuffix: "phù hợp lưu kho hoặc logistics",
    summary:
      "Kho xưởng cao ráo, mặt bằng rộng và luồng xe ra vào thuận lợi cho hoạt động lưu kho hoặc logistics.",
    targetAudience: "doanh nghiệp vận hành kho, sản xuất nhỏ hoặc trung tâm phân phối",
    featureNames: [
      "Đường container vào được",
      "PCCC đầy đủ",
      "Máy phát điện dự phòng",
      "Bãi đỗ xe ô tô",
      "Camera an ninh",
      "Hai mặt tiền",
      "Không tranh chấp",
    ],
    postType: PostType.RENT,
    propertyType: PropertyType.WAREHOUSE,
    baseArea: 420,
    basePrice: 58000000,
  },
  {
    titlePrefix: "Nhà nguyên căn cho thuê",
    titleSuffix: "ở gia đình hoặc nhóm chuyên gia",
    summary:
      "Nhà nguyên căn có nhiều phòng, bếp riêng và không gian sinh hoạt thoải mái cho nhu cầu thuê dài hạn.",
    targetAudience: "gia đình, nhóm chuyên gia hoặc khách thuê ổn định lâu dài",
    featureNames: [
      "Bếp riêng",
      "Ban công",
      "Chỗ đỗ xe máy",
      "Điều hòa nhiệt độ",
      "Rèm cửa",
      "Gần chợ",
      "Gần bệnh viện",
    ],
    postType: PostType.RENT,
    propertyType: PropertyType.HOUSE,
    baseArea: 92,
    basePrice: 22000000,
  },
  {
    titlePrefix: "Căn hộ cao tầng",
    titleSuffix: "view đẹp, tiện ích tốt",
    summary:
      "Căn hộ tầng cao, ánh sáng tốt, bố cục dễ ở và có bộ tiện ích nội khu phù hợp ở thực lâu dài.",
    targetAudience: "người mua ở thực, gia đình trẻ hoặc nhà đầu tư trung hạn",
    featureNames: [
      "Ban công",
      "Đầy đủ nội thất",
      "Máy giặt",
      "Tủ lạnh",
      "Bảo vệ 24/7",
      "Thang máy",
      "Phòng gym",
      "Công viên nội khu",
      "View sông / hồ",
    ],
    postType: PostType.SELL,
    propertyType: PropertyType.APARTMENT,
    baseArea: 84,
    basePrice: 3650000000,
  },
];

const listingVariantLabels = [
  "phiên bản tiêu chuẩn",
  "phiên bản nâng cấp",
] as const;

const legacyNearbyLandmarks = [
  "thuận tiện di chuyển đến chợ dân sinh và trường học",
  "cách trục thương mại chính chỉ vài phút đi xe",
  "dễ kết nối ra tuyến đường lớn và khu dịch vụ",
  "phù hợp nhu cầu ở thực lẫn khai thác lâu dài",
  "xung quanh có đầy đủ cửa hàng tiện lợi và dịch vụ hằng ngày",
  "nằm trong khu dân cư ổn định, hạ tầng hoàn thiện",
] as const;

const legacyAddressFormats = [
  (streetNumber: number, streetName: string) => `${streetNumber} ${streetName}`,
  (streetNumber: number, streetName: string) => `${streetNumber}/${(streetNumber % 9) + 1} ${streetName}`,
  (streetNumber: number, streetName: string) => `Lô ${streetNumber}, ${streetName}`,
] as const;

const featurePoolByType: Record<PropertyType, ImagePoolEntry[]> = {
  [PropertyType.HOUSE]: [
    { caption: "Mặt tiền nhà", imageUrl: imageUrl("photo-1568605114967-8130f3a36994") },
    { caption: "Phòng khách", imageUrl: imageUrl("photo-1570129477492-45c003edd2be") },
    { caption: "Không gian bếp", imageUrl: imageUrl("photo-1560185007-c5ca9d2c014d") },
    { caption: "Cầu thang và sảnh", imageUrl: imageUrl("photo-1600585153490-76fb20a32601") },
    { caption: "Phòng ngủ chính", imageUrl: imageUrl("photo-1505693416388-ac5ce068fe85") },
    { caption: "Sân thượng", imageUrl: imageUrl("photo-1512917774080-9991f1c4c750") },
  ],
  [PropertyType.APARTMENT]: [
    { caption: "Phòng khách căn hộ", imageUrl: imageUrl("photo-1502672260266-1c1ef2d93688") },
    { caption: "Phòng bếp hiện đại", imageUrl: imageUrl("photo-1494526585095-c41746248156") },
    { caption: "Ban công", imageUrl: imageUrl("photo-1484154218962-a197022b5858") },
    { caption: "Phòng ngủ", imageUrl: imageUrl("photo-1502005097973-6a7082348e28") },
    { caption: "Góc làm việc", imageUrl: imageUrl("photo-1505693416388-ac5ce068fe85") },
    { caption: "Sảnh chung cư", imageUrl: imageUrl("photo-1460317442991-0ec209397118") },
  ],
  [PropertyType.ROOM]: [
    { caption: "Không gian phòng", imageUrl: imageUrl("photo-1505693416388-ac5ce068fe85") },
    { caption: "Góc học tập", imageUrl: imageUrl("photo-1484154218962-a197022b5858") },
    { caption: "Kệ bếp nhỏ", imageUrl: imageUrl("photo-1494526585095-c41746248156") },
    { caption: "Khu ngủ nghỉ", imageUrl: imageUrl("photo-1502672260266-1c1ef2d93688") },
    { caption: "WC riêng", imageUrl: imageUrl("photo-1620626011761-996317b8d101") },
    { caption: "Lối vào phòng", imageUrl: imageUrl("photo-1505693416388-ac5ce068fe85") },
  ],
  [PropertyType.VILLA]: [
    { caption: "Sân vườn", imageUrl: imageUrl("photo-1613977257363-707ba9348227") },
    { caption: "Phòng khách lớn", imageUrl: imageUrl("photo-1600585154526-990dced4db0d") },
    { caption: "Khu hồ bơi", imageUrl: imageUrl("photo-1511818966892-d7d671e672a2") },
    { caption: "Phòng ngủ master", imageUrl: imageUrl("photo-1616594039964-0d0c5d7f0d7f") },
    { caption: "Khu bếp cao cấp", imageUrl: imageUrl("photo-1600607687939-ce8a6c25118c") },
    { caption: "Lối vào biệt thự", imageUrl: imageUrl("photo-1605146769289-440113cc3d00") },
  ],
  [PropertyType.OFFICE]: [
    { caption: "Không gian làm việc", imageUrl: imageUrl("photo-1497366754035-f200968a6e72") },
    { caption: "Khu tiếp khách", imageUrl: imageUrl("photo-1497366216548-37526070297c") },
    { caption: "Phòng họp", imageUrl: imageUrl("photo-1497366412874-3415097a27e7") },
    { caption: "Sảnh tòa nhà", imageUrl: imageUrl("photo-1504384308090-c894fdcc538d") },
    { caption: "Góc pantry", imageUrl: imageUrl("photo-1524758631624-e2822e304c36") },
    { caption: "Mặt sàn văn phòng", imageUrl: imageUrl("photo-1524758631624-e2822e304c36") },
  ],
  [PropertyType.LAND]: [
    { caption: "Toàn cảnh lô đất", imageUrl: imageUrl("photo-1500382017468-9049fed747ef") },
    { caption: "Mặt đường trước đất", imageUrl: imageUrl("photo-1448630360428-65456885c650") },
    { caption: "Góc nhìn từ xa", imageUrl: imageUrl("photo-1470770841072-f978cf4d019e") },
    { caption: "Ranh giới khu đất", imageUrl: imageUrl("photo-1500530855697-b586d89ba3ee") },
    { caption: "Hiện trạng khu vực", imageUrl: imageUrl("photo-1460661419201-fd4cecdf8a8b") },
    { caption: "Lối tiếp cận", imageUrl: imageUrl("photo-1433086966358-54859d0ed716") },
  ],
  [PropertyType.SHOPHOUSE]: [
    { caption: "Mặt tiền shophouse", imageUrl: imageUrl("photo-1486406146926-c627a92ad1ab") },
    { caption: "Mặt bằng tầng trệt", imageUrl: imageUrl("photo-1554995207-c18c203602cb") },
    { caption: "Khu kinh doanh", imageUrl: imageUrl("photo-1517502884422-41eaead166d4") },
    { caption: "Vỉa hè trước nhà", imageUrl: imageUrl("photo-1473448912268-2022ce9509d8") },
    { caption: "Không gian bên trong", imageUrl: imageUrl("photo-1497366811353-6870744d04b2") },
    { caption: "Khu vực trưng bày", imageUrl: imageUrl("photo-1517048676732-d65bc937f952") },
  ],
  [PropertyType.WAREHOUSE]: [
    { caption: "Khu kho", imageUrl: imageUrl("photo-1513828583688-c52646db42da") },
    { caption: "Bãi xe", imageUrl: imageUrl("photo-1586528116311-ad8dd3c8310d") },
    { caption: "Cửa kho", imageUrl: imageUrl("photo-1553413077-190dd305871c") },
    { caption: "Không gian chứa hàng", imageUrl: imageUrl("photo-1581092918484-8313d9ac5d69") },
    { caption: "Lối xe container", imageUrl: imageUrl("photo-1519003722824-194d4455a60c") },
    { caption: "Khu văn phòng nhỏ", imageUrl: imageUrl("photo-1497366754035-f200968a6e72") },
  ],
};

const cityImagePoolOverrides: Partial<Record<string, ImagePoolEntry[]>> = {
  "Hà Nội": [
    { caption: "Khu phố trung tâm", imageUrl: imageUrl("photo-1508804185872-d7badad00f7d") },
    { caption: "Không gian nhà ở", imageUrl: imageUrl("photo-1505693416388-ac5ce068fe85") },
    { caption: "Mặt tiền phố", imageUrl: imageUrl("photo-1512917774080-9991f1c4c750") },
    { caption: "Góc sinh hoạt", imageUrl: imageUrl("photo-1484154218962-a197022b5858") },
  ],
  "Thành phố Hồ Chí Minh": [
    { caption: "Không gian căn hộ", imageUrl: imageUrl("photo-1502672260266-1c1ef2d93688") },
    { caption: "Mặt tiền nhà phố", imageUrl: imageUrl("photo-1568605114967-8130f3a36994") },
    { caption: "Nội thất hiện đại", imageUrl: imageUrl("photo-1494526585095-c41746248156") },
    { caption: "Khu dân cư", imageUrl: imageUrl("photo-1600585154526-990dced4db0d") },
  ],
  "Đà Nẵng": [
    { caption: "Căn hộ gần biển", imageUrl: imageUrl("photo-1494526585095-c41746248156") },
    { caption: "Biệt thự ven biển", imageUrl: imageUrl("photo-1613977257363-707ba9348227") },
    { caption: "Mặt tiền thương mại", imageUrl: imageUrl("photo-1486406146926-c627a92ad1ab") },
    { caption: "Không gian sống", imageUrl: imageUrl("photo-1502005097973-6a7082348e28") },
  ],
  "Huế": [
    { caption: "Nhà vườn yên tĩnh", imageUrl: imageUrl("photo-1600585154526-990dced4db0d") },
    { caption: "Phòng khách sáng", imageUrl: imageUrl("photo-1570129477492-45c003edd2be") },
    { caption: "Khu sân trước", imageUrl: imageUrl("photo-1613977257363-707ba9348227") },
  ],
  "Hải Phòng": [
    { caption: "Nhà phố khu cảng", imageUrl: imageUrl("photo-1568605114967-8130f3a36994") },
    { caption: "Mặt bằng kinh doanh", imageUrl: imageUrl("photo-1554995207-c18c203602cb") },
    { caption: "Không gian nội thất", imageUrl: imageUrl("photo-1505693416388-ac5ce068fe85") },
  ],
  "Cần Thơ": [
    { caption: "Nhà gần sông", imageUrl: imageUrl("photo-1512917774080-9991f1c4c750") },
    { caption: "Góc bếp và bàn ăn", imageUrl: imageUrl("photo-1484154218962-a197022b5858") },
    { caption: "Khu trước nhà", imageUrl: imageUrl("photo-1560185007-c5ca9d2c014d") },
  ],
  "Khánh Hòa": [
    { caption: "Căn hộ hướng biển", imageUrl: imageUrl("photo-1494526585095-c41746248156") },
    { caption: "Ban công view thoáng", imageUrl: imageUrl("photo-1484154218962-a197022b5858") },
    { caption: "Không gian nghỉ dưỡng", imageUrl: imageUrl("photo-1600585154526-990dced4db0d") },
  ],
  "Lâm Đồng": [
    { caption: "Biệt thự đồi thông", imageUrl: imageUrl("photo-1605146769289-440113cc3d00") },
    { caption: "Không gian ấm áp", imageUrl: imageUrl("photo-1505693416388-ac5ce068fe85") },
    { caption: "Sân vườn thoáng", imageUrl: imageUrl("photo-1613977257363-707ba9348227") },
  ],
};

const nearbyLandmarks = [
  "thuận tiện di chuyển đến chợ dân sinh và trường học",
  "cách trục thương mại chính chỉ vài phút đi xe",
  "dễ kết nối ra tuyến đường lớn và khu dịch vụ",
  "phù hợp nhu cầu ở thực lẫn khai thác lâu dài",
  "xung quanh có đầy đủ cửa hàng tiện lợi và dịch vụ hằng ngày",
  "nằm trong khu dân cư ổn định, hạ tầng hoàn thiện",
] as const;

const sellClosingPhrases = [
  "Pháp lý phù hợp để giao dịch trong khung thời gian linh hoạt.",
  "Mức giá đang được đặt theo mặt bằng khu vực và có dư địa thương lượng hợp lý.",
  "Tài sản phù hợp cho người mua ưu tiên khả năng giữ giá lâu dài.",
  "Đây là lựa chọn đáng cân nhắc cho nhu cầu an cư kết hợp tích sản.",
] as const;

const rentClosingPhrases = [
  "Ưu tiên khách thuê ổn định và giữ gìn tài sản lâu dài.",
  "Mức thuê phù hợp cho nhu cầu ở thật hoặc vận hành kinh doanh ổn định.",
  "Chủ nhà hỗ trợ bàn giao nhanh cho khách có nhu cầu vào sử dụng sớm.",
  "Không gian phù hợp để khai thác ngay sau khi nhận bàn giao.",
] as const;

const conditionPhrases = [
  "Hiện trạng nhà và nội thất được giữ gìn khá tốt.",
  "Không gian đã được dọn sẵn, có thể bàn giao nhanh.",
  "Bố cục sử dụng rõ ràng, dễ sắp xếp theo nhu cầu thực tế.",
  "Mặt bằng và công năng phù hợp với nhu cầu sử dụng ổn định lâu dài.",
] as const;

const addressFormats = [
  (streetNumber: number, streetName: string) => `${streetNumber} ${streetName}`,
  (streetNumber: number, streetName: string) => `${streetNumber}/${(streetNumber % 9) + 1} ${streetName}`,
  (streetNumber: number, streetName: string) => `Lô ${streetNumber}, ${streetName}`,
] as const;

const titleStyleSuffixes = ["bản tiêu chuẩn", "bản nâng cấp"] as const;

const accessPhrases = [
  "Kết nối nhanh đến trục di chuyển chính và các tuyến dịch vụ lớn.",
  "Việc di chuyển hàng ngày thuận tiện nhờ hạ tầng xung quanh đã hoàn thiện.",
  "Từ vị trí này có thể tiếp cận nhanh khu mua sắm, trường học và các tiện ích thiết yếu.",
  "Khu vực có khả năng kết nối linh hoạt cho nhu cầu ở thực lẫn khai thác.",
] as const;

const usagePhrases = [
  "Công năng bố trí gọn, dễ tinh chỉnh theo nhu cầu sử dụng thực tế.",
  "Không gian phù hợp cho nhịp sinh hoạt ổn định hoặc vận hành ngay sau khi nhận bàn giao.",
  "Mặt bằng sử dụng cân đối, dễ sinh hoạt và tối ưu chi phí vận hành.",
  "Thiết kế hiện trạng giúp người mua hoặc khách thuê triển khai nhu cầu nhanh hơn.",
] as const;

const neighborhoodPhrases = [
  "Môi trường xung quanh giữ nhịp dân cư, phù hợp ở lâu dài.",
  "Khu lân cận có nhịp sống ổn định và dịch vụ dễ tiếp cận.",
  "Đây là khu vực được nhiều khách tìm kiếm nhờ sự cân bằng giữa vị trí và tiện nghi.",
  "Bối cảnh xung quanh phù hợp cho nhu cầu an cư, khai thác hoặc giữ tài sản trung hạn.",
] as const;

const upsertUser = async (data: Prisma.UserUncheckedCreateInput) =>
  prisma.user.upsert({
    where: { email: data.email },
    update: data,
    create: data,
  });

const upsertPostWithImages = async (
  authorId: string,
  post: SeedPostInput,
  featureNames: string[] = [],
) => {
  const features = await prisma.propertyFeature.findMany({
    where: {
      name: {
        in: featureNames,
      },
    },
    select: { id: true },
  });

  const existingPost = await prisma.propertyPost.findFirst({
    where: {
      authorId,
      title: post.title,
    },
    select: { id: true },
  });

  if (existingPost) {
    await prisma.propertyPost.update({
      where: { id: existingPost.id },
      data: {
        title: post.title,
        description: post.description,
        price: post.price,
        area: post.area,
        address: post.address,
        city: post.city,
        district: post.district,
        ward: post.ward,
        latitude: post.latitude,
        longitude: post.longitude,
        propertyType: post.propertyType,
        postType: post.postType,
        images: {
          deleteMany: {},
          create: post.images,
        },
        features: {
          deleteMany: {},
          create: features.map((f) => ({ featureId: f.id })),
        },
      },
    });

    return;
  }

  await prisma.propertyPost.create({
    data: {
      authorId,
      title: post.title,
      description: post.description,
      price: post.price,
      area: post.area,
      address: post.address,
      city: post.city,
      district: post.district,
      ward: post.ward,
      latitude: post.latitude,
      longitude: post.longitude,
      propertyType: post.propertyType,
      postType: post.postType,
      images: {
        create: post.images,
      },
      features: {
        create: features.map((f) => ({ featureId: f.id })),
      },
    },
  });
};

const getImagesForListing = (
  city: string,
  propertyType: PropertyType,
  postNumber: number,
  variantLabel: string,
) => {
  const cityPool = cityImagePoolOverrides[city];
  const pool =
    cityPool && cityPool.length >= 3 ? cityPool : featurePoolByType[propertyType];
  return Array.from({ length: 3 }, (_, index) => {
    const image = pool[(postNumber + index) % pool.length];
    return {
      caption: index === 0 ? `${image.caption} ${variantLabel}` : image.caption,
      imageUrl: image.imageUrl,
      order: index,
    };
  });
};

const buildListingTitle = (
  blueprint: ListingBlueprint,
  location: LocationProfile,
  postNumber: number,
  variantIndex: number,
) => {
  const streetLabel = location.streetName
    .replace(/^Đường\s+/u, "")
    .replace(/^Phố\s+/u, "");
  const variantSuffix =
    titleStyleSuffixes[variantIndex] ?? titleStyleSuffixes[0];
  const templates = [
    `${blueprint.titlePrefix} tại ${location.districtLabel}, ${location.city} - ${blueprint.titleSuffix}`,
    `${blueprint.titlePrefix} ${location.ward}, ${location.districtLabel} - ${variantSuffix}`,
    `${blueprint.titlePrefix} gần ${streetLabel}, ${location.districtLabel}`,
    `${blueprint.titlePrefix} khu ${location.districtLabel} - ${blueprint.titleSuffix}`,
  ];

  return templates[postNumber % templates.length] ?? templates[0];
};

const buildListingDescription = (
  blueprint: ListingBlueprint,
  location: LocationProfile,
  nearbyLandmark: string,
  conditionPhrase: string,
  closingPhrase: string,
  postNumber: number,
) => {
  const accessPhrase = accessPhrases[postNumber % accessPhrases.length];
  const usagePhrase =
    usagePhrases[(postNumber + 1) % usagePhrases.length];
  const neighborhoodPhrase =
    neighborhoodPhrases[(postNumber + 2) % neighborhoodPhrases.length];

  const templates = [
    `${blueprint.summary} Bất động sản nằm tại ${location.ward}, ${location.districtLabel}, ${location.city}; ${nearbyLandmark}. ${conditionPhrase} ${accessPhrase} Phù hợp cho ${blueprint.targetAudience}. ${closingPhrase}`,
    `${blueprint.summary} Vị trí thuộc ${location.ward}, ${location.districtLabel}, ${location.city}, ${nearbyLandmark}. ${usagePhrase} ${neighborhoodPhrase} Phù hợp cho ${blueprint.targetAudience}. ${closingPhrase}`,
    `${blueprint.summary} Tài sản tọa lạc tại ${location.ward}, ${location.districtLabel}, ${location.city}. ${conditionPhrase} ${accessPhrase} ${neighborhoodPhrase} Phù hợp cho ${blueprint.targetAudience}. ${closingPhrase}`,
    `${blueprint.summary} Khu vực ${location.districtLabel}, ${location.city} có lợi thế ${nearbyLandmark}. ${usagePhrase} ${conditionPhrase} Phù hợp cho ${blueprint.targetAudience}. ${closingPhrase}`,
  ];

  return templates[postNumber % templates.length] ?? templates[0];
};

const createSeedListings = (authorEmails: string[]): SeedListing[] => {
  const listings: SeedListing[] = [];

  for (const [locationIndex, location] of locationProfiles.entries()) {
    for (const [blueprintIndex, blueprint] of listingBlueprints.entries()) {
      for (const [variantIndex, variantLabel] of listingVariantLabels.entries()) {
        const postNumber =
          locationIndex * listingBlueprints.length * listingVariantLabels.length +
          blueprintIndex * listingVariantLabels.length +
          variantIndex +
          1;
        const streetNumber =
          12 + locationIndex * 11 + blueprintIndex * 3 + variantIndex;
        const area =
          blueprint.baseArea +
          location.areaOffset +
          (blueprintIndex % 3) * 4 +
          variantIndex * 6;
        const multiplier =
          blueprint.postType === PostType.SELL
            ? location.priceMultiplier
            : location.rentMultiplier;
        const priceStep =
          blueprint.postType === PostType.SELL
            ? 45_000_000 * blueprintIndex +
              20_000_000 * locationIndex +
              65_000_000 * variantIndex
            : 350_000 * blueprintIndex +
              150_000 * locationIndex +
              450_000 * variantIndex;
        const price = Math.round(blueprint.basePrice * multiplier + priceStep);
        const latitude = Number(
          (location.latitude + blueprintIndex * 0.0017 + variantIndex * 0.0008).toFixed(6),
        );
        const longitude = Number(
          (location.longitude + blueprintIndex * 0.0014 + variantIndex * 0.0007).toFixed(6),
        );
        const addressFormatter =
          addressFormats[(postNumber + blueprintIndex) % addressFormats.length];
        const nearbyLandmark =
          nearbyLandmarks[(postNumber + locationIndex) % nearbyLandmarks.length];
        const conditionPhrase =
          conditionPhrases[(postNumber + variantIndex) % conditionPhrases.length];
        const closingPhrase =
          blueprint.postType === PostType.SELL
            ? sellClosingPhrases[
                (postNumber + blueprintIndex) % sellClosingPhrases.length
              ]
            : rentClosingPhrases[
                (postNumber + blueprintIndex) % rentClosingPhrases.length
              ];
        const title = buildListingTitle(
          blueprint,
          location,
          postNumber,
          variantIndex,
        );
        const description = buildListingDescription(
          blueprint,
          location,
          nearbyLandmark,
          conditionPhrase,
          closingPhrase,
          postNumber,
        );
        const authorEmail =
          authorEmails[postNumber % authorEmails.length] ?? authorEmails[0];

        listings.push({
          authorEmail,
          featureNames: blueprint.featureNames,
          post: {
            title,
            description,
            price,
            area,
            address: addressFormatter(streetNumber, location.streetName),
            city: location.city,
            district: location.districtLabel,
            ward: location.ward,
            latitude,
            longitude,
            propertyType: blueprint.propertyType,
            postType: blueprint.postType,
            images: getImagesForListing(
              location.city,
              blueprint.propertyType,
              postNumber,
              variantLabel,
            ),
          },
        });
      }
    }
  }

  return listings;
};

const main = async () => {
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const users = await Promise.all(
    seedUsers.map((user) =>
      upsertUser({
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role ?? UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    ),
  );

  for (const feature of propertyFeatures) {
    await prisma.propertyFeature.upsert({
      where: { name: feature.name },
      update: feature,
      create: feature,
    });
  }

  const authorIds = new Map(users.map((user) => [user.email, user.id]));
  const authorEmails = seedUsers.map((user) => user.email);
  const seedListings = createSeedListings(authorEmails);

  for (const listing of seedListings) {
    const authorId = authorIds.get(listing.authorEmail);
    if (!authorId) {
      throw new Error(`Missing author for seed listing: ${listing.authorEmail}`);
    }

    await upsertPostWithImages(authorId, listing.post, [...listing.featureNames]);
  }

  console.log(
    `Seed completed successfully with ${users.length} users and ${seedListings.length} sample posts.`,
  );
  console.log(`Admin account: ${adminEmail} / ${seedPassword}`);
  console.log(`Shared password for seeded users: ${seedPassword}`);
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
