import connectDB from '@/lib/database';
import Sale from '@/lib/models/Sale';

// Migration function to convert old data format to new format
const migrateOldData = async () => {
  try {
    const oldSales = await Sale.find({
      $or: [
        { quantity: { $exists: true } },
        { unit: { $exists: true } },
        { totalAmount: { $exists: true } }
      ]
    });

    console.log(`Found ${oldSales.length} old format sales to migrate`);

    for (const oldSale of oldSales) {
      // Convert old format to new format
      const newSale = {
        id: oldSale.id,
        customer: oldSale.customer,
        description: oldSale.description || 'Migrated sale',
        amount: oldSale.amount || oldSale.totalAmount || 0,
        currency: 'USD', // Default to USD for migrated data
        date: oldSale.date,
      };

      // Update the sale
      await Sale.findOneAndUpdate(
        { id: oldSale.id },
        newSale,
        { new: true, runValidators: true }
      );
    }

    console.log('Sales migration completed successfully');
  } catch (error) {
    console.error('Sales migration failed:', error);
  }
};

export async function GET() {
  try {
    await connectDB();
    
    // Run migration if needed
    await migrateOldData();
    
    const sales = await Sale.find({}).sort({ createdAt: -1 });
    
    // Ensure all sales have the new fields with default values
    const processedSales = sales.map(sale => ({
      ...sale.toObject(),
      amount: sale.amount || 0,
      currency: sale.currency || 'USD'
    }));
    
    return Response.json(processedSales);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.customer || !data.item || !data.description || !data.amount || !data.date || !data.currency) {
      return Response.json({ error: 'Missing required fields: customer, item, description, amount, date, currency' }, { status: 400 });
    }
    
    const sale = new Sale({
      ...data,
      amount: Number(data.amount) || 0,
      currency: data.currency || 'USD'
    });
    await sale.save();
    
    return Response.json(sale, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.customer || !data.item || !data.description || !data.amount || !data.date || !data.currency) {
      return Response.json({ error: 'Missing required fields: customer, item, description, amount, date, currency' }, { status: 400 });
    }
    
    const sale = await Sale.findOneAndUpdate(
      { id: data.id },
      { 
        ...data,
        amount: Number(data.amount) || 0,
        currency: data.currency || 'USD'
      },
      { new: true, runValidators: true }
    );
    
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    
    return Response.json(sale);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const sale = await Sale.findOneAndDelete({ id });
    
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 