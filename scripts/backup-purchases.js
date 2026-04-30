const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const Purchase = require('../lib/models/Purchase');
const PurchaseOrder = require('../lib/models/PurchaseOrder');

async function backupPurchases() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // Fetch all purchases
    console.log('\nFetching purchases...');
    const purchases = await Purchase.find({}).lean();
    console.log(`Found ${purchases.length} purchases`);

    // Fetch all purchase orders
    console.log('Fetching purchase orders...');
    const purchaseOrders = await PurchaseOrder.find({}).lean();
    console.log(`Found ${purchaseOrders.length} purchase orders`);

    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate timestamp for backup files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save purchases to JSON file
    const purchasesFile = path.join(backupDir, `purchases_${timestamp}.json`);
    fs.writeFileSync(purchasesFile, JSON.stringify(purchases, null, 2));
    console.log(`\n✓ Purchases backed up to: ${purchasesFile}`);

    // Save purchase orders to JSON file
    const purchaseOrdersFile = path.join(backupDir, `purchase-orders_${timestamp}.json`);
    fs.writeFileSync(purchaseOrdersFile, JSON.stringify(purchaseOrders, null, 2));
    console.log(`✓ Purchase orders backed up to: ${purchaseOrdersFile}`);

    // Create a combined backup file
    const combinedFile = path.join(backupDir, `all-purchases_${timestamp}.json`);
    fs.writeFileSync(combinedFile, JSON.stringify({
      purchases,
      purchaseOrders,
      backupDate: new Date().toISOString(),
      totalPurchases: purchases.length,
      totalPurchaseOrders: purchaseOrders.length
    }, null, 2));
    console.log(`✓ Combined backup saved to: ${combinedFile}`);

    console.log('\n✓ Backup completed successfully!');
    console.log(`Total files backed up: ${purchases.length + purchaseOrders.length}`);

  } catch (error) {
    console.error('Error during backup:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

// Run the backup
backupPurchases();
