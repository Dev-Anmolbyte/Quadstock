import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of default
    });

    console.log(`MongoDB Connected Successfully `);
  } catch (error) {
    console.error("MongoDB connection FAILED:", error.message);
    // Log more details if it's an SRV error
    if (error.message.includes('querySrv')) {
        console.error("DEBUG: SRV Lookup failed. This is usually due to DNS issues or network firewall/VPN blocking Atlas.");
    }
    process.exit(1);
  }
};

export default connectDB;