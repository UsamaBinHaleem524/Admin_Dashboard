import connectDB from '@/lib/database';
import Setting from '@/lib/models/Setting';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (key) {
      const setting = await Setting.findOne({ key });
      return Response.json(setting || { key, value: '' });
    }
    const settings = await Setting.find({});
    return Response.json(settings);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { key, value } = await request.json();
    if (!key) return Response.json({ error: 'Missing key' }, { status: 400 });

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true, runValidators: true }
    );
    return Response.json(setting);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
