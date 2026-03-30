import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/modules/user/user.model.js";

dotenv.config({ path: "../.env" });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find().populate("storeId");
        console.log("Current Users in DB:");
        users.forEach(u => {
            console.log(`- Email: ${u.email}, Store: ${u.storeId?.name || "None"}, StoreId: ${u.storeId?._id || "None"}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

check();
