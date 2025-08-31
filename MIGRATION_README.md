# MongoDB Migration Guide

This guide explains how to migrate your admin dashboard from LocalStorage to MongoDB Atlas.

## Prerequisites

1. **MongoDB Atlas Account**: You need a MongoDB Atlas account with a cluster set up
2. **Connection String**: Your MongoDB connection string (replace `<db_password>` with your actual password)
3. **Node.js**: Version 16 or higher (recommended 18+)

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in your project root with your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://usamabinhaleem524:<your_actual_password>@cluster0.qjycnpx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

### 2. Install Dependencies

The required dependencies have already been installed:
- `mongoose`: MongoDB ODM for Node.js
- `mongodb`: MongoDB driver for Node.js

### 3. Database Connection

The database connection is handled by `lib/database.js` which:
- Uses connection pooling for better performance
- Implements caching to avoid repeated connections
- Handles connection errors gracefully

### 4. API Routes

All CRUD operations are now handled by API routes in the `app/api/` directory:
- `/api/products` - Product management
- `/api/sales` - Sales management
- `/api/purchases` - Purchase management
- `/api/expenses` - Expense tracking
- `/api/invoices` - Invoice management
- `/api/quotations` - Quotation management
- `/api/purchase-orders` - Purchase order management
- `/api/customer-transactions` - Customer ledger
- `/api/supplier-transactions` - Supplier ledger
- `/api/shop-expenses` - Shop expense management

### 5. Data Migration

If you have existing data in LocalStorage, you can migrate it to MongoDB:

#### Option 1: Browser Console Migration

1. Open your application in the browser
2. Open the browser console (F12)
3. Run the migration script:

```javascript
// Import the migration utility
import('/lib/migrate-data.js').then(() => {
  // Run the migration
  window.migrateLocalStorageToMongoDB().then(results => {
    console.log('Migration completed:', results);
  });
});
```

#### Option 2: Manual Migration

You can manually copy data from LocalStorage and insert it into MongoDB collections using the API endpoints.

### 6. Sales and Purchases Field Migration

After adding quantity, unit, and totalAmount fields to sales and purchases, you may need to migrate existing records:

#### Browser Console Migration

1. Open your application in the browser
2. Open the browser console (F12)
3. Run the field migration script:

```javascript
// Import the migration utility
import('/lib/migrate-data.js').then(() => {
  // Run the field migration
  window.migrateSalesAndPurchasesFields().then(() => {
    console.log('Field migration completed');
  });
});
```

This will add default values (quantity: 1, unit: 'yard', totalAmount: calculated from quantity × amount) to any existing sales and purchases records that don't have these fields.

### 7. Authentication

Authentication has been updated to use `sessionStorage` instead of `localStorage` for better security. The session will persist until the browser tab is closed.

## Features

### ✅ What's Been Migrated

1. **All CRUD Operations**: Create, Read, Update, Delete for all entities
2. **Search & Filtering**: All search and filter functionality preserved
3. **Data Validation**: MongoDB schema validation for data integrity
4. **Error Handling**: Comprehensive error handling with user-friendly messages
5. **Performance**: Optimized queries with proper indexing
6. **Security**: Session-based authentication

### 🔧 Technical Improvements

1. **Database Schema**: Proper MongoDB schemas with validation
2. **API Layer**: RESTful API endpoints for all operations
3. **Connection Management**: Efficient database connection handling
4. **Error Recovery**: Graceful error handling and recovery
5. **Data Consistency**: ACID compliance through MongoDB transactions

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `PUT /api/products` - Update existing product
- `DELETE /api/products?id={id}` - Delete product

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create new sale
- `PUT /api/sales` - Update existing sale
- `DELETE /api/sales?id={id}` - Delete sale

### Purchases
- `GET /api/purchases` - Get all purchases
- `POST /api/purchases` - Create new purchase
- `PUT /api/purchases` - Update existing purchase
- `DELETE /api/purchases?id={id}` - Delete purchase

### Expenses
- `GET /api/expenses` - Get all daily expenses
- `POST /api/expenses` - Create new daily expense
- `PUT /api/expenses` - Update existing daily expense
- `DELETE /api/expenses?date={date}` - Delete daily expense

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices` - Update existing invoice
- `DELETE /api/invoices?id={id}` - Delete invoice

### Quotations
- `GET /api/quotations` - Get all quotations
- `POST /api/quotations` - Create new quotation
- `PUT /api/quotations` - Update existing quotation
- `DELETE /api/quotations?id={id}` - Delete quotation

### Purchase Orders
- `GET /api/purchase-orders` - Get all purchase orders
- `POST /api/purchase-orders` - Create new purchase order
- `PUT /api/purchase-orders` - Update existing purchase order
- `DELETE /api/purchase-orders?id={id}` - Delete purchase order

### Customer Transactions
- `GET /api/customer-transactions` - Get all customer transactions
- `POST /api/customer-transactions` - Create new customer transaction
- `PUT /api/customer-transactions` - Update existing customer transaction
- `DELETE /api/customer-transactions?id={id}` - Delete customer transaction

### Supplier Transactions
- `GET /api/supplier-transactions` - Get all supplier transactions
- `POST /api/supplier-transactions` - Create new supplier transaction
- `PUT /api/supplier-transactions` - Update existing supplier transaction
- `DELETE /api/supplier-transactions?id={id}` - Delete supplier transaction

### Shop Expenses
- `GET /api/shop-expenses` - Get all shop expenses
- `POST /api/shop-expenses` - Create new shop expense
- `PUT /api/shop-expenses` - Update existing shop expense
- `DELETE /api/shop-expenses?id={id}` - Delete shop expense

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure your MongoDB connection string is correct and the network allows connections
2. **Authentication Errors**: Check that your MongoDB user has the correct permissions
3. **Data Migration Issues**: Verify that the data format matches the expected schema

### Performance Tips

1. **Indexing**: MongoDB automatically creates indexes on `_id` fields
2. **Connection Pooling**: The connection is cached for better performance
3. **Query Optimization**: Use specific field selection to reduce data transfer

## Security Considerations

1. **Environment Variables**: Never commit your MongoDB connection string to version control
2. **Input Validation**: All user inputs are validated through MongoDB schemas
3. **Session Management**: Authentication uses sessionStorage for better security
4. **Error Handling**: Sensitive information is not exposed in error messages

## Support

If you encounter any issues during migration:

1. Check the browser console for error messages
2. Verify your MongoDB connection string
3. Ensure all dependencies are properly installed
4. Check that your MongoDB cluster is accessible

## Next Steps

After successful migration:

1. Test all functionality to ensure data integrity
2. Monitor database performance
3. Consider implementing additional security measures
4. Set up database backups
5. Consider implementing user roles and permissions

---

**Note**: This migration maintains all existing functionality while providing a more robust, scalable, and secure data storage solution. 