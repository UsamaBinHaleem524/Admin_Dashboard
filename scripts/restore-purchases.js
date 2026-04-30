const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const Purchase = require('../lib/models/Purchase');
const PurchaseOrder = require('../lib/models/PurchaseOrder');

async function restorePurchases(backupFileName) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    const backupDir = path.join(__dirname, '../backups');
    const backupFile = path.join(backupDir, backupFileName);

    // Check if backup file exists
    if (!fs.existsSync(backupFile)) {
      console.error(`\nError: Backup file not found: ${backupFile}`);
      console.log('\nAvailable backup files:');
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
      files.forEach(file => console.log(`  - ${file}`));
      process.exit(1);
    }

    console.log(`\nReading backup file: ${backupFile}`);
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    let purchases, purchaseOrders;

    // Check if it's a combined backup or separate
    if (backupData.purchases && backupData.purchaseOrders) {
      purchases = backupData.purchases;
      purchaseOrders = backupData.purchaseOrders;
      console.log(`Backup created on: ${backupData.backupDate}`);
    } else if (Array.isArray(backupData)) {
      // Single type backup
      if (backupFileName.includes('purchase-orders')) {
        purchaseOrders = backupData;
        purchases = [];
      } else {
        purchases = backupData;
        purchaseOrders = [];
      }
    } else {
      console.error('Invalid backup file format');
      process.exit(1);
    }

    // Restore purchases
    if (purchases && purchases.length > 0) {
      console.log(`\nRestoring ${purchases.length} purchases...`);
      
      for (const purchase of purchases) {
        try {
          // Remove MongoDB _id to let it generate new ones
          delete purchase._id;
          
          // Check if purchase with this ID already exists
          const existing = await Purchase.findOne({ id: purchase.id });
          if (existing) {
            console.log(`  - Purchase ${purchase.id} already exists, skipping...`);
          } else {
            await Purchase.create(purchase);
            console.log(`  ✓ Restored purchase ${purchase.id}`);
          }
        } catch (error) {
          console.error(`  ✗ Error restoring purchase ${purchase.id}:`, error.message);
        }
      }
    }

    // Restore purchase orders
    if (purchaseOrders && purchaseOrders.length > 0) {
      console.log(`\nRestoring ${purchaseOrders.length} purchase orders...`);
      
      for (const order of purchaseOrders) {
        try {
          // Remove MongoDB _id to let it generate new ones
          delete order._id;
          if (order.items) {
            order.items.forEach(item => delete item._id);
          }
          
          // Check if purchase order with this ID already exists
          const existing = await PurchaseOrder.findOne({ id: order.id });
          if (existing) {
            console.log(`  - Purchase order ${order.userDefinedId} already exists, skipping...`);
          } else {
            await PurchaseOrder.create(order);
            console.log(`  ✓ Restored purchase order ${order.userDefinedId}`);
          }
        } catch (error) {
          console.error(`  ✗ Error restoring purchase order ${order.userDefinedId}:`, error.message);
        }
      }
    }

    console.log('\n✓ Restore completed successfully!');

  } catch (error) {
    console.error('Error during restore:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

// Get backup file name from command line argument
const backupFileName = process.argv[2];

if (!backupFileName) {
  console.error('Please provide a backup file name');
  console.log('Usage: node restore-purchases.js <backup-file-name>');
  console.log('Example: node restore-purchases.js all-purchases_2026-04-30T11-30-00-000Z.json');
  process.exit(1);
}

// Run the restore
restorePurchases(backupFileName);
