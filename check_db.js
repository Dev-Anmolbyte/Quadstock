import "dotenv/config";
import mongoose from "mongoose";

const checkDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to: ${conn.connection.db.databaseName}`);
    
    const User = conn.connection.db.collection('users');
    
    const users = await User.find({}).toArray();
    
    console.log("Current Usernames:");
    users.forEach(u => console.log(`- ${u.username} (${u.email}) | Role: ${u.role} | StoreId: ${u.storeId} | Verified: ${u.isVerified}`));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("DB Check Failed:", err.message);
    process.exit(1);
  }
};

checkDB();
