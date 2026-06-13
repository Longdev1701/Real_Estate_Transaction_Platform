export type FeatureGroupItem = {
  id: string;
  name: string;
  icon?: string | null;
  category?: string | null;
};

const FEATURE_CATEGORY_ORDER = [
  "Nội thất & Trang bị",
  "Tiện ích chung",
  "Pháp lý",
  "Vị trí & Đặc điểm",
  "Quy định sử dụng",
  "Đặc trưng khác",
];

export const groupFeaturesByCategory = <T extends FeatureGroupItem>(features: T[]) => {
  const groups = new Map<string, T[]>();

  features.forEach((feature) => {
    const category = feature.category?.trim() || "Đặc trưng khác";
    groups.set(category, [...(groups.get(category) ?? []), feature]);
  });

  return Array.from(groups.entries()).sort(([left], [right]) => {
    const leftIndex = FEATURE_CATEGORY_ORDER.indexOf(left);
    const rightIndex = FEATURE_CATEGORY_ORDER.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, "vi");
    }

    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
};
