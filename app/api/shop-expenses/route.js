import connectDB from '@/lib/database';
import ShopExpense from '@/lib/models/ShopExpense';

// Migration function to convert old data format to new format
const migrateOldData = async () => {
  try {
    const oldExpenses = await ShopExpense.find({
      amount: { $exists: true }
    });

    console.log(`Found ${oldExpenses.length} old format shop expenses to migrate`);

    for (const oldExpense of oldExpenses) {
      // Convert old format to new format
      const newExpense = {
        id: oldExpense.id,
        description: oldExpense.description || 'Migrated expense',
        date: oldExpense.date,
        previousAmount: 0,
        income: 0,
        outgoingAmount: oldExpense.amount || 0,
        totalCash: -(oldExpense.amount || 0), // Negative since it was an expense
        currency: oldExpense.currency || 'USD',
      };

      // Update the expense
      await ShopExpense.findOneAndUpdate(
        { id: oldExpense.id },
        newExpense,
        { new: true, runValidators: true }
      );
    }

    console.log('Shop expenses migration completed successfully');
  } catch (error) {
    console.error('Shop expenses migration failed:', error);
  }
};

export async function GET() {
  try {
    await connectDB();
    
    // Run migration if needed
    await migrateOldData();
    
    const shopExpenses = await ShopExpense.find({}).sort({ createdAt: -1 });
    
    // Ensure all expenses have the new fields with default values
    const processedExpenses = shopExpenses.map(expense => ({
      ...expense.toObject(),
      previousAmount: expense.previousAmount || 0,
      income: expense.income || 0,
      outgoingAmount: expense.outgoingAmount || 0,
      totalCash: expense.totalCash || 0,
      currency: expense.currency || 'USD'
    }));
    
    return Response.json(processedExpenses);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.description || !data.date || !data.currency) {
      return Response.json({ error: 'Missing required fields: description, date, currency' }, { status: 400 });
    }
    
    // Calculate total cash: (Previous Amount + Income) - Outgoing Amount
    const previousAmount = Number(data.previousAmount) || 0
    const income = Number(data.income) || 0
    const outgoingAmount = Number(data.outgoingAmount) || 0
    const totalCash = (previousAmount + income) - outgoingAmount
    
    const shopExpense = new ShopExpense({
      ...data,
      previousAmount,
      income,
      outgoingAmount,
      totalCash,
      currency: data.currency || 'USD'
    });
    await shopExpense.save();
    
    return Response.json(shopExpense, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.description || !data.date || !data.currency) {
      return Response.json({ error: 'Missing required fields: description, date, currency' }, { status: 400 });
    }
    
    // Calculate total cash: (Previous Amount + Income) - Outgoing Amount
    const previousAmount = Number(data.previousAmount) || 0
    const income = Number(data.income) || 0
    const outgoingAmount = Number(data.outgoingAmount) || 0
    const totalCash = (previousAmount + income) - outgoingAmount
    
    const shopExpense = await ShopExpense.findOneAndUpdate(
      { id: data.id },
      { 
        ...data,
        previousAmount,
        income,
        outgoingAmount,
        totalCash,
        currency: data.currency || 'USD'
      },
      { new: true, runValidators: true }
    );
    
    if (!shopExpense) {
      return Response.json({ error: 'Shop expense not found' }, { status: 404 });
    }
    
    return Response.json(shopExpense);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const shopExpense = await ShopExpense.findOneAndDelete({ id });
    
    if (!shopExpense) {
      return Response.json({ error: 'Shop expense not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Shop expense deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 