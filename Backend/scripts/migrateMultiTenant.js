import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/modules/user/user.model.js";
import { Store } from "../src/modules/store/store.model.js";
import { Product } from "../src/modules/product/product.model.js";
import { Inventory } from "../src/modules/product/inventory.model.js";
import { SmartExpiry } from "../src/modules/product/smartExpiry.model.js";
import { Udhaar } from "../src/modules/udhaar/udhaar.model.js";
import { Complaint } from "../src/modules/complaint/complaint.model.js";
import { Category } from "../src/modules/category/category.model.js";

dotenv.config({ path: "../.env" });

const migrate = async () => {
    try {
        console.log("Connecting to MongoDB with URI:", process.env.MONGODB_URI ? "Found" : "Missing");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected Successfully.");

        // 1. Get a default store for orphaned data
        const defaultStore = await Store.findOne();
        if (!defaultStore) {
            console.log("No stores found. Please register a store first.");
            process.exit(1);
        }
        const storeId = defaultStore._id;
        console.log(`Using default Store ID: ${storeId} (${defaultStore.name}) for orphaned records.`);

        // 2. Fix Users
        const usersFixed = await User.updateMany(
            { storeId: { $exists: false } },
            { $set: { storeId: storeId } }
        );
        console.log(`Users patched: ${usersFixed.modifiedCount}`);

        // 3. Fix Categories
        const categoriesFixed = await Category.updateMany(
            { storeId: { $exists: false } },
            { $set: { storeId: storeId } }
        );
        console.log(`Categories patched: ${categoriesFixed.modifiedCount}`);

        // 4. Migrate Products to Inventory & SmartExpiry
        const products = await Product.find({ storeId: { $exists: false } });
        if (products.length > 0) {
            console.log(`Found ${products.length} products without storeId. Attaching to default store.`);
            await Product.updateMany({ storeId: { $exists: false } }, { $set: { storeId: storeId } });
        }

        const allProducts = await Product.find();
        let inventoryCreated = 0;
        let expiryCreated = 0;

        for (const product of allProducts) {
            // Check if inventory already exists
            const existingInventory = await Inventory.findOne({ productId: product._id, storeId: product.storeId });
            
            if (!existingInventory) {
                // Migrate fields from Product to Inventory
                const inv = await Inventory.create({
                    productId: product._id,
                    storeId: product.storeId,
                    batchNumber: product.batchNumber || "MIGRATED",
                    quantity: product.quantity || 0,
                    unit: product.unit || 'pcs',
                    mfd: product.mfd,
                    exp: product.exp,
                    pp: product.pp || 0,
                    cp: product.cp || 0,
                    price: product.price || 0,
                    reorderPoint: product.reorderPoint || 10
                });
                inventoryCreated++;

                // Create Smart Expiry if exp exists
                if (inv.exp) {
                    const expiryDate = new Date(inv.exp);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                    let status = 'safe';
                    if (diffDays < 0) status = 'expired';
                    else if (diffDays <= 7) status = 'expiring';

                    await SmartExpiry.create({
                        productId: product._id,
                        storeId: product.storeId,
                        expiryDate,
                        quantity: inv.quantity,
                        status
                    });
                    expiryCreated++;
                }
            }
        }
        console.log(`Inventory records created: ${inventoryCreated}`);
        console.log(`Smart Expiry records created: ${expiryCreated}`);

        // 5. Fix Udhaar
        const udhaarFixed = await Udhaar.updateMany(
            { storeId: { $exists: false } },
            { $set: { storeId: storeId } }
        );
        console.log(`Udhaar records patched: ${udhaarFixed.modifiedCount}`);

        // 6. Fix Complaints
        const complaintsFixed = await Complaint.updateMany(
            { storeId: { $exists: false } },
            { $set: { storeId: storeId } }
        );
        console.log(`Complaints patched: ${complaintsFixed.modifiedCount}`);

        console.log("\nMigration Complete!");
        process.exit(0);
    } catch (error) {
        console.error("Migration FAILED:", error);
        process.exit(1);
    }
};

migrate();
