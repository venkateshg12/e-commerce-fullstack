export const getVariantKey = (color?: string | null, size?: string | null) =>
    `${color || ""}|${size || ""}`;