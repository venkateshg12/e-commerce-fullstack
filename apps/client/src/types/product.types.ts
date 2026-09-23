export type SubCategory = {
  _id: string;
  name: string;
};

export type Brand = {
  _id: string;
  name: string;
};

export type Category = {
  _id: string;
  name: string;
  // Embedded by GET /admin/categories. Absent on the bare document a create/rename returns.
  subCategories?: SubCategory[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProductImage = {
  url: string;
  publicId: string;
  isCover: boolean;
  color?: string;
};

export type ProductCategory = {
  _id: string;
  name: string;
};

// A file chosen in the admin but not uploaded yet, with the palette colour it depicts. Keeping
// them in one object is what guarantees a photo can't be uploaded against another photo's colour.
export type LocalImage = {
  file: File;
  color?: string;
};

export type ProductStatus = "active" | "inactive";

export type ProductSize = "S" | "M" | "L" | "XL" | "XXL";

// One sellable combination and its own count. `color`/`size` are absent for a product that has no
// colours or no sizes, which then carries a single variant.
export type ProductVariant = {
  color?: string;
  size?: ProductSize;
  stock: number;
};

export type Product = {
  _id: string;
  title: string;
  description: string;
  brand: Brand;
  category: ProductCategory;
  images: ProductImage[];
  colors: string[];
  sizes: ProductSize[];
  subCategory?: SubCategory;
  price: number;
  salesPercentage: number;
  // Stock lives here, one row per (colour, size). There is no product-level total — sum these.
  variants: ProductVariant[];
  status: ProductStatus;
  uploadStatus?: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  uploadError?: string;
  createdAt: string;
  updatedAt: string;
};

