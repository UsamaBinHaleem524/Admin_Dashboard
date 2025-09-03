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

// Migration function to convert old customer transactions to new format
const migrateCustomerTransactionsToNewFormat = async () => {
  console.log('Starting migration to convert customer transactions to new format...');
  
  try {
    const response = await fetch('/api/customer-transactions');
    if (response.ok) {
      const transactions = await response.json();
      console.log(`Found ${transactions.length} customer transaction records to migrate`);
      
      // Group transactions by customer
      const customerGroups = {};
      transactions.forEach(transaction => {
        if (!customerGroups[transaction.customer]) {
          customerGroups[transaction.customer] = [];
        }
        customerGroups[transaction.customer].push(transaction);
      });
      
      // Calculate balance for each customer's transactions
      for (const [customer, customerTransactions] of Object.entries(customerGroups)) {
        let runningBalance = 0;
        
        // Sort transactions by creation date
        const sortedTransactions = customerTransactions.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        for (const transaction of sortedTransactions) {
          // Calculate balance: credit increases, debit decreases
          const credit = transaction.credit || 0;
          const debit = transaction.debit || 0;
          runningBalance = runningBalance + credit - debit;
          
          // Update transaction with calculated balance
          const updatedTransaction = {
            id: transaction.id,
            customer: transaction.customer,
            description: transaction.description || 'Migrated transaction',
            date: transaction.date,
            currency: transaction.currency,
            debit: transaction.debit || 0,
            credit: transaction.credit || 0,
            balance: runningBalance
          };
          
          const updateResponse = await fetch('/api/customer-transactions', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedTransaction),
          });
          
          if (updateResponse.ok) {
            console.log(`✅ Updated transaction ${transaction.id} for customer ${customer} with balance ${runningBalance}`);
          } else {
            console.error(`❌ Failed to update transaction ${transaction.id} for customer ${customer}`);
          }
        }
      }
    }
    
    console.log('✅ Customer transactions migration completed successfully');
  } catch (error) {
    console.error('❌ Customer transactions migration failed:', error);
  }
};

// Migration function to convert old supplier transactions to new format
const migrateSupplierTransactionsToNewFormat = async () => {
  console.log('Starting migration to convert supplier transactions to new format...');
  
  try {
    const response = await fetch('/api/supplier-transactions');
    if (response.ok) {
      const transactions = await response.json();
      console.log(`Found ${transactions.length} supplier transaction records to migrate`);
      
      // Group transactions by supplier
      const supplierGroups = {};
      transactions.forEach(transaction => {
        if (!supplierGroups[transaction.supplier]) {
          supplierGroups[transaction.supplier] = [];
        }
        supplierGroups[transaction.supplier].push(transaction);
      });
      
      // Calculate balance for each supplier's transactions
      for (const [supplier, supplierTransactions] of Object.entries(supplierGroups)) {
        let runningBalance = 0;
        
        // Sort transactions by creation date
        const sortedTransactions = supplierTransactions.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        for (const transaction of sortedTransactions) {
          // Calculate balance: credit increases, debit decreases
          const credit = transaction.credit || 0;
          const debit = transaction.debit || 0;
          runningBalance = runningBalance + credit - debit;
          
          // Update transaction with calculated balance
          const updatedTransaction = {
            id: transaction.id,
            supplier: transaction.supplier,
            description: transaction.description || 'Migrated transaction',
            date: transaction.date,
            currency: transaction.currency,
            debit: transaction.debit || 0,
            credit: transaction.credit || 0,
            balance: runningBalance
          };
          
          const updateResponse = await fetch('/api/supplier-transactions', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedTransaction),
          });
          
          if (updateResponse.ok) {
            console.log(`✅ Updated transaction ${transaction.id} for supplier ${supplier} with balance ${runningBalance}`);
          } else {
            console.error(`❌ Failed to update transaction ${transaction.id} for supplier ${supplier}`);
          }
        }
      }
    }
    
    console.log('✅ Supplier transactions migration completed successfully');
  } catch (error) {
    console.error('❌ Supplier transactions migration failed:', error);
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.migrateLocalStorageToMongoDB = migrateLocalStorageToMongoDB;
  window.migrateSalesAndPurchasesFields = migrateSalesAndPurchasesFields;
  window.migrateCustomerTransactionsToNewFormat = migrateCustomerTransactionsToNewFormat;
  window.migrateSupplierTransactionsToNewFormat = migrateSupplierTransactionsToNewFormat;
}

export { migrateLocalStorageToMongoDB, migrateSalesAndPurchasesFields, migrateCustomerTransactionsToNewFormat, migrateSupplierTransactionsToNewFormat }; 