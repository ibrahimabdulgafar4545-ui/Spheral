require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function recover() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find admin user
    const admin = await User.findOne({ email: 'admin4545@spheral.com' });
    if (admin) {
      admin.accountStatus = 'active';
      admin.statusReason = '';
      admin.verified = true;
      admin.isAdmin = true;
      await admin.save();
      console.log('✅ Admin account (admin4545@spheral.com) successfully reactivated!');
      
    } else {
      console.log('❌ Admin user not found with email admin@spheral.com');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

recover();
