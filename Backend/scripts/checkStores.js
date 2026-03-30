import mongoose from "mongoose";
import dotenv from "dotenv";
import { Store } from "../src/modules/store/store.model.js";

dotenv.config({ path: "../.env" });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const stores = await Store.find();
        console.log("Current Stores in DB:");
        stores.forEach(s => {
            console.log(`- Name: ${s.name}, UniqueId: ${s.storeUniqueId}, ID: ${s._id}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

check();
