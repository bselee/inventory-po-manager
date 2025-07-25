/**
 * Practical MCP Usage Example: Enhanced Error Handling
 * 
 * This demonstrates how Context7 can help improve our inventory API routes
 * with current best practices for error handling in Next.js.
 */

// Example prompt for Context7:
// "Show me how to implement comprehensive error handling in Next.js API routes for inventory management. use context7"

// Before: Basic error handling
export async function basicUpdateInventory(req: any, res: any) {
  try {
    const { id } = req.query;
    const data = req.body;
    
    // Update in database
    const result = await updateInventoryItem(id, data);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}

// After: Enhanced error handling (based on Context7 guidance)
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Type-safe error response
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Input validation schema
const UpdateInventorySchema = z.object({
  stock: z.number().min(0),
  cost: z.number().min(0).optional(),
  location: z.string().optional(),
});

export async function enhancedUpdateInventory(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Method validation
    if (req.method !== 'PUT') {
      return res.status(405).json({
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    // Input validation
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid or missing inventory ID',
        code: 'INVALID_ID',
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    // Body validation with Zod
    const parseResult = UpdateInventorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.errors,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    // Database operation with specific error handling
    const result = await updateInventoryItem(id, parseResult.data);
    
    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Inventory update error:', error);

    // Specific error handling based on error type
    if (error instanceof DatabaseConnectionError) {
      return res.status(503).json({
        error: 'Database temporarily unavailable',
        code: 'DATABASE_ERROR',
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Inventory item not found',
        code: 'ITEM_NOT_FOUND',
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    // Generic error fallback
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    } as ErrorResponse);
  }
}

// Example custom error classes
class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

async function updateInventoryItem(id: string, data: any) {
  // Mock implementation - would integrate with Supabase
  throw new Error('Mock implementation');
}

export default enhancedUpdateInventory;
