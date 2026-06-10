import "dotenv/config";

import bcrypt from "bcryptjs";

import {
  PostStatus,
  PostType,
  PropertyType,
  UserRole,
  UserStatus,
  type Prisma,
} from "@prisma/client";

import { propertyFeatures } from "./data/property-features.js";
import { prisma } from "../src/prisma/prisma.service.js";

const SEED = {
  users: 100,
  posts: 800,
  images: 4_000,
  comments: 1_500,
} as const;

const adminEmail = "admin@realestate.local";
const seedPassword = "12345678";
const passwordRounds = 10;

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

const pad = (value: number, size = 3) => String(value).padStart(size, "0");

const daysAgo = (days: number, plusMinutes = 0) =>
  new Date(now.getTime() - days * dayMs + plusMinutes * 60_000);

const pick = <T>(items: readonly T[], index: number) =>
  items[index % items.length];

const imageUrl = (id: string, width = 1200, sig = "") =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80${
    sig ? `&sig=${sig}` : ""
  }`;

const fullNames = [
  "Nguyễn Minh Khang",
  "Trần Gia Hân",
  "Lê Hoàng Nam",
  "Phạm Thu Uyên",
  "Võ Tuấn Anh",
  "Đỗ Khánh Linh",
  "Bùi Quốc Đạt",
  "Đặng Hải Yến",
  "Hoàng Đức Long",
  "Vũ Ngọc Mai",
  "Phan Bảo Châu",
  "Nguyễn Thành Tùng",
  "Lê Thanh Trúc",
  "Trần Quỳnh Như",
  "Phạm Tiến Đạt",
  "Võ Minh Châu",
  "Bùi Thùy Linh",
  "Đặng Gia Khiêm",
  "Hồ Ngọc Thảo",
  "Đỗ Đức Huy",
  "Nguyễn An Nhiên",
  "Trần Bảo Ngọc",
  "Lê Quốc Bảo",
  "Phạm Gia Bảo",
  "Võ Khánh An",
  "Đỗ Nhật Minh",
  "Bùi Hải Nam",
  "Đặng Phương Anh",
  "Hoàng Minh Châu",
  "Vũ Đức Anh",
  "Phan Nhật Linh",
  "Nguyễn Khánh Vy",
] as const;

const agentNames = [
  "An Phát Land",
  "Minh Tâm Realty",
  "Hưng Thịnh Homes",
  "Sài Gòn Property",
  "Đông Tây Land",
  "Nhà Đẹp 24h",
  "Gia An Real",
  "BlueHome Agency",
  "GreenHouse Việt Nam",
  "Đất Vàng Group",
] as const;

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

const locations: LocationProfile[] = [
  {
    city: "Thành phố Hà Nội",
    district: "Phường Hoàn Kiếm",
    districtLabel: "Hoàn Kiếm",
    ward: "Khu Tràng Tiền",
    latitude: 21.0247,
    longitude: 105.8575,
    streetName: "Phố Tràng Tiền",
    priceMultiplier: 1.38,
    rentMultiplier: 1.3,
    areaOffset: 8,
  },
  {
    city: "Thành phố Hà Nội",
    district: "Phường Ba Đình",
    districtLabel: "Ba Đình",
    ward: "Khu Kim Mã",
    latitude: 21.0328,
    longitude: 105.8236,
    streetName: "Đường Kim Mã",
    priceMultiplier: 1.28,
    rentMultiplier: 1.22,
    areaOffset: 7,
  },
  {
    city: "Thành phố Hà Nội",
    district: "Phường Cầu Giấy",
    districtLabel: "Cầu Giấy",
    ward: "Khu Dịch Vọng",
    latitude: 21.0362,
    longitude: 105.7906,
    streetName: "Đường Cầu Giấy",
    priceMultiplier: 1.2,
    rentMultiplier: 1.16,
    areaOffset: 6,
  },
  {
    city: "Thành phố Hồ Chí Minh",
    district: "Phường Bến Thành",
    districtLabel: "Bến Thành",
    ward: "Khu trung tâm Nguyễn Huệ",
    latitude: 10.7735,
    longitude: 106.7041,
    streetName: "Đường Nguyễn Huệ",
    priceMultiplier: 1.42,
    rentMultiplier: 1.34,
    areaOffset: 9,
  },
  {
    city: "Thành phố Hồ Chí Minh",
    district: "Phường Sài Gòn",
    districtLabel: "Sài Gòn",
    ward: "Khu Đồng Khởi",
    latitude: 10.7761,
    longitude: 106.7034,
    streetName: "Đường Đồng Khởi",
    priceMultiplier: 1.4,
    rentMultiplier: 1.32,
    areaOffset: 9,
  },
  {
    city: "Thành phố Hồ Chí Minh",
    district: "Phường Thảo Điền",
    districtLabel: "Thảo Điền",
    ward: "Khu Nguyễn Văn Hưởng",
    latitude: 10.8012,
    longitude: 106.7308,
    streetName: "Đường Nguyễn Văn Hưởng",
    priceMultiplier: 1.22,
    rentMultiplier: 1.2,
    areaOffset: 7,
  },
  {
    city: "Thành phố Đà Nẵng",
    district: "Phường Hải Châu",
    districtLabel: "Hải Châu",
    ward: "Khu Bạch Đằng",
    latitude: 16.0544,
    longitude: 108.2022,
    streetName: "Đường Bạch Đằng",
    priceMultiplier: 1.14,
    rentMultiplier: 1.1,
    areaOffset: 5,
  },
  {
    city: "Thành phố Đà Nẵng",
    district: "Phường Sơn Trà",
    districtLabel: "Sơn Trà",
    ward: "Khu Võ Nguyên Giáp",
    latitude: 16.0678,
    longitude: 108.2452,
    streetName: "Đường Võ Nguyên Giáp",
    priceMultiplier: 1.16,
    rentMultiplier: 1.12,
    areaOffset: 5,
  },
  {
    city: "Thành phố Hải Phòng",
    district: "Phường Ngô Quyền",
    districtLabel: "Ngô Quyền",
    ward: "Khu Lạch Tray",
    latitude: 20.8449,
    longitude: 106.6881,
    streetName: "Đường Lạch Tray",
    priceMultiplier: 1.05,
    rentMultiplier: 1.02,
    areaOffset: 4,
  },
  {
    city: "Thành phố Cần Thơ",
    district: "Phường Ninh Kiều",
    districtLabel: "Ninh Kiều",
    ward: "Khu An Khánh",
    latitude: 10.0452,
    longitude: 105.7469,
    streetName: "Đường 30 Tháng 4",
    priceMultiplier: 0.96,
    rentMultiplier: 0.94,
    areaOffset: 3,
  },
  {
    city: "Thành phố Hồ Chí Minh",
    district: "Phường Thủ Dầu Một",
    districtLabel: "Thủ Dầu Một",
    ward: "Khu Phú Cường",
    latitude: 10.9804,
    longitude: 106.6519,
    streetName: "Đường Cách Mạng Tháng 8",
    priceMultiplier: 1.02,
    rentMultiplier: 0.98,
    areaOffset: 4,
  },
  {
    city: "Tỉnh Đồng Nai",
    district: "Phường Trấn Biên",
    districtLabel: "Trấn Biên",
    ward: "Khu Đồng Khởi",
    latitude: 10.9574,
    longitude: 106.8426,
    streetName: "Đường Đồng Khởi",
    priceMultiplier: 1.04,
    rentMultiplier: 0.99,
    areaOffset: 4,
  },
  {
    city: "Tỉnh Khánh Hòa",
    district: "Phường Nha Trang",
    districtLabel: "Nha Trang",
    ward: "Khu Trần Phú",
    latitude: 12.2388,
    longitude: 109.1967,
    streetName: "Đường Trần Phú",
    priceMultiplier: 1.08,
    rentMultiplier: 1.04,
    areaOffset: 4,
  },
  {
    city: "Tỉnh Lâm Đồng",
    district: "Phường Đà Lạt",
    districtLabel: "Đà Lạt",
    ward: "Khu Trần Quốc Toản",
    latitude: 11.9404,
    longitude: 108.4583,
    streetName: "Đường Trần Quốc Toản",
    priceMultiplier: 1.02,
    rentMultiplier: 0.98,
    areaOffset: 3,
  },
  {
    city: "Tỉnh Quảng Ninh",
    district: "Phường Hạ Long",
    districtLabel: "Hạ Long",
    ward: "Khu Bãi Cháy",
    latitude: 20.9516,
    longitude: 107.08,
    streetName: "Đường Hạ Long",
    priceMultiplier: 1.07,
    rentMultiplier: 1.01,
    areaOffset: 3,
  },
  {
    city: "Tỉnh Nghệ An",
    district: "Phường Vinh",
    districtLabel: "Vinh",
    ward: "Khu Lê Mao",
    latitude: 18.6796,
    longitude: 105.6813,
    streetName: "Đường Lê Mao",
    priceMultiplier: 0.94,
    rentMultiplier: 0.91,
    areaOffset: 2,
  },
  {
    city: "Tỉnh Thanh Hóa",
    district: "Phường Hạc Thành",
    districtLabel: "Hạc Thành",
    ward: "Khu Lê Lợi",
    latitude: 19.8067,
    longitude: 105.7852,
    streetName: "Đường Lê Lợi",
    priceMultiplier: 0.95,
    rentMultiplier: 0.92,
    areaOffset: 2,
  },
  {
    city: "Tỉnh Bắc Ninh",
    district: "Phường Bắc Ninh",
    districtLabel: "Bắc Ninh",
    ward: "Khu Lý Thái Tổ",
    latitude: 21.1861,
    longitude: 106.0763,
    streetName: "Đường Lý Thái Tổ",
    priceMultiplier: 1.03,
    rentMultiplier: 0.98,
    areaOffset: 3,
  },
  {
    city: "Thành phố Huế",
    district: "Phường Thuận Hóa",
    districtLabel: "Thuận Hóa",
    ward: "Khu Phú Hội",
    latitude: 16.4637,
    longitude: 107.5909,
    streetName: "Đường Hùng Vương",
    priceMultiplier: 0.98,
    rentMultiplier: 0.95,
    areaOffset: 3,
  },
  {
    city: "Tỉnh An Giang",
    district: "Phường Long Xuyên",
    districtLabel: "Long Xuyên",
    ward: "Khu Mỹ Bình",
    latitude: 10.5216,
    longitude: 105.1259,
    streetName: "Đường Trần Hưng Đạo",
    priceMultiplier: 0.9,
    rentMultiplier: 0.86,
    areaOffset: 2,
  },
];

type Blueprint = {
  weight: number;
  propertyType: PropertyType;
  postType: PostType;
  titlePrefix: string;
  titleSuffix: string;
  baseArea: number;
  basePrice: number;
  summary: string;
  targetAudience: string;
  featureNames: string[];
};

const blueprints: Blueprint[] = [
  {
    weight: 30,
    propertyType: PropertyType.APARTMENT,
    postType: PostType.SELL,
    titlePrefix: "Căn hộ cao tầng",
    titleSuffix: "view thoáng, tiện ích đầy đủ",
    baseArea: 78,
    basePrice: 3_400_000_000,
    summary:
      "Căn hộ bố trí gọn, phòng khách sáng, ban công thoáng và tiện ích nội khu đầy đủ.",
    targetAudience: "gia đình trẻ hoặc nhà đầu tư giữ tài sản trung hạn",
    featureNames: [
      "Ban công",
      "Đầy đủ nội thất",
      "Bảo vệ 24/7",
      "Thang máy",
      "Hầm để xe",
      "Phòng gym",
      "Bể bơi",
    ],
  },
  {
    weight: 35,
    propertyType: PropertyType.APARTMENT,
    postType: PostType.RENT,
    titlePrefix: "Căn hộ 2PN full nội thất",
    titleSuffix: "vào ở ngay",
    baseArea: 72,
    basePrice: 17_000_000,
    summary:
      "Căn hộ có sẵn nội thất, logia phơi đồ và không gian sinh hoạt phù hợp thuê dài hạn.",
    targetAudience: "chuyên gia, gia đình nhỏ hoặc nhân sự văn phòng",
    featureNames: [
      "Ban công",
      "Logia phơi đồ",
      "Đầy đủ nội thất",
      "Điều hòa nhiệt độ",
      "Thang máy",
      "Hầm để xe",
    ],
  },
  {
    weight: 25,
    propertyType: PropertyType.HOUSE,
    postType: PostType.SELL,
    titlePrefix: "Nhà phố",
    titleSuffix: "sổ riêng, khu dân cư ổn định",
    baseArea: 96,
    basePrice: 4_600_000_000,
    summary:
      "Nhà phố có kết cấu chắc chắn, không gian sinh hoạt rõ ràng và khu dân cư hiện hữu.",
    targetAudience: "người mua ở thực hoặc tích sản lâu dài",
    featureNames: [
      "Sổ đỏ / Sổ hồng sẵn sàng",
      "Hẻm xe hơi",
      "Gần chợ",
      "Gần trường học",
      "Bãi đỗ xe ô tô",
    ],
  },
  {
    weight: 18,
    propertyType: PropertyType.HOUSE,
    postType: PostType.RENT,
    titlePrefix: "Nhà nguyên căn",
    titleSuffix: "phù hợp gia đình",
    baseArea: 90,
    basePrice: 21_000_000,
    summary:
      "Nhà nguyên căn có nhiều phòng, bếp riêng và không gian sử dụng linh hoạt.",
    targetAudience: "gia đình hoặc nhóm chuyên gia thuê ổn định",
    featureNames: [
      "Bếp riêng",
      "Ban công",
      "Chỗ đỗ xe máy",
      "Điều hòa nhiệt độ",
      "Gần chợ",
    ],
  },
  {
    weight: 20,
    propertyType: PropertyType.ROOM,
    postType: PostType.RENT,
    titlePrefix: "Phòng trọ studio",
    titleSuffix: "giờ giấc tự do",
    baseArea: 28,
    basePrice: 4_800_000,
    summary:
      "Phòng trọ gọn gàng, có khu bếp nhỏ và phù hợp sinh hoạt cá nhân.",
    targetAudience: "sinh viên hoặc người mới đi làm",
    featureNames: [
      "Wifi / Internet",
      "Chỗ đỗ xe máy",
      "Bếp riêng",
      "Không chung chủ",
      "Giờ giấc tự do",
      "Phù hợp sinh viên",
    ],
  },
  {
    weight: 12,
    propertyType: PropertyType.LAND,
    postType: PostType.SELL,
    titlePrefix: "Lô đất thổ cư",
    titleSuffix: "quy hoạch rõ ràng",
    baseArea: 105,
    basePrice: 2_500_000_000,
    summary:
      "Đất nền vuông vắn, mặt tiền dễ tiếp cận và phù hợp xây ở hoặc đầu tư.",
    targetAudience: "người mua xây nhà hoặc đầu tư đất nền",
    featureNames: [
      "Đất thổ cư 100%",
      "Sổ riêng",
      "Quy hoạch rõ ràng",
      "Không tranh chấp",
      "Mặt tiền đường chính",
    ],
  },
  {
    weight: 6,
    propertyType: PropertyType.OFFICE,
    postType: PostType.RENT,
    titlePrefix: "Văn phòng sàn thương mại",
    titleSuffix: "hạ tầng làm việc đầy đủ",
    baseArea: 145,
    basePrice: 34_000_000,
    summary:
      "Sàn văn phòng dễ chia layout, có hạ tầng vận hành ổn định và khu tiếp khách riêng.",
    targetAudience: "doanh nghiệp vừa và nhỏ hoặc văn phòng đại diện",
    featureNames: [
      "Wifi / Internet",
      "Điều hòa nhiệt độ",
      "Thang máy",
      "Hầm để xe",
      "PCCC đầy đủ",
      "Máy phát điện dự phòng",
    ],
  },
  {
    weight: 4,
    propertyType: PropertyType.SHOPHOUSE,
    postType: PostType.SELL,
    titlePrefix: "Shophouse mặt tiền",
    titleSuffix: "khai thác kinh doanh tốt",
    baseArea: 126,
    basePrice: 9_200_000_000,
    summary:
      "Shophouse nằm trên trục thương mại, dễ nhận diện và phù hợp kinh doanh kết hợp giữ tài sản.",
    targetAudience: "chủ kinh doanh hoặc nhà đầu tư khai thác dòng tiền",
    featureNames: [
      "Mặt tiền đường chính",
      "Hai mặt tiền",
      "Được kinh doanh",
      "Bãi đỗ xe ô tô",
      "Sổ riêng",
    ],
  },
  {
    weight: 3,
    propertyType: PropertyType.VILLA,
    postType: PostType.SELL,
    titlePrefix: "Biệt thự sân vườn",
    titleSuffix: "không gian riêng tư",
    baseArea: 285,
    basePrice: 18_500_000_000,
    summary:
      "Biệt thự diện tích lớn, sân vườn riêng và không gian phù hợp nghỉ dưỡng hoặc ở lâu dài.",
    targetAudience: "gia đình đa thế hệ hoặc khách cần không gian rộng",
    featureNames: [
      "Sân vườn / Cảnh quan",
      "Bể bơi",
      "Smart home",
      "Camera an ninh",
      "Bãi đỗ xe ô tô",
      "Sổ riêng",
    ],
  },
  {
    weight: 2,
    propertyType: PropertyType.WAREHOUSE,
    postType: PostType.RENT,
    titlePrefix: "Kho xưởng có sân bãi",
    titleSuffix: "phù hợp logistics",
    baseArea: 430,
    basePrice: 58_000_000,
    summary:
      "Kho xưởng cao ráo, mặt bằng rộng và luồng xe ra vào thuận tiện.",
    targetAudience: "doanh nghiệp vận hành kho hoặc sản xuất nhỏ",
    featureNames: [
      "Đường container vào được",
      "PCCC đầy đủ",
      "Máy phát điện dự phòng",
      "Bãi đỗ xe ô tô",
      "Camera an ninh",
    ],
  },
];

const weightedBlueprints = blueprints.flatMap((item) =>
  Array.from({ length: item.weight }, () => item),
);

const imagePool: Record<PropertyType, { caption: string; id: string }[]> = {
  [PropertyType.HOUSE]: [
    { caption: "Mặt tiền nhà", id: "photo-1568605114967-8130f3a36994" },
    { caption: "Phòng khách", id: "photo-1570129477492-45c003edd2be" },
    { caption: "Không gian bếp", id: "photo-1560185007-c5ca9d2c014d" },
    { caption: "Phòng ngủ", id: "photo-1505693416388-ac5ce068fe85" },
    { caption: "Sân thượng", id: "photo-1512917774080-9991f1c4c750" },
  ],
  [PropertyType.APARTMENT]: [
    { caption: "Phòng khách căn hộ", id: "photo-1502672260266-1c1ef2d93688" },
    { caption: "Bếp căn hộ", id: "photo-1494526585095-c41746248156" },
    { caption: "Ban công", id: "photo-1484154218962-a197022b5858" },
    { caption: "Phòng ngủ", id: "photo-1502005097973-6a7082348e28" },
    { caption: "Sảnh chung cư", id: "photo-1460317442991-0ec209397118" },
  ],
  [PropertyType.ROOM]: [
    { caption: "Không gian phòng", id: "photo-1505693416388-ac5ce068fe85" },
    { caption: "Góc học tập", id: "photo-1484154218962-a197022b5858" },
    { caption: "Bếp nhỏ", id: "photo-1494526585095-c41746248156" },
    { caption: "Khu ngủ nghỉ", id: "photo-1502672260266-1c1ef2d93688" },
    { caption: "WC riêng", id: "photo-1620626011761-996317b8d101" },
  ],
  [PropertyType.VILLA]: [
    { caption: "Sân vườn", id: "photo-1613977257363-707ba9348227" },
    { caption: "Phòng khách lớn", id: "photo-1600585154526-990dced4db0d" },
    { caption: "Hồ bơi", id: "photo-1511818966892-d7d671e672a2" },
    { caption: "Phòng ngủ master", id: "photo-1616594039964-0d0c5d7f0d7f" },
    { caption: "Lối vào biệt thự", id: "photo-1605146769289-440113cc3d00" },
  ],
  [PropertyType.OFFICE]: [
    { caption: "Không gian làm việc", id: "photo-1497366754035-f200968a6e72" },
    { caption: "Khu tiếp khách", id: "photo-1497366216548-37526070297c" },
    { caption: "Phòng họp", id: "photo-1497366412874-3415097a27e7" },
    { caption: "Sảnh tòa nhà", id: "photo-1504384308090-c894fdcc538d" },
    { caption: "Pantry", id: "photo-1524758631624-e2822e304c36" },
  ],
  [PropertyType.LAND]: [
    { caption: "Toàn cảnh lô đất", id: "photo-1500382017468-9049fed747ef" },
    { caption: "Mặt đường trước đất", id: "photo-1448630360428-65456885c650" },
    { caption: "Góc nhìn từ xa", id: "photo-1470770841072-f978cf4d019e" },
    { caption: "Ranh giới khu đất", id: "photo-1500530855697-b586d89ba3ee" },
    { caption: "Hiện trạng khu vực", id: "photo-1460661419201-fd4cecdf8a8b" },
  ],
  [PropertyType.SHOPHOUSE]: [
    { caption: "Mặt tiền shophouse", id: "photo-1486406146926-c627a92ad1ab" },
    { caption: "Mặt bằng tầng trệt", id: "photo-1554995207-c18c203602cb" },
    { caption: "Khu kinh doanh", id: "photo-1517502884422-41eaead166d4" },
    { caption: "Không gian bên trong", id: "photo-1497366811353-6870744d04b2" },
    { caption: "Khu trưng bày", id: "photo-1517048676732-d65bc937f952" },
  ],
  [PropertyType.WAREHOUSE]: [
    { caption: "Khu kho", id: "photo-1513828583688-c52646db42da" },
    { caption: "Bãi xe", id: "photo-1586528116311-ad8dd3c8310d" },
    { caption: "Cửa kho", id: "photo-1553413077-190dd305871c" },
    { caption: "Không gian chứa hàng", id: "photo-1581092918484-8313d9ac5d69" },
    { caption: "Lối xe container", id: "photo-1519003722824-194d4455a60c" },
  ],
};

const addressFormats = [
  (streetNumber: number, streetName: string) => `${streetNumber} ${streetName}`,
  (streetNumber: number, streetName: string) =>
    `${streetNumber}/${(streetNumber % 9) + 1} ${streetName}`,
  (streetNumber: number, streetName: string) => `Lô ${streetNumber}, ${streetName}`,
] as const;

const directions = [
  "Đông",
  "Tây",
  "Nam",
  "Bắc",
  "Đông Nam",
  "Tây Nam",
  "Đông Bắc",
  "Tây Bắc",
] as const;

const legalStatuses = [
  "Sổ hồng riêng",
  "Sổ đỏ",
  "Hợp đồng mua bán",
  "Pháp lý rõ ràng",
  "Đã hoàn công",
] as const;

const furnitureStatuses = [
  "Nhà trống",
  "Nội thất cơ bản",
  "Full nội thất",
  "Có rèm, máy lạnh và tủ bếp",
  "Nội thất mới khoảng 80%",
] as const;

const ownerPhrases = [
  "Chủ cần giao dịch nhanh, có thương lượng cho khách thiện chí.",
  "Ưu tiên khách xem trực tiếp và làm việc rõ ràng.",
  "Miễn tiếp quảng cáo, môi giới vui lòng không làm phiền.",
  "Có thể bàn giao sớm nếu khách chốt trong tháng.",
] as const;

const agentPhrases = [
  "Nguồn hàng khu vực còn vài căn tương tự, hỗ trợ xem nhà linh hoạt.",
  "Hỗ trợ kiểm tra pháp lý và tư vấn quy trình giao dịch.",
  "Khách cần thêm ảnh hoặc video có thể liên hệ để nhận nhanh.",
  "Có hỗ trợ thương lượng trực tiếp với chủ nhà.",
] as const;

const commentContents = [
  "Nhà này còn không anh/chị?",
  "Giá còn thương lượng được không ạ?",
  "Cho em xin thêm ảnh phòng ngủ.",
  "Có hỗ trợ vay ngân hàng không?",
  "Địa chỉ chính xác ở đâu vậy ạ?",
  "Cuối tuần xem nhà được không?",
  "Pháp lý hiện tại như thế nào?",
  "Khu này có bị ngập không?",
  "Có chỗ đậu ô tô không?",
  "Phí quản lý căn hộ bao nhiêu một tháng?",
  "Phòng này có nuôi mèo được không?",
  "Cọc mấy tháng vậy anh/chị?",
] as const;

const replyContents = [
  "Dạ còn, anh/chị có thể nhắn để em gửi thêm thông tin.",
  "Giá vẫn còn thương lượng nhẹ cho khách thiện chí.",
  "Em đã cập nhật thêm ảnh trong bài, anh/chị xem giúp em.",
  "Có thể hẹn xem vào chiều thứ bảy hoặc chủ nhật.",
  "Pháp lý rõ, khi xem trực tiếp em sẽ chuẩn bị bản photo.",
  "Khu này di chuyển khá tiện, giờ cao điểm hơi đông một chút.",
] as const;

const makePostStatus = (index: number) => {
  if (index % 10 === 0) return PostStatus.BANNED;
  if (index % 10 === 1) return PostStatus.HIDDEN;
  return PostStatus.ACTIVE;
};

const makeUserId = (index: number) => `seed-user-${pad(index)}`;
const makePostId = (index: number) => `seed-post-${pad(index)}`;
const makeCommentId = (index: number) => `seed-comment-${pad(index, 4)}`;

const createUsers = async (passwordHash: string) => {
  const users: Prisma.UserCreateManyInput[] = Array.from(
    { length: SEED.users },
    (_, index) => {
      const number = index + 1;
      const isAdmin = number === 1;
      const isAgent = number > 1 && number <= 16;
      const fullName = isAdmin
        ? "Nguyễn Hoàng Phúc"
        : isAgent
          ? pick(agentNames, number)
          : pick(fullNames, number);

      return {
        id: makeUserId(number),
        email: isAdmin
          ? adminEmail
          : isAgent
            ? `agent${pad(number)}@realestate.local`
            : `user${pad(number)}@realestate.local`,
        passwordHash,
        fullName,
        phone: number % 9 === 0 ? null : `09${String(10000000 + number).slice(-8)}`,
        avatarUrl:
          number % 8 === 0
            ? null
            : `https://i.pravatar.cc/300?img=${(number % 70) + 1}`,
        role: isAdmin ? UserRole.ADMIN : UserRole.USER,
        status: number > 95 ? UserStatus.BANNED : UserStatus.ACTIVE,
        createdAt: daysAgo((number * 11) % 900),
        updatedAt: daysAgo((number * 7) % 120),
      };
    },
  );

  await prisma.user.createMany({ data: users });
  return users;
};

