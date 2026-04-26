import connectDB from '@/lib/database';
import User from '@/lib/models/User';

export async function GET() {
  try {
    await connectDB();
    
    // Find the admin user
    const adminUser = await User.findOne({ role: 'admin' }).select('-password');
    
    if (!adminUser) {
      // If no admin exists, create default admin with plain password
      // The User model will hash it automatically
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@ahmadandsons.com',
        password: 'admin123', // Plain password - will be hashed by pre-save hook
        role: 'admin',
        isActive: true,
      });
      
      await newAdmin.save();
      
      // Return without password
      return Response.json({
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        _id: newAdmin._id,
      });
    }
    
    return Response.json(adminUser);
  } catch (error) {
    console.error('Error in GET /admin-profile:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { username, email, currentPassword, newPassword } = await request.json();
    
    // Find the admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      return Response.json({ error: 'Admin user not found' }, { status: 404 });
    }
    
    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return Response.json({ error: 'Current password is required to change password' }, { status: 400 });
      }
      
      const isMatch = await adminUser.comparePassword(currentPassword);
      if (!isMatch) {
        return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
      
      // Update password
      adminUser.password = newPassword;
    }
    
    // Update username and email if provided
    if (username) adminUser.username = username;
    if (email) adminUser.email = email;
    
    await adminUser.save();
    
    // Return user without password
    const updatedUser = adminUser.toJSON();
    
    return Response.json(updatedUser);
  } catch (error) {
    console.error('Error in PUT /admin-profile:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
