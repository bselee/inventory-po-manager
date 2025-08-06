const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPurchaseOrdersVendorIssue() {
  try {
    // Step 1: Check if vendors table exists and has data
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name')
      .order('name');

    if (vendorsError) {
      if (vendorsError.code === '42P01') {
        // Create vendors table
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE vendors (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name TEXT NOT NULL,
              contact_name TEXT,
              email TEXT,
              phone TEXT,
              address TEXT,
              payment_terms TEXT,
              lead_time_days INTEGER,
              minimum_order DECIMAL(10, 2),
              notes TEXT,
              active BOOLEAN DEFAULT true,
              finale_vendor_id TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT unique_vendor_name UNIQUE (name)
            );
            
            CREATE INDEX idx_vendors_finale_id ON vendors(finale_vendor_id);
            CREATE INDEX idx_vendors_active ON vendors(active) WHERE active = true;
          `
        });

        if (createError) {
          console.error('Failed to create vendors table:', createError.message);
          return;
        }
      } else {
        throw vendorsError;
      }
    } else {
    }

    // Step 2: Get unique vendor names from purchase_orders
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_orders')
      .select('vendor')
      .not('vendor', 'is', null);

    if (poError) {
      throw poError;
    }

    const uniqueVendorNames = [...new Set(purchaseOrders.map(po => po.vendor).filter(Boolean))];
    // Step 3: Create missing vendors
    for (const vendorName of uniqueVendorNames) {
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .ilike('name', vendorName)
        .single();

      if (!existingVendor) {
        const { error: insertError } = await supabase
          .from('vendors')
          .insert({
            name: vendorName,
            active: true
          });

        if (insertError && insertError.code !== '23505') { // Ignore unique constraint violations
          console.error(`Failed to create vendor "${vendorName}":`, insertError.message);
        } else {
        }
      }
    }

    // Step 4: Check if vendor_id column exists
    const { data: testData, error: testError } = await supabase
      .from('purchase_orders')
      .select('id')
      .limit(1);

    if (!testError) {
      // Try to select vendor_id
      const { error: vendorIdError } = await supabase
        .from('purchase_orders')
        .select('vendor_id')
        .limit(1);

      if (vendorIdError && vendorIdError.code === '42703') {
        // Add vendor_id column
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql: `
            ALTER TABLE purchase_orders 
            ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
            
            CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
          `
        });

        if (alterError) {
          console.error('Failed to add vendor_id column:', alterError.message);
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
          `);
        } else {
        }
      } else if (!vendorIdError) {
      }
    }

    // Step 5: Update vendor_id based on vendor name matches
    // Get all vendors
    const { data: allVendors } = await supabase
      .from('vendors')
      .select('id, name');

    if (allVendors) {
      for (const vendor of allVendors) {
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update({ vendor_id: vendor.id })
          .ilike('vendor', vendor.name)
          .is('vendor_id', null);

        if (!updateError) {
        }
      }
    }
  } catch (error) {
    console.error('Error fixing vendor issue:', error);
  }
}

// Check if exec_sql function exists, if not provide alternative
async function checkExecSqlFunction() {
  const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  
  if (error && error.code === '42883') {
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
    `);
    return false;
  }
  return true;
}

checkExecSqlFunction().then(hasExecSql => {
  if (!hasExecSql) {
  }
  fixPurchaseOrdersVendorIssue();
});