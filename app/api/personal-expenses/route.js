import connectDB from '@/lib/database';
import PersonalExpense from '@/lib/models/PersonalExpense';

export async function GET() {
  try {
    await connectDB();
    const personalExpenses = await PersonalExpense.find({}).sort({ createdAt: -1 });
    return Response.json(personalExpenses);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const personalExpense = new PersonalExpense(data);
    await personalExpense.save();
    
    return Response.json(personalExpense, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const personalExpense = await PersonalExpense.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, runValidators: true }
    );
    
    if (!personalExpense) {
      return Response.json({ error: 'Personal expense not found' }, { status: 404 });
    }
    
    return Response.json(personalExpense);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const personalExpense = await PersonalExpense.findOneAndDelete({ id });
    
    if (!personalExpense) {
      return Response.json({ error: 'Personal expense not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Personal expense deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 