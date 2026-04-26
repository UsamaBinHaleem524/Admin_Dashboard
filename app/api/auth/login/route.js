import connectDB from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request) {
  try {
    await connectDB();
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Find user by username
    let user = await User.findOne({ username: username.toLowerCase() });
    
    // If no user exists and trying to login with default credentials, create admin user
    if (!user) {
      const userCount = await User.countDocuments();
      
      // Only auto-create admin if no users exist and using default credentials
      if (userCount === 0 && username.toLowerCase() === 'admin' && password === 'admin123') {
        // Create user with plain password - the User model will hash it automatically
        user = new User({
          username: 'admin',
          email: 'admin@ahmadandsons.com',
          password: 'admin123', // Plain password - will be hashed by pre-save hook
          role: 'admin',
          isActive: true,
        });
        
        await user.save();
        console.log('Default admin user created successfully');
      } else {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    // Check if user is active
    if (!user.isActive) {
      return Response.json({ error: 'Account is inactive' }, { status: 403 });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data without password
    return Response.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
