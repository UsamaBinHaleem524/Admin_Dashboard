import connectDB from '@/lib/database';
import SupplierTransaction from '@/lib/models/SupplierTransaction';

export async function GET() {
  try {
    await connectDB();
    const transactions = await SupplierTransaction.find({}).sort({ createdAt: -1 });
    return Response.json(transactions);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const transaction = new SupplierTransaction(data);
    await transaction.save();
    
    return Response.json(transaction, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const transaction = await SupplierTransaction.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, runValidators: true }
    );
    
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    return Response.json(transaction);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const transaction = await SupplierTransaction.findOneAndDelete({ id });
    
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 