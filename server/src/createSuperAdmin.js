const bcrypt = require('bcrypt');
const connectDB = require('./config/db');
const User = require('./models/User');

const run = async () => {
  const args = process.argv.slice(2);
  const email = (args[0] || 'admin@example.com').toLowerCase();
  const password = args[1] || 'admin123';
  const fullName = args[2] || 'System Super Admin';

  try {
    await connectDB();

    const hash = await bcrypt.hash(password, 12);
    let user = await User.findOne({ email });

    if (user) {
      user.fullName = fullName;
      user.passwordHash = hash;
      user.role = 'SUPER_ADMIN';
      user.permission = 'VIEW_DOWNLOAD';
      user.active = true;
      user.emailVerified = true;
      user.clientId = null;
      await user.save();
      console.log(`\n✅ Updated existing user to SUPER_ADMIN:`);
    } else {
      user = await User.create({
        fullName,
        email,
        passwordHash: hash,
        role: 'SUPER_ADMIN',
        permission: 'VIEW_DOWNLOAD',
        active: true,
        emailVerified: true,
        clientId: null,
      });
      console.log(`\n✅ Created new SUPER_ADMIN user:`);
    }

    console.log(`   Name:     ${fullName}`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     SUPER_ADMIN\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create/update superadmin:', error);
    process.exit(1);
  }
};

run();
