require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find user by name "Oluwashola Hameed"
    const user = await User.findOne({ name: /Oluwashola Hameed/i });
    if (user) {
      console.log('✅ User found in MongoDB:');
      console.log({
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        verified: user.verified,
        accountStatus: user.accountStatus,
        verificationCelebrationShown: user.verificationCelebrationShown,
        isAdmin: user.isAdmin,
      });
    } else {
      console.log('❌ User not found with name matching "Oluwashola Hameed"');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

checkUser();