const buildTitle = (
  blueprint: Blueprint,
  location: LocationProfile,
  index: number,
) => {
  const streetLabel = location.streetName
    .replace(/^Đường\s+/u, "")
    .replace(/^Phố\s+/u, "");

  const templates = [
    `${blueprint.titlePrefix} tại ${location.districtLabel}, ${location.city} - ${blueprint.titleSuffix}`,
    `${blueprint.titlePrefix} ${location.ward}, ${location.districtLabel} - mã ${pad(index)}`,
    `${blueprint.titlePrefix} gần ${streetLabel}, ${location.districtLabel}`,
    `${blueprint.titlePrefix} khu ${location.districtLabel} - ${blueprint.titleSuffix}`,
  ];

  return `${pick(templates, index)} [SEED-${pad(index)}]`;
};

const buildDescription = (
  blueprint: Blueprint,
  location: LocationProfile,
  index: number,
  authorIndex: number,
) => {
  const bedrooms =
    blueprint.propertyType === PropertyType.LAND ||
    blueprint.propertyType === PropertyType.WAREHOUSE ||
    blueprint.propertyType === PropertyType.OFFICE
      ? null
      : 1 + (index % 5);

  const bathrooms = bedrooms ? Math.max(1, bedrooms - (index % 2)) : null;

  const floors =
    blueprint.propertyType === PropertyType.HOUSE ||
    blueprint.propertyType === PropertyType.SHOPHOUSE ||
    blueprint.propertyType === PropertyType.VILLA
      ? 2 + (index % 4)
      : null;

  const direction = pick(directions, index);
  const legal = pick(legalStatuses, index + 2);
  const furniture = pick(furnitureStatuses, index + 3);
  const isAgent = authorIndex <= 16;
  const humanNote = isAgent ? pick(agentPhrases, index) : pick(ownerPhrases, index);
  const typoPrefix =
    index % 17 === 0 ? "Cần bán gấp, nhà dep, vị trí dễ đi lại. " : "";

  return [
    `${typoPrefix}${blueprint.summary}`,
    `Vị trí tại ${location.ward}, ${location.district}, ${location.city}; gần trục ${location.streetName}.`,
    `Diện tích sử dụng khoảng ${
      blueprint.baseArea + location.areaOffset + (index % 18)
    }m², hướng ${direction}.`,
    bedrooms
      ? `Công năng gồm ${bedrooms} phòng ngủ, ${bathrooms} WC${
          floors ? `, kết cấu ${floors} tầng` : ""
        }.`
      : null,
    `Pháp lý: ${legal}. Nội thất: ${furniture}.`,
    `Phù hợp cho ${blueprint.targetAudience}.`,
    humanNote,
  ]
    .filter(Boolean)
    .join(" ");
};

const createPostsAndImages = async (
  featureIdsByName: Map<string, string>,
) => {
  const posts: Prisma.PropertyPostCreateManyInput[] = [];
  const images: Prisma.PropertyImageCreateManyInput[] = [];
  const postFeatures: Prisma.PropertyPostFeatureCreateManyInput[] = [];

  for (let index = 1; index <= SEED.posts; index += 1) {
    const blueprint =
      weightedBlueprints[(index * 13) % weightedBlueprints.length];
    const location = locations[(index * 7) % locations.length];
    const authorIndex = index % 100 === 0 ? 1 : ((index * 29) % 99) + 2;
    const createdAt = daysAgo((index * 5) % 1_095, index % 720);
    const streetNumber = 12 + index * 3;
    const addressFormatter = addressFormats[index % addressFormats.length];

    const priceMultiplier =
      blueprint.postType === PostType.SELL
        ? location.priceMultiplier
        : location.rentMultiplier;

    const priceNoise =
      blueprint.postType === PostType.SELL
        ? ((index % 27) - 8) * 55_000_000
        : ((index % 19) - 6) * 250_000;

    const price = Math.max(
      blueprint.postType === PostType.SELL ? 350_000_000 : 1_000_000,
      Math.round(blueprint.basePrice * priceMultiplier + priceNoise),
    );

    const area = Math.max(
      12,
      blueprint.baseArea + location.areaOffset + (index % 24) - 6,
    );

    posts.push({
      id: makePostId(index),
      authorId: makeUserId(authorIndex),
      title: buildTitle(blueprint, location, index),
      description: buildDescription(blueprint, location, index, authorIndex),
      price,
      area,
      address: addressFormatter(streetNumber, location.streetName),
      city: location.city,
      district: location.district,
      ward: index % 23 === 0 ? null : location.ward,
      latitude: Number(
        (location.latitude + ((index % 17) - 8) * 0.0011).toFixed(6),
      ),
      longitude: Number(
        (location.longitude + ((index % 19) - 9) * 0.001).toFixed(6),
      ),
      propertyType: blueprint.propertyType,
      postType: blueprint.postType,
      status: makePostStatus(index),
      createdAt,
      updatedAt: daysAgo((index * 3) % 90),
    });

    const pool = imagePool[blueprint.propertyType];

    for (let imageIndex = 0; imageIndex < SEED.images / SEED.posts; imageIndex += 1) {
      const image = pool[(index + imageIndex) % pool.length];

      images.push({
        id: `seed-image-${pad(index)}-${imageIndex + 1}`,
        postId: makePostId(index),
        imageUrl: imageUrl(image.id, 1200, `${index}-${imageIndex + 1}`),
        caption:
          imageIndex === 0
            ? `${image.caption} ảnh đại diện`
            : `${image.caption} góc ${imageIndex + 1}`,
        order: imageIndex,
        createdAt,
      });
    }

    for (const featureName of blueprint.featureNames) {
      const featureId = featureIdsByName.get(featureName);

      if (featureId) {
        postFeatures.push({
          postId: makePostId(index),
          featureId,
        });
      }
    }
  }

  await prisma.propertyPost.createMany({ data: posts });
  await prisma.propertyImage.createMany({ data: images });
  await prisma.propertyPostFeature.createMany({
    data: postFeatures,
    skipDuplicates: true,
  });
};

const createComments = async () => {
  const comments: Prisma.CommentCreateManyInput[] = [];
  const parentCount = 1_200;

  for (let index = 1; index <= parentCount; index += 1) {
    comments.push({
      id: makeCommentId(index),
      postId: makePostId(((index * 17) % SEED.posts) + 1),
      authorId: makeUserId(((index * 31) % 99) + 2),
      content: pick(commentContents, index),
      createdAt: daysAgo((index * 3) % 365, index % 600),
      updatedAt: daysAgo((index * 3) % 365, index % 600),
    });
  }

  for (let index = parentCount + 1; index <= SEED.comments; index += 1) {
    const parentIndex = ((index * 11) % parentCount) + 1;
    const parentComment = comments[parentIndex - 1];

    comments.push({
      id: makeCommentId(index),
      postId: parentComment.postId,
      authorId: makeUserId(((index * 19) % 99) + 2),
      parentId: makeCommentId(parentIndex),
      replyToUserId: parentComment.authorId,
      content: pick(replyContents, index),
      createdAt: daysAgo((index * 2) % 240, index % 700),
      updatedAt: daysAgo((index * 2) % 240, index % 700),
    });
  }

  await prisma.comment.createMany({ data: comments });
};

const resetDatabase = async () => {
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.report.deleteMany(),
    prisma.savedPost.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.propertyPostFeature.deleteMany(),
    prisma.propertyImage.deleteMany(),
    prisma.propertyPost.deleteMany(),
    prisma.systemLog.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.propertyFeature.deleteMany(),
  ]);
};

const seedFeatures = async () => {
  for (const feature of propertyFeatures) {
    await prisma.propertyFeature.upsert({
      where: { name: feature.name },
      update: feature,
      create: feature,
    });
  }

  const features = await prisma.propertyFeature.findMany({
    select: { id: true, name: true },
  });

  return new Map(features.map((feature) => [feature.name, feature.id]));
};

const assertCount = async (
  label: string,
  expected: number,
  actual: Promise<number>,
) => {
  const value = await actual;

  if (value !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${value}`);
  }
};

const main = async () => {
  console.time("Seed completed");

  const passwordHash = await bcrypt.hash(seedPassword, passwordRounds);

  await resetDatabase();

  const featureIdsByName = await seedFeatures();

  await createUsers(passwordHash);
  await createPostsAndImages(featureIdsByName);
  await createComments();

  await assertCount("Users", SEED.users, prisma.user.count());
  await assertCount("Posts", SEED.posts, prisma.propertyPost.count());
  await assertCount("Images", SEED.images, prisma.propertyImage.count());
  await assertCount("Comments", SEED.comments, prisma.comment.count());

  console.log("Seed summary:", SEED);
  console.log(`Admin account: ${adminEmail} / ${seedPassword}`);
  console.log(`Shared password for seeded users: ${seedPassword}`);

  console.timeEnd("Seed completed");
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });