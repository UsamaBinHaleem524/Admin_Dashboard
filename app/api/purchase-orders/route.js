import connectDB from '@/lib/database';
import PurchaseOrder from '@/lib/models/PurchaseOrder';

export async function GET() {
  try {
    await connectDB();
    // Sort by date ascending (oldest first), then by createdAt ascending
    // This ensures that newly added purchase orders appear at the bottom
    const purchaseOrders = await PurchaseOrder.find({}).sort({ date: 1, createdAt: 1 });
    return Response.json(purchaseOrders);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.userDefinedId || !data.supplier || !data.date || !data.items || !data.currency) {
      return Response.json({ error: 'Missing required fields: userDefinedId, supplier, date, items, currency' }, { status: 400 });
    }
    
    // Check if userDefinedId already exists
    const existingPurchaseOrder = await PurchaseOrder.findOne({ userDefinedId: data.userDefinedId });
    if (existingPurchaseOrder) {
      return Response.json({ error: 'Purchase Order ID already exists. Please use a different ID.' }, { status: 400 });
    }
    
    // Generate internal ID
    const internalId = `po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const purchaseOrder = new PurchaseOrder({
      ...data,
      id: internalId,
    });
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
    
    // Validate required fields
    if (!data.id || !data.userDefinedId || !data.supplier || !data.date || !data.items || !data.currency) {
      return Response.json({ error: 'Missing required fields: id, userDefinedId, supplier, date, items, currency' }, { status: 400 });
    }
    
    // Check if userDefinedId already exists for a different purchase order
    const existingPurchaseOrder = await PurchaseOrder.findOne({ 
      userDefinedId: data.userDefinedId,
      id: { $ne: data.id } // Exclude current purchase order from check
    });
    if (existingPurchaseOrder) {
      return Response.json({ error: 'Purchase Order ID already exists. Please use a different ID.' }, { status: 400 });
    }
    
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