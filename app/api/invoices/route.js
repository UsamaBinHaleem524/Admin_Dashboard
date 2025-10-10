import connectDB from '@/lib/database';
import Invoice from '@/lib/models/Invoice';

export async function GET() {
  try {
    await connectDB();
    // Sort by date ascending (oldest first), then by createdAt ascending
    // This ensures that newly added invoices appear at the bottom
    const invoices = await Invoice.find({}).sort({ date: 1, createdAt: 1 });
    return Response.json(invoices);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.userDefinedId || !data.customer || !data.date || !data.invoiceType || !data.items || !data.currency) {
      return Response.json({ error: 'Missing required fields: userDefinedId, customer, date, invoiceType, items, currency' }, { status: 400 });
    }
    
    // Check if userDefinedId already exists
    const existingInvoice = await Invoice.findOne({ userDefinedId: data.userDefinedId });
    if (existingInvoice) {
      return Response.json({ error: 'Invoice ID already exists. Please use a different ID.' }, { status: 400 });
    }
    
    // Generate internal ID
    const internalId = `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const invoice = new Invoice({
      ...data,
      id: internalId,
    });
    await invoice.save();
    
    return Response.json(invoice, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.id || !data.userDefinedId || !data.customer || !data.date || !data.invoiceType || !data.items || !data.currency) {
      return Response.json({ error: 'Missing required fields: id, userDefinedId, customer, date, invoiceType, items, currency' }, { status: 400 });
    }
    
    // Check if userDefinedId already exists for a different invoice
    const existingInvoice = await Invoice.findOne({ 
      userDefinedId: data.userDefinedId,
      id: { $ne: data.id } // Exclude current invoice from check
    });
    if (existingInvoice) {
      return Response.json({ error: 'Invoice ID already exists. Please use a different ID.' }, { status: 400 });
    }
    
    const invoice = await Invoice.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return Response.json(invoice);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const invoice = await Invoice.findOneAndDelete({ id });
    
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 