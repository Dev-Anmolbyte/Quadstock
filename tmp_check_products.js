import "dotenv/config";
import mongoose from "mongoose";

const checkProducts = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    const Product = conn.connection.db.collection('products');
    
    const items = await Product.find({ 
      name: { $regex: /Amul|Tata/i } 
    }).toArray();
    
    console.log("Check Products:");
    items.forEach(p => {
      const totalValue = (p.price || 0) * (p.quantity || 0);
      console.log(`- ${p.name}: Quantity=${p.quantity}, Price=${p.price}, CP=${p.cp}, TotalValue=${totalValue}`);
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Check Failed:", err.message);
    process.exit(1);
  }
};

checkProducts();
