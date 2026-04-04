import connectDB from '@/lib/database';
import Khata from '@/lib/models/Khata';

export async function GET() {
  try {
    await connectDB();
    const khatas = await Khata.find({}).sort({ createdAt: -1 });
    return Response.json(khatas);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.name || !data.startDate || !data.endDate) {
      return Response.json({ error: 'Missing required fields: name, startDate, endDate' }, { status: 400 });
    }

    // Close any currently active khata
    await Khata.updateMany({ status: 'active' }, { status: 'closed' });

    const khata = new Khata({
      id: Date.now().toString(),
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'active',
    });
    await khata.save();

    return Response.json(khata, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.id) {
      return Response.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const khata = await Khata.findOneAndUpdate(
      { id: data.id },
      { name: data.name, startDate: data.startDate, endDate: data.endDate, status: data.status },
      { new: true, runValidators: true }
    );

    if (!khata) {
      return Response.json({ error: 'Khata not found' }, { status: 404 });
    }

    return Response.json(khata);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const khata = await Khata.findOneAndDelete({ id });

    if (!khata) {
      return Response.json({ error: 'Khata not found' }, { status: 404 });
    }

    return Response.json({ message: 'Khata deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
