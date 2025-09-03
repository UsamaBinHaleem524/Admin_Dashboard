import connectDB from '@/lib/database';
import Quotation from '@/lib/models/Quotation';

export async function GET() {
  try {
    await connectDB();
    const quotations = await Quotation.find({}).sort({ createdAt: -1 });
    return Response.json(quotations);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.userDefinedId || !data.date || !data.items || !data.currency) {
      return Response.json({ error: 'Missing required fields: userDefinedId, date, items, currency' }, { status: 400 });
    }
    
    // Check if userDefinedId already exists
    const existingQuotation = await Quotation.findOne({ userDefinedId: data.userDefinedId });
    if (existingQuotation) {
      return Response.json({ error: 'Quotation ID already exists. Please use a different ID.' }, { status: 400 });
    }
    
    // Generate internal ID
    const internalId = `quotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const quotation = new Quotation({
      ...data,
      id: internalId,
    });
    await quotation.save();
    
    return Response.json(quotation, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.id || !data.userDefinedId || !data.date || !data.items || !data.currency) {
      return Response.json({ error: 'Missing required fields: id, userDefinedId, date, items, currency' }, { status: 400 });
    }
    
    // Check if userDefinedId already exists for a different quotation
    const existingQuotation = await Quotation.findOne({ 
      userDefinedId: data.userDefinedId,
      id: { $ne: data.id } // Exclude current quotation from check
    });
    if (existingQuotation) {
      return Response.json({ error: 'Quotation ID already exists. Please use a different ID.' }, { status: 400 });
    }
    
    const quotation = await Quotation.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, runValidators: true }
    );
    
    if (!quotation) {
      return Response.json({ error: 'Quotation not found' }, { status: 404 });
    }
    
    return Response.json(quotation);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const quotation = await Quotation.findOneAndDelete({ id });
    
    if (!quotation) {
      return Response.json({ error: 'Quotation not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 