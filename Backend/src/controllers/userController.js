import { User } from "../models/userModel.js";

const registerUser = async (req, res) => {
    try {
        // get user details from frontend
        // validation - not empty
        // check if user already exists: ownerEmail
        // create user object - create entry in db
        // remove password and refresh token from response
        // check for user creation
        // return res

        res.status(200).json({success: true, message: "User registered Successfully"})
    } catch (error) {
        res.status(500).json({success: false, message: error.message})
    }
}

export {
    registerUser,
}