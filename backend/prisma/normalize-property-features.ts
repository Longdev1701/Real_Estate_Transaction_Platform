import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import {
  legacyFeatureNames,
  propertyFeatures,
} from "./data/property-features.js";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

const categoryByFeatureName = new Map(
  propertyFeatures.map((feature) => [feature.name, feature.category]),
);

const main = async () => {
  const features = await prisma.propertyFeature.findMany({
    select: {
      id: true,
      name: true,
      category: true,
    },
  });

  let updatedCount = 0;

  for (const feature of features) {
    const normalizedName = legacyFeatureNames.get(feature.name) ?? feature.name;
    const normalizedCategory = categoryByFeatureName.get(normalizedName);

    if (!normalizedCategory) {
      continue;
    }

    if (
      normalizedName === feature.name &&
      normalizedCategory === feature.category
    ) {
      continue;
    }

    await prisma.propertyFeature.update({
      where: { id: feature.id },
      data: {
        name: normalizedName,
        category: normalizedCategory,
      },
    });

    updatedCount += 1;
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

  console.log(`Normalized ${updatedCount} property features.`);
  for (const row of grouped) {
    console.log(`${row.category ?? "Chưa phân loại"}: ${row._count._all}`);
  }
};

main()
  .catch((error) => {
    console.error("Feature normalization failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
