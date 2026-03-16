import mongoose, {Schema} from "mongoose";

const userSchema = new Schema(
    {
        ownerName: {type: String, required: true, trim: true,},
        shopName: {type: String, required: true, trim: true, unique: true},
        ownerEmail: {type: String, required: true, unique: true, trim: true},
        phoneNumber: {type: String, required: true, unique: true, trim: true},
        password: {type: String, required: [true, 'Password is required']},
        role: {type: String, enum: ['owner', 'manager', 'staff'], default: 'owner'},
        ownerId: {type: String, unique: true}

    },
    {
        timestamps: true
    }
)

export const User = mongoose.model("User", userSchema)