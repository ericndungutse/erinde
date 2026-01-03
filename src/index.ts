import mongoose from 'mongoose';
import app from './app.js';

// Connect Database
const MONGO_URI = process.env.MONGO_URI;

const PORT = process.env.PORT;

app.listen(PORT, async () => {
  //Connect to MongoDB
  if (!MONGO_URI) {
    console.log('MONGO_URI not provided. Skipping MongoDB connection. ⚠️');
    process.exit(1);
  }
  console.log('Connecting to MongoDB... 📊');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB 📊');

  console.log(`Server listening on port ${PORT} 🚀`);
});
