const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
require('dotenv').config();

const cleanDB = async () => {
  try {
    await connectDB();
    console.log('Connected to DB, dropping collections...');
    
    const db = mongoose.connection.db;
    
    // Drop collections if they exist
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);
    
    if (names.includes('noticetypes')) {
      await db.collection('noticetypes').drop();
      console.log('Dropped noticetypes collection');
    }
    if (names.includes('documents')) {
      await db.collection('documents').drop();
      console.log('Dropped documents collection');
    }
    if (names.includes('uploadbatches')) {
      await db.collection('uploadbatches').drop();
      console.log('Dropped uploadbatches collection');
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanDB();
