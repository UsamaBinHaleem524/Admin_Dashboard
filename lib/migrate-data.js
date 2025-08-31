// Data migration utility to migrate localStorage data to MongoDB
// This script can be run in the browser console to migrate existing data

const migrateLocalStorageToMongoDB = async () => {
  console.log('Starting data migration from localStorage to MongoDB...');
  
  const migrationData = {
    products: localStorage.getItem('products'),
    sales: localStorage.getItem('sales'),
    purchases: localStorage.getItem('purchases'),
    dailyExpenses: localStorage.getItem('dailyExpenses'),
    invoices: localStorage.getItem('invoices'),
    quotations: localStorage.getItem('quotations'),
    purchaseOrders: localStorage.getItem('purchaseOrders'),
    customerTransactions: localStorage.getItem('customerTransactions'),
    supplierTransactions: localStorage.getItem('supplierTransactions'),
    shopExpenses: localStorage.getItem('shopExpenses'),
  };

  const results = {};

  for (const [key, data] of Object.entries(migrationData)) {
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        console.log(`Migrating ${key}:`, parsedData);
        
        // Send data to API endpoints
        const response = await fetch(`/api/${key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(parsedData),
        });

        if (response.ok) {
          results[key] = 'Success';
          console.log(`✅ Successfully migrated ${key}`);
        } else {
          results[key] = 'Failed';
          console.error(`❌ Failed to migrate ${key}:`, await response.text());
        }
      } catch (error) {
        results[key] = 'Error';
        console.error(`❌ Error migrating ${key}:`, error);
      }
    } else {
      results[key] = 'No data';
      console.log(`ℹ️ No data found for ${key}`);
    }
  }

  console.log('Migration results:', results);
  return results;
};

// Migration function to add quantity, unit, and totalAmount fields to existing sales and purchases
const migrateSalesAndPurchasesFields = async () => {
  console.log('Starting migration to add quantity, unit, and totalAmount fields to sales and purchases...');
  
  try {
    // Migrate sales
    const salesResponse = await fetch('/api/sales');
    if (salesResponse.ok) {
      const sales = await salesResponse.json();
      console.log(`Found ${sales.length} sales records to migrate`);
      
      for (const sale of sales) {
        if (!sale.quantity || !sale.unit || !sale.totalAmount) {
          const quantity = sale.quantity || 1
          const amount = sale.amount || 0
          const totalAmount = quantity * amount
          
          const updatedSale = {
            ...sale,
            quantity: quantity,
            unit: sale.unit || 'yard',
            totalAmount: totalAmount
          };
          
          const updateResponse = await fetch('/api/sales', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedSale),
          });
          
          if (updateResponse.ok) {
            console.log(`✅ Updated sale ${sale.id} with quantity, unit, and totalAmount fields`);
          } else {
            console.error(`❌ Failed to update sale ${sale.id}`);
          }
        }
      }
    }
    
    // Migrate purchases
    const purchasesResponse = await fetch('/api/purchases');
    if (purchasesResponse.ok) {
      const purchases = await purchasesResponse.json();
      console.log(`Found ${purchases.length} purchase records to migrate`);
      
      for (const purchase of purchases) {
        if (!purchase.quantity || !purchase.unit || !purchase.totalAmount) {
          const quantity = purchase.quantity || 1
          const amount = purchase.amount || 0
          const totalAmount = quantity * amount
          
          const updatedPurchase = {
            ...purchase,
            quantity: quantity,
            unit: purchase.unit || 'yard',
            totalAmount: totalAmount
          };
          
          const updateResponse = await fetch('/api/purchases', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedPurchase),
          });
          
          if (updateResponse.ok) {
            console.log(`✅ Updated purchase ${purchase.id} with quantity, unit, and totalAmount fields`);
          } else {
            console.error(`❌ Failed to update purchase ${purchase.id}`);
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.migrateLocalStorageToMongoDB = migrateLocalStorageToMongoDB;
  window.migrateSalesAndPurchasesFields = migrateSalesAndPurchasesFields;
}

export { migrateLocalStorageToMongoDB, migrateSalesAndPurchasesFields }; 