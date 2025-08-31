import connectDB from '@/lib/database';
import CompanyProfile from '@/lib/models/CompanyProfile';

export async function GET() {
  try {
    await connectDB();
    const companyProfile = await CompanyProfile.findOne({}).sort({ createdAt: -1 });
    return Response.json(companyProfile || {});
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Check if company profile already exists
    const existingProfile = await CompanyProfile.findOne({});
    if (existingProfile) {
      return Response.json({ error: 'Company profile already exists. Use PUT to update.' }, { status: 400 });
    }
    
    const companyProfile = new CompanyProfile(data);
    await companyProfile.save();
    
    return Response.json(companyProfile, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const companyProfile = await CompanyProfile.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, runValidators: true, upsert: true }
    );
    
    return Response.json(companyProfile);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const companyProfile = await CompanyProfile.findOneAndDelete({ id });
    
    if (!companyProfile) {
      return Response.json({ error: 'Company profile not found' }, { status: 404 });
    }
    
    return Response.json({ message: 'Company profile deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 