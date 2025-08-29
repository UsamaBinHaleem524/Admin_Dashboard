import connectDB from '@/lib/database';
import ShopExpense from '@/lib/models/ShopExpense';

export async function GET() {
  try {
    await connectDB();
    const shopExpenses = await ShopExpense.find({}).sort({ createdAt: -1 });
    return Response.json(shopExpenses);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const shopExpense = new ShopExpense(data);
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
    
    const shopExpense = await ShopExpense.findOneAndUpdate(
      { id: data.id },
      data,
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