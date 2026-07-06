require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('./models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function seedAdmin() {
  console.log('\n--- 🛡️ Spheral Admin Account Setup ---\n');
  
  try {
    const adminName = await question('Enter Admin Name (e.g. Platform Admin): ');
    const adminUsername = await question('Enter Admin Username (e.g. admin123): ');
    const adminEmail = await question('Enter Admin Email: ');
    const adminPassword = await question('Enter Admin Password (min 8 chars): ');

    if (!adminName || !adminUsername || !adminEmail || !adminPassword) {
      console.log('❌ Error: All fields are required. Exiting.');
      process.exit(1);
    }

    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected successfully.');

    const existingUser = await User.findOne({
      $or: [{ email: adminEmail.toLowerCase() }, { username: adminUsername.toLowerCase() }]
    });

    if (existingUser) {
      console.log('⚠️ An account with this email or username already exists.');
      
      // Ensure the account is active and verified
      existingUser.verified = true;
      existingUser.accountStatus = 'active';
      existingUser.statusReason = '';

      if (existingUser.isAdmin) {
        await existingUser.save();
        console.log('✅ Admin account status reset to active successfully!');
        process.exit(0);
      } else {
        const upgrade = await question('Would you like to upgrade this account to Admin? (y/N): ');
        if (upgrade.toLowerCase() === 'y') {
          existingUser.isAdmin = true;
          await existingUser.save();
          console.log('✅ Account upgraded to admin and activated successfully!');
        } else {
          await existingUser.save();
          console.log('✅ Account activated successfully (not upgraded to admin).');
        }
        process.exit(0);
      }
    }

    console.log('Creating admin account...');
    const adminUser = new User({
      name: adminName,
      username: adminUsername.toLowerCase(),
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      isAdmin: true,
      verified: true, // Bypass verification completely
    });

    await adminUser.save();
    console.log(`\n✅ Admin account created successfully!`);
    console.log(`You can now log in at the normal /login page with ${adminEmail.toLowerCase()}`);
    
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  } finally {
    mongoose.connection.close();
    rl.close();
    process.exit(0);
  }
}

seedAdmin();
