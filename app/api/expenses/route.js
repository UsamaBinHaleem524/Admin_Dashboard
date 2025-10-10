import connectDB from '@/lib/database';
import Expense from '@/lib/models/Expense';
import mongoose from 'mongoose';

// Migration function to convert old daily expense data to new format
const migrateOldData = async () => {
  try {
    // Check if there are any old daily expense documents
    const oldModel = mongoose.models.DailyExpense || mongoose.model('DailyExpense', new mongoose.Schema({}));
    const oldExpenses = await oldModel.find({});
    
    if (oldExpenses.length > 0) {
      console.log('Migrating old daily expense data to new format...');
      
      for (const dailyExpense of oldExpenses) {
        for (const expenseItem of dailyExpense.expenses) {
          const newExpense = new Expense({
            id: `${dailyExpense.date}-${expenseItem.name}-${Date.now()}`,
            description: expenseItem.description,
            date: dailyExpense.date,
            amount: expenseItem.amount,
            currency: 'USD', // Default currency for migrated data
          });
          await newExpense.save();
        }
      }
      
      // Delete old data after migration
      await oldModel.deleteMany({});
      console.log('Migration completed successfully');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
};

export async function GET() {
  try {
    await connectDB();
    
    // Run migration on first GET request
    await migrateOldData();
    
    // Sort by date ascending (oldest first), then by createdAt ascending
    // This ensures that newly added expenses appear at the bottom
    const expenses = await Expense.find({}).sort({ date: 1, createdAt: 1 });
    return Response.json(expenses);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.description || !data.date || !data.amount || !data.currency) {
      return Response.json({ error: 'Missing required fields: description, date, amount, currency' }, { status: 400 });
    }
    
    // Generate unique ID
    const id = `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const expense = new Expense({
      ...data,
      id,
      amount: Number(data.amount),
    });
    await expense.save();
    
    return Response.json(expense, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.id || !data.description || !data.date || !data.amount || !data.currency) {
      return Response.json({ error: 'Missing required fields: id, description, date, amount, currency' }, { status: 400 });
    }
    
    const expense = await Expense.findOneAndUpdate(
      { id: data.id },
      {
        ...data,
        amount: Number(data.amount),
      },
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    return Response.json(expense);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const expense = await Expense.findOneAndDelete({ id });
    
    if (!expense) {
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 