export type PricingType = 'per_unit' | 'per_kg';

export type UnitType = 
  | 'kg' 
  | 'gram' 
  | 'packet' 
  | 'piece' 
  | 'box' 
  | 'litre' 
  | 'bottle' 
  | 'pouch' 
  | 'dozen' 
  | 'tin';

export interface WeightPreset {
  id: string;
  name: string; // e.g. "100g", "250g", "500g", "1kg", "5kg"
  valueInKg: number; // e.g. 0.1, 0.25, 0.5, 1, 5
}

export interface Product {
  id: string;
  name: string;
  nameKannada?: string;
  nameHindi?: string;
  category: string;
  pricingType: PricingType;
  pricePerUnit: number; // if per_unit: price per piece/pkt; if per_kg: price per 1kg
  priceDecimal?: string; // Exact server/input decimal; numeric value is display/calculator only.
  unit: UnitType;
  stockQuantity: number;
  minStockAlert: number;
  barcode?: string;
  voiceKeywords: string[]; // for Rohan's voice assistant to match
  isAvailable: boolean;
  imageUrl?: string;
  emoji?: string; // Visual icon for village and local accessibility
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  nameKannada: string;
  nameHindi: string;
  icon: string;
}

