import { validateInventoryItem, validatePurchaseOrder, InventoryItemSchema } from '../../app/types';

describe('Type Validation', () => {
  describe('InventoryItem Validation', () => {
    it('should validate a correct inventory item', () => {
      const validItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        current_stock: 10,
        minimum_stock: 5,
        maximum_stock: 100,
        unit_price: 19.99,
        supplier: 'Test Supplier',
        category: 'Test Category',
        last_restocked: '2023-01-01T00:00:00Z',
        active: true,
      };

      expect(() => validateInventoryItem(validItem)).not.toThrow();
    });

    it('should reject invalid SKU format', () => {
      const invalidItem = {
        name: 'Test Item',
        sku: 'invalid sku with spaces',
        current_stock: 10,
        minimum_stock: 5,
        unit_price: 19.99,
        active: true,
      };

      expect(() => validateInventoryItem(invalidItem)).toThrow();
    });

    it('should reject negative stock values', () => {
      const invalidItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        current_stock: -5,
        minimum_stock: 5,
        unit_price: 19.99,
        active: true,
      };

      expect(() => validateInventoryItem(invalidItem)).toThrow();
    });

    it('should reject when maximum_stock is less than minimum_stock', () => {
      const invalidItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        current_stock: 10,
        minimum_stock: 20,
        maximum_stock: 15,
        unit_price: 19.99,
        active: true,
      };

      expect(() => validateInventoryItem(invalidItem)).toThrow();
    });

    it('should reject zero or negative unit_price', () => {
      const invalidItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        current_stock: 10,
        minimum_stock: 5,
        unit_price: 0,
        active: true,
      };

      expect(() => validateInventoryItem(invalidItem)).toThrow();
    });

    it('should allow null maximum_stock', () => {
      const validItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        current_stock: 10,
        minimum_stock: 5,
        maximum_stock: null,
        unit_price: 19.99,
        active: true,
      };

      expect(() => validateInventoryItem(validItem)).not.toThrow();
    });
  });

  describe('PurchaseOrder Validation', () => {
    it('should validate a correct purchase order', () => {
      const validPO = {
        po_number: 'PO-12345678',
        vendor_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'draft' as const,
        order_date: '2023-01-01T00:00:00Z',
        expected_date: '2023-01-15T00:00:00Z',
        total_amount: 100.50,
        notes: 'Test order',
      };

      expect(() => validatePurchaseOrder(validPO)).not.toThrow();
    });

    it('should reject invalid PO number format', () => {
      const invalidPO = {
        po_number: 'INVALID-FORMAT',
        vendor_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'draft' as const,
        order_date: '2023-01-01T00:00:00Z',
        total_amount: 100.50,
      };

      expect(() => validatePurchaseOrder(invalidPO)).toThrow();
    });

    it('should reject invalid status', () => {
      const invalidPO = {
        po_number: 'PO-12345678',
        vendor_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'invalid_status' as any,
        order_date: '2023-01-01T00:00:00Z',
        total_amount: 100.50,
      };

      expect(() => validatePurchaseOrder(invalidPO)).toThrow();
    });

    it('should reject negative total_amount', () => {
      const invalidPO = {
        po_number: 'PO-12345678',
        vendor_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'draft' as const,
        order_date: '2023-01-01T00:00:00Z',
        total_amount: -100,
      };

      expect(() => validatePurchaseOrder(invalidPO)).toThrow();
    });
  });
});
