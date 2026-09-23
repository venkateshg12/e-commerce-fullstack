
export const SIZE_OPTIONS = ["S", "M", "L", "XL"] as const;

// All 28 states + 8 union territories, alphabetical — used by the address form's State dropdown.
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

// Flip to false to hide the color facet (and skip the fetch that builds its swatch list).
export const COLOR_FILTER_ENABLED = true;

export const COLOR_MAP: Record<string, string> = {
    black: "#111111",
    white: "#f5f5f5",
    grey: "#b7280c",
    gray: "#b7280c",
    blue: "#2563eb",
    navy: "#1e3a8a",
    red: "#dc2626",
    green: "#16a34a",
    olive: "#4d5b2b",
    yellow: "#eab308",
    beige: "#d6c2a1",
    cream: "#ede8d8",
    brown: "#7c4c2d",
    tan: "#b9936c",
    pink: "#ec4899",
    purple: "#9333ea",
    orange: "#f97316",
    maroon: "#7f1d1d",
};


// Section titles like "More Shirts". Type names are admin-entered, so this is a rule rather than
// a lookup: already-plural names ("Jeans", "Shorts") stay as-is, "Dress" → "Dresses".
export const pluralize = (name: string) => {
    if (/(ss|sh|ch|x|z)$/i.test(name)) return `${name}es`;
    if (/s$/i.test(name)) return name;
    return `${name}s`;
};
