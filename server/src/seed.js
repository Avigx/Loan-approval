/**
 * Seed script: creates demo data for development.
 *
 * Seeds:
 *   1. One demo Client: "AU BANK" (code: AUBANK)
 *   2. One CLIENT_ADMIN user: admin@aubank.com / password123
 *   3. One SUPER_ADMIN user: superadmin@dms.com / password123
 *   4. Full FolderType master list (13 families × 3 variants = 39 folder types)
 *
 * Usage: npm run seed --workspace=server
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('./config/db');
const Client = require('./models/Client');
const User = require('./models/User');
const FolderType = require('./models/FolderType');

const FOLDER_FAMILIES = [
  { familyName: 'Invocation', baseCode: 'INVO' },
  { familyName: 'Reference Notice', baseCode: 'REF' },
  { familyName: 'Conciliation Notice', baseCode: 'CONC' },
  { familyName: 'Demand Notice', baseCode: 'DEMAND' },
  { familyName: 'Legal Notice', baseCode: 'LEGAL' },
  { familyName: 'Arbitration', baseCode: 'ARB' },
  { familyName: 'Settlement', baseCode: 'SETTLE' },
  { familyName: 'Recovery Notice', baseCode: 'RECOV' },
  { familyName: 'Reminder Notice', baseCode: 'REMIND' },
  { familyName: 'Acknowledgement / Reply', baseCode: 'ACK' },
  { familyName: 'Payment Proof', baseCode: 'PAY' },
  { familyName: 'Agreement / Contract', baseCode: 'AGREE' },
  { familyName: 'Supporting Documents', baseCode: 'SUPPORT' },
];

const VARIANTS = [
  { variant: 'NOTICE', suffix: '', labelSuffix: '' },
  { variant: 'POD', suffix: '_POD', labelSuffix: ' POD' },
  { variant: 'TRACKING', suffix: '_TRACKING', labelSuffix: ' Tracking' },
];

const seed = async () => {
  try {
    await connectDB();
    console.log('\n🌱 Seeding database...\n');

    // ── 1. Client ──
    let client = await Client.findOne({ code: 'AUBANK' });
    if (!client) {
      client = await Client.create({ name: 'AU BANK', code: 'AUBANK' });
      console.log('  ✅ Created Client: AU BANK');
    } else {
      console.log('  ⏭️  Client AU BANK already exists');
    }

    // ── 2. Super Admin ──
    let superAdmin = await User.findOne({ email: 'superadmin@dms.com' });
    if (!superAdmin) {
      const hash = await bcrypt.hash('password123', 12);
      superAdmin = await User.create({
        fullName: 'Super Admin',
        email: 'superadmin@dms.com',
        passwordHash: hash,
        role: 'SUPER_ADMIN',
        permission: 'VIEW_DOWNLOAD',
        emailVerified: true,
        active: true,
        clientId: null,
      });
      console.log('  ✅ Created Super Admin: superadmin@dms.com / password123');
    } else {
      console.log('  ⏭️  Super Admin already exists');
    }

    // ── 3. Client Admin ──
    let clientAdmin = await User.findOne({ email: 'admin@aubank.com' });
    if (!clientAdmin) {
      const hash = await bcrypt.hash('password123', 12);
      clientAdmin = await User.create({
        fullName: 'Rakesh (AU Bank Admin)',
        email: 'admin@aubank.com',
        passwordHash: hash,
        role: 'CLIENT_ADMIN',
        permission: 'VIEW_DOWNLOAD',
        emailVerified: true,
        active: true,
        clientId: client._id,
      });
      console.log('  ✅ Created Client Admin: admin@aubank.com / password123');
    } else {
      console.log('  ⏭️  Client Admin already exists');
    }

    // ── 4. Folder Types ──
    let folderCount = 0;
    for (const family of FOLDER_FAMILIES) {
      for (const v of VARIANTS) {
        const folderCode = `${family.baseCode}${v.suffix}`;
        const displayLabel = `${family.familyName}${v.labelSuffix}`;

        const exists = await FolderType.findOne({ clientId: null, folderCode });
        if (!exists) {
          await FolderType.create({
            familyName: family.familyName,
            variant: v.variant,
            folderCode,
            displayLabel,
            clientId: null, // global
            active: true,
          });
          folderCount++;
        }
      }
    }
    if (folderCount > 0) {
      console.log(`  ✅ Created ${folderCount} Folder Types (${FOLDER_FAMILIES.length} families × ${VARIANTS.length} variants)`);
    } else {
      console.log('  ⏭️  All Folder Types already exist');
    }

    console.log('\n✅ Seeding complete!\n');
    console.log('  Login credentials:');
    console.log('  ─────────────────────────────────────');
    console.log('  Super Admin:  superadmin@dms.com / password123');
    console.log('  Client Admin: admin@aubank.com / password123');
    console.log('  ─────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
