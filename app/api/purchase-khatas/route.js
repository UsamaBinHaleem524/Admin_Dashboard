import connectDB from '@/lib/database'

const PurchaseKhata = require('@/lib/models/PurchaseKhata')

export async function GET() {
  try {
    await connectDB()
    const khatas = await PurchaseKhata.find({}).sort({ createdAt: -1 })
    return Response.json(khatas)
  } catch (error) {
    console.error('Error fetching purchase khatas:', error)
    return Response.json({ error: 'Failed to fetch purchase khatas' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const body = await request.json()
    
    // Close all existing active khatas
    await PurchaseKhata.updateMany(
      { status: 'active' },
      { status: 'closed' }
    )
    
    // Create new active khata
    const newKhata = await PurchaseKhata.create({
      id: Date.now().toString(),
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
      status: 'active',
    })
    
    return Response.json(newKhata, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase khata:', error)
    return Response.json({ error: 'Failed to create purchase khata' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    await connectDB()
    const body = await request.json()
    
    const updatedKhata = await PurchaseKhata.findOneAndUpdate(
      { id: body.id },
      {
        name: body.name,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status,
      },
      { new: true }
    )
    
    if (!updatedKhata) {
      return Response.json({ error: 'Purchase Khata not found' }, { status: 404 })
    }
    
    return Response.json(updatedKhata)
  } catch (error) {
    console.error('Error updating purchase khata:', error)
    return Response.json({ error: 'Failed to update purchase khata' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }
    
    const deletedKhata = await PurchaseKhata.findOneAndDelete({ id })
    
    if (!deletedKhata) {
      return Response.json({ error: 'Purchase Khata not found' }, { status: 404 })
    }
    
    return Response.json({ message: 'Purchase Khata deleted successfully' })
  } catch (error) {
    console.error('Error deleting purchase khata:', error)
    return Response.json({ error: 'Failed to delete purchase khata' }, { status: 500 })
  }
}
