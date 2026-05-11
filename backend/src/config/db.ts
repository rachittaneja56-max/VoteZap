import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('ERROR: MONGO_URI is not defined in environment variables.');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
 
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB Runtime Error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB Disconnected. Check your network or Atlas cluster.');
    });

  } catch (error: any) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;