import { PropertyType } from "@prisma/client";
import { prisma } from "../prisma/prisma.service.js";

export const getFeatures = async (propertyType?: PropertyType) => {
  return prisma.propertyFeature.findMany({
    where: propertyType
      ? {
          propertyTypes: {
            has: propertyType,
          },
        }
      : undefined,
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
  });
};
