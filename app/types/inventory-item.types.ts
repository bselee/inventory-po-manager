export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unitPrice: number;
  supplier: string;
  category: string;
  lastRestocked: string;
  active: boolean;
}
