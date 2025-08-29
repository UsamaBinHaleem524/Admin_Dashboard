import connectDB from '@/lib/database';
import PurchaseOrder from '@/lib/models/PurchaseOrder';

export async function GET() {
  try {
    await connectDB();
    const purchaseOrders = await PurchaseOrder.find({}).sort({ createdAt: -1 });
    return Response.json(purchaseOrders);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const purchaseOrder = new PurchaseOrder(data);
    await purchaseOrder.save();
    
    return Response.json(purchaseOrder, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, runValidators: true }
    );
    
    if (!purchaseOrder) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }
    
    return Response.json(purchaseOrder);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const purchaseOrder = await PurchaseOrder.findOneAndDelete({ id });
    
    if (!purchaseOrder) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 