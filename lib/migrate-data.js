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

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.migrateLocalStorageToMongoDB = migrateLocalStorageToMongoDB;
}

export { migrateLocalStorageToMongoDB }; 