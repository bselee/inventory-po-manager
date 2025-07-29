# Visual Guide: Fix Inventory Updates in Supabase

## Step 1: Access Supabase

1. Go to https://supabase.com
2. Click "Sign In" (top right)
3. Enter your email and password
4. Click on your project tile

## Step 2: Find SQL Editor

In your project dashboard:
```
📊 Dashboard
📦 Table Editor  
🔐 Authentication
💾 Storage
📝 SQL Editor     <-- Click this one!
⚙️ Settings
```

## Step 3: Run the Fix

1. **You'll see a page with:**
   - Left side: List of saved queries
   - Center: Large text area for SQL
   - Bottom right: Green "RUN" button

2. **Copy this EXACT SQL into the text area:**

```sql
-- Fix inventory updates
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

3. **Click the green "RUN" button**

4. **You should see:**
   - "Success" message at the bottom
   - Or "column already exists" (that's OK too!)

## Step 4: Verify It Worked

1. **Clear the SQL editor**
2. **Paste this verification query:**

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
AND column_name = 'updated_at';
```

3. **Click RUN**
4. **You should see:** A result showing "updated_at"

## Step 5: Test in Your App

1. Go back to your terminal
2. Run: `node scripts/test-inventory-update.js`
3. Should see: "✅ Update successful!"

## If You Can't Find Supabase Dashboard

1. **Check your `.env.local` file:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   ```

2. **The "xxxxxxxxxxxx" part is your project ID**

3. **Go directly to:**
   ```
   https://app.supabase.com/project/xxxxxxxxxxxx/sql
   ```
   (Replace xxxxxxxxxxxx with your actual project ID)

## Common Issues

**"Permission denied" error:**
- Make sure you're logged into Supabase
- Make sure it's YOUR project

**"Table not found" error:**
- Check you're in the right project
- The table name is `inventory_items` (with underscore)

**Still getting errors after fix:**
- Try restarting your dev server
- Clear browser cache
- Run the test script again

## Need More Help?

If you're stuck:
1. Take a screenshot of the error
2. Check which step you're on
3. Make sure you copied the SQL exactly
4. Try the alternative fix (removing trigger) from the main guide