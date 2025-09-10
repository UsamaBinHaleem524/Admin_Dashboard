import connectDB from '@/lib/database';
import Purchase from '@/lib/models/Purchase';

// Migration function to convert old data format to new format
const migrateOldData = async () => {
  try {
    const oldPurchases = await Purchase.find({
      $or: [
        { quantity: { $exists: true } },
        { unit: { $exists: true } },
        { totalAmount: { $exists: true } }
      ]
    });

    console.log(`Found ${oldPurchases.length} old format purchases to migrate`);

    for (const oldPurchase of oldPurchases) {
      // Convert old format to new format
      const newPurchase = {
        id: oldPurchase.id,
        supplier: oldPurchase.supplier,
        description: oldPurchase.description || 'Migrated purchase',
        amount: oldPurchase.amount || oldPurchase.totalAmount || 0,
        currency: 'USD', // Default to USD for migrated data
        date: oldPurchase.date,
      };

      // Update the purchase
      await Purchase.findOneAndUpdate(
        { id: oldPurchase.id },
        newPurchase,
        { new: true, runValidators: true }
      );
    }

    console.log('Purchases migration completed successfully');
  } catch (error) {
    console.error('Purchases migration failed:', error);
  }
};

export async function GET() {
  try {
    await connectDB();
    
    // Run migration if needed
    await migrateOldData();
    
    const purchases = await Purchase.find({}).sort({ createdAt: -1 });
    
    // Ensure all purchases have the new fields with default values
    const processedPurchases = purchases.map(purchase => ({
      ...purchase.toObject(),
      amount: purchase.amount || 0,
      currency: purchase.currency || 'USD'
    }));
    
    return Response.json(processedPurchases);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.supplier || !data.item || !data.description || !data.amount || !data.date || !data.currency) {
      return Response.json({ error: 'Missing required fields: supplier, item, description, amount, date, currency' }, { status: 400 });
    }
    
    const purchase = new Purchase({
      ...data,
      amount: Number(data.amount) || 0,
      currency: data.currency || 'USD'
    });
    await purchase.save();
    
    return Response.json(purchase, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.supplier || !data.item || !data.description || !data.amount || !data.date || !data.currency) {
      return Response.json({ error: 'Missing required fields: supplier, item, description, amount, date, currency' }, { status: 400 });
    }
    
    const purchase = await Purchase.findOneAndUpdate(
      { id: data.id },
      { 
        ...data,
        amount: Number(data.amount) || 0,
        currency: data.currency || 'USD'
      },
      { new: true, runValidators: true }
    );
    
    if (!purchase) {
      return Response.json({ error: 'Purchase not found' }, { status: 404 });
    }
    
    return Response.json(purchase);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const purchase = await Purchase.findOneAndDelete({ id });
    
    if (!purchase) {
      return Response.json({ error: 'Purchase not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 