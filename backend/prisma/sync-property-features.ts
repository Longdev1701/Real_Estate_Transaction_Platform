import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { propertyFeatures } from "./data/property-features.js";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

const main = async () => {
  let createdOrUpdatedCount = 0;

  for (const feature of propertyFeatures) {
    await prisma.propertyFeature.upsert({
      where: { name: feature.name },
      update: {
        icon: feature.icon,
        category: feature.category,
        propertyTypes: feature.propertyTypes,
      },
      create: feature,
    });

    createdOrUpdatedCount += 1;
  }

  const grouped = await prisma.propertyFeature.groupBy({
    by: ["category"],
    _count: {
      _all: true,
    },
    orderBy: {
      category: "asc",
    },
  });

  console.log(`Synchronized ${createdOrUpdatedCount} property features.`);
  for (const row of grouped) {
    console.log(`${row.category ?? "Chưa phân loại"}: ${row._count._all}`);
  }
};

main()
  .catch((error) => {
    console.error("Property feature sync failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
