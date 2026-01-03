import mongoose from 'mongoose';
import app from './app.js';

// Connect Database
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  console.log('Connecting to MongoDB... 📊');
}

const PORT = process.env.PORT;

app.listen(PORT, () => {
  //Connect to MongoDB
  if (!MONGO_URI) {
    console.log('MONGO_URI not provided. Skipping MongoDB connection. ⚠️');
    process.exit(1);
  }
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB 📊'))
    .catch((err) => console.error('MongoDB connection error:', err));

  console.log(`Server listening on port ${PORT} 🚀`);
});
