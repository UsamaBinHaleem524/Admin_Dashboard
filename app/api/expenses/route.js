import connectDB from '@/lib/database';
import DailyExpense from '@/lib/models/Expense';

export async function GET() {
  try {
    await connectDB();
    const expenses = await DailyExpense.find({}).sort({ date: -1 });
    return Response.json(expenses);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const expense = new DailyExpense(data);
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
    
    const expense = await DailyExpense.findOneAndUpdate(
      { date: data.date },
      data,
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
    const date = searchParams.get('date');
    
    const expense = await DailyExpense.findOneAndDelete({ date });
    
    if (!expense) {
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 