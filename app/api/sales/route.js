import connectDB from '@/lib/database';
import Sale from '@/lib/models/Sale';

export async function GET() {
  try {
    await connectDB();
    const sales = await Sale.find({}).sort({ createdAt: -1 });
    return Response.json(sales);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const sale = new Sale(data);
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
    
    const sale = await Sale.findOneAndUpdate(
      { id: data.id },
      data,
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