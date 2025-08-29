import connectDB from '@/lib/database';
import Purchase from '@/lib/models/Purchase';

export async function GET() {
  try {
    await connectDB();
    const purchases = await Purchase.find({}).sort({ createdAt: -1 });
    return Response.json(purchases);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const purchase = new Purchase(data);
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
    
    const purchase = await Purchase.findOneAndUpdate(
      { id: data.id },
      data,
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