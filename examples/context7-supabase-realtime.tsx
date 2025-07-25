/**
 * CONTEXT7 EXAMPLE: Supabase Real-time Subscriptions Implementation
 * ================================================================
 * 
 * Request: "Show me how to implement Supabase real-time subscriptions for inventory updates. use context7"
 * 
 * Context7 would provide current best practices for Supabase real-time features:
 */

// Based on Context7 guidance for Supabase real-time subscriptions:

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// 1. Initialize Supabase client with real-time enabled
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: {
      params: {
        eventsPerSecond: 10, // Rate limiting
      },
    },
  }
);

// 2. Custom hook for inventory real-time updates
export function useInventoryRealtime() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      try {
        // Initial data fetch
        const { data: initialData, error: fetchError } = await supabase
          .from('inventory_items')
          .select('*')
          .order('product_name');

        if (fetchError) throw fetchError;
        setInventoryItems(initialData || []);

        // Set up real-time subscription
        channel = supabase
          .channel('inventory_changes')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'inventory_items',
            },
            (payload: RealtimePostgresChangesPayload<InventoryItem>) => {
              console.log('Real-time update:', payload);
              
              switch (payload.eventType) {
                case 'INSERT':
                  setInventoryItems(prev => [...prev, payload.new]);
                  break;
                  
                case 'UPDATE':
                  setInventoryItems(prev =>
                    prev.map(item =>
                      item.id === payload.new.id ? payload.new : item
                    )
                  );
                  break;
                  
                case 'DELETE':
                  setInventoryItems(prev =>
                    prev.filter(item => item.id !== payload.old.id)
                  );
                  break;
              }
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status);
            setIsConnected(status === 'SUBSCRIBED');
            
            if (status === 'CHANNEL_ERROR') {
              setError('Failed to connect to real-time updates');
            }
          });

      } catch (err) {
        console.error('Error setting up real-time subscription:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { inventoryItems, isConnected, error };
}

// 3. Component using real-time updates
export function RealtimeInventoryList() {
  const { inventoryItems, isConnected, error } = useInventoryRealtime();

  if (error) {
    return (
      <div className="alert alert-error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {isConnected ? 'Real-time connected' : 'Connecting...'}
        </span>
      </div>
      
      <div className="grid gap-4">
        {inventoryItems.map(item => (
          <InventoryCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// 4. Advanced: Filtered real-time subscriptions
export function useInventoryRealtimeFiltered(filters: { vendor?: string; location?: string }) {
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('filtered_inventory')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: filters.vendor ? `vendor=eq.${filters.vendor}` : undefined,
        },
        (payload) => {
          // Handle filtered updates
          console.log('Filtered update:', payload);
          // ... update logic
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters.vendor, filters.location]);

  return { filteredItems };
}

// 5. Real-time notifications for critical stock levels
export function useStockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('stock_alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_items',
        },
        (payload) => {
          const item = payload.new;
          
          // Check for critical stock conditions
          if (item.current_stock === 0) {
            setAlerts(prev => [...prev, {
              id: crypto.randomUUID(),
              type: 'out_of_stock',
              itemId: item.id,
              itemName: item.product_name,
              message: `${item.product_name} is now out of stock`,
              timestamp: new Date(),
            }]);
          } else if (item.current_stock <= item.minimum_stock) {
            setAlerts(prev => [...prev, {
              id: crypto.randomUUID(),
              type: 'low_stock',
              itemId: item.id,
              itemName: item.product_name,
              message: `${item.product_name} is below minimum stock (${item.current_stock}/${item.minimum_stock})`,
              timestamp: new Date(),
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { alerts, clearAlert: (id: string) => setAlerts(prev => prev.filter(a => a.id !== id)) };
}

// Supporting types
interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  current_stock: number;
  minimum_stock: number;
  vendor?: string;
  location?: string;
}

interface StockAlert {
  id: string;
  type: 'out_of_stock' | 'low_stock';
  itemId: string;
  itemName: string;
  message: string;
  timestamp: Date;
}

interface InventoryCardProps {
  item: InventoryItem;
}

function InventoryCard({ item }: InventoryCardProps) {
  return (
    <div className="border rounded p-4">
      <h3 className="font-semibold">{item.product_name}</h3>
      <p className="text-sm text-gray-600">SKU: {item.sku}</p>
      <p className="text-sm">Stock: {item.current_stock}</p>
    </div>
  );
}

/**
 * CONTEXT7 GUIDANCE SUMMARY:
 * ==========================
 * 
 * Key patterns Context7 would recommend for Supabase real-time:
 * 
 * 1. Connection Management: Proper setup and cleanup of subscriptions
 * 2. Error Handling: Robust error states and reconnection logic
 * 3. Type Safety: Full TypeScript support with proper payload typing
 * 4. Performance: Rate limiting and filtered subscriptions
 * 5. User Experience: Connection status indicators and loading states
 * 6. Real-time Alerts: Immediate notifications for critical events
 * 7. Cleanup: Proper unsubscription to prevent memory leaks
 * 8. Filtering: Server-side filtering for better performance
 * 
 * Best Practices from Context7:
 * - Always handle subscription status changes
 * - Use custom hooks for reusable real-time logic
 * - Implement proper error boundaries
 * - Consider offline/online state management
 * - Use React.memo for performance optimization
 * - Implement exponential backoff for reconnections
 */
