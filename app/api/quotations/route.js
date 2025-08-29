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
    
    const quotation = new Quotation(data);
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