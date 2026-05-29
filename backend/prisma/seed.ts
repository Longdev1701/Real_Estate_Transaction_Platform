import "dotenv/config";

import bcrypt from "bcryptjs";

import {
  PostType,
  Prisma,
  PropertyType,
  UserRole,
  UserStatus,
} from "@prisma/client";

import { prisma } from "../src/prisma/prisma.service.js";

const adminEmail = "admin@realestate.local";
const userEmail = "user@realestate.local";
const seedPassword = "12345678";

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

const samplePosts: SeedPostInput[] = [
  {
    title: "Modern townhouse near District 7 riverside",
    description:
      "A bright townhouse with three bedrooms, a rooftop terrace, and quick access to schools and shopping.",
    price: 4200000000,
    area: 118,
    address: "25 Riverside Street",
    city: "Ho Chi Minh City",
    district: "District 7",
    ward: "Tan Phu",
    latitude: 10.7294,
    longitude: 106.7219,
    propertyType: PropertyType.HOUSE,
    postType: PostType.SELL,
    images: [
      {
        imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
        caption: "Front view",
        order: 0,
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be",
        caption: "Living room",
        order: 1,
      },
    ],
  },
  {
    title: "Furnished apartment for rent in Thu Duc",
    description:
      "Two-bedroom apartment with balcony, gym access, and fully equipped kitchen for young professionals.",
    price: 18000000,
    area: 72,
    address: "88 Innovation Avenue",
    city: "Ho Chi Minh City",
    district: "Thu Duc",
    ward: "Linh Tay",
    latitude: 10.8506,
    longitude: 106.7717,
    propertyType: PropertyType.APARTMENT,
    postType: PostType.RENT,
    images: [
      {
        imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
        caption: "Bedroom",
        order: 0,
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156",
        caption: "Kitchen",
        order: 1,
      },
    ],
  },
  {
    title: "Looking for a small studio near university area",
    description:
      "Friendly tenant looking for a clean studio with good internet and motorbike parking.",
    price: 7000000,
    area: 30,
    address: "12 Student Lane",
    city: "Ho Chi Minh City",
    district: "Binh Thanh",
    ward: "Ward 25",
    latitude: 10.8017,
    longitude: 106.7146,
    propertyType: PropertyType.ROOM,
    postType: PostType.FIND,
    images: [
      {
        imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
        caption: "Reference room",
        order: 0,
      },
    ],
  },
];

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

const main = async () => {
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const admin = await upsertUser({
    email: adminEmail,
    passwordHash,
    fullName: "Platform Admin",
    phone: "0900000001",
    avatarUrl: "https://i.pravatar.cc/300?img=12",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  });

  const sampleUser = await upsertUser({
    email: userEmail,
    passwordHash,
    fullName: "Sample User",
    phone: "0900000002",
    avatarUrl: "https://i.pravatar.cc/300?img=32",
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  });

  // Seed property features
  const featuresData = [
    // Tiện nghi (Amenities)
    { name: "Wifi / Internet", icon: "wifi", category: "Tiện nghi", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.ROOM] },
    { name: "Điều hòa nhiệt độ", icon: "wind", category: "Tiện nghi", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.ROOM] },
    { name: "Đầy đủ nội thất", icon: "armchair", category: "Tiện nghi", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.ROOM] },
    { name: "Máy giặt", icon: "droplets", category: "Tiện nghi", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.ROOM] },
    { name: "Tủ lạnh", icon: "snowflake", category: "Tiện nghi", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.ROOM] },
    { name: "Máy nước nóng", icon: "thermometer-sun", category: "Tiện nghi", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.ROOM] },

    // Tiện ích (Facilities)
    { name: "Bể bơi", icon: "waves", category: "Tiện ích", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT] },
    { name: "Thang máy", icon: "arrow-up-down", category: "Tiện ích", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT] },
    { name: "Bãi đỗ xe ô tô", icon: "car", category: "Tiện ích", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT] },
    { name: "Chỗ đỗ xe máy", icon: "bike", category: "Tiện ích", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.ROOM] },
    { name: "Bảo vệ 24/7", icon: "shield", category: "Tiện ích", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT] },
    { name: "Sân vườn / Cảnh quan", icon: "trees", category: "Tiện ích", propertyTypes: [PropertyType.HOUSE, PropertyType.LAND] },
    { name: "Sân thượng / Rooftop", icon: "building", category: "Tiện ích", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT] },

    // Pháp lý & Vị thế (Legal & Geography)
    { name: "Sổ đỏ / Sổ hồng sẵn sàng", icon: "scroll", category: "Pháp lý & Vị thế", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.LAND] },
    { name: "Mặt tiền đường chính", icon: "milestone", category: "Pháp lý & Vị thế", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.LAND] },
    { name: "Đất thổ cư 100%", icon: "home", category: "Pháp lý & Vị thế", propertyTypes: [PropertyType.HOUSE, PropertyType.LAND] },
    { name: "Nở hậu", icon: "expand", category: "Pháp lý & Vị thế", propertyTypes: [PropertyType.HOUSE, PropertyType.LAND] },

    // Quy định (Rules)
    { name: "Cho phép nuôi thú cưng", icon: "dog", category: "Quy định", propertyTypes: [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.ROOM] },
  ];

  for (const feature of featuresData) {
    await prisma.propertyFeature.upsert({
      where: { name: feature.name },
      update: feature,
      create: feature,
    });
  }

  await upsertPostWithImages(admin.id, samplePosts[0], [
    "Bảo vệ 24/7",
    "Bãi đỗ xe ô tô",
    "Sân thượng / Rooftop",
    "Sổ đỏ / Sổ hồng sẵn sàng",
  ]);
  await upsertPostWithImages(sampleUser.id, samplePosts[1], [
    "Wifi / Internet",
    "Điều hòa nhiệt độ",
    "Đầy đủ nội thất",
    "Bể bơi",
    "Thang máy",
    "Cho phép nuôi thú cưng",
  ]);
  await upsertPostWithImages(sampleUser.id, samplePosts[2], [
    "Wifi / Internet",
    "Chỗ đỗ xe máy",
  ]);

  console.log("Seed completed successfully.");
  console.log(`Admin account: ${adminEmail} / ${seedPassword}`);
  console.log(`User account: ${userEmail} / ${seedPassword}`);
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
