import crypto from "crypto";
import razorpay from "../../utils/razorpay.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Store } from "../store/store.model.js";

/**
 * Plans Configuration
 */
const PLANS = {
    pro: {
        monthly: 499,
        quarter: 1349,
        half: 2399,
        yearly: 4199
    },
    enterprise: {
        monthly: 1199,
        quarter: 3249,
        half: 5759,
        yearly: 9999
    }
};

const PLAN_WEIGHTS = {
    free: 0,
    pro: 1,
    enterprise: 2
};

const createOrder = asyncHandler(async (req, res) => {
    const { plan, cycle } = req.body;

    if (!PLANS[plan] || !PLANS[plan][cycle]) {
        throw new ApiError(400, "Invalid plan or cycle selected");
    }

    const store = await Store.findById(req.user.storeId);
    if (!store) throw new ApiError(404, "Store not found");

    const currentPlan = store.subscriptionPlan || "free";
    const currentWeight = PLAN_WEIGHTS[currentPlan];
    const newWeight = PLAN_WEIGHTS[plan];

    // 1. Prevent Downgrade
    if (newWeight < currentWeight) {
        throw new ApiError(400, `Downgrade from ${currentPlan.toUpperCase()} to ${plan.toUpperCase()} is not allowed via self-service. Please contact support.`);
    }

    let originalAmount = PLANS[plan][cycle];
    let finalAmount = originalAmount * 100; // in paise
    let discountApplied = 0;

    // 2. Calculate Upgrade Pro-rata (if upgrading from a paid plan)
    if (newWeight > currentWeight && currentPlan !== "free" && store.subscriptionAmount > 0) {
        const now = new Date();
        const expiry = new Date(store.subscriptionExpiry);
        
        if (expiry > now) {
            const totalDuration = store.subscriptionCycle === 'yearly' ? 365 : 
                                  store.subscriptionCycle === 'half' ? 180 : 
                                  store.subscriptionCycle === 'quarter' ? 90 : 30;
            
            const remainingTime = expiry - now;
            const remainingDays = Math.max(0, Math.floor(remainingTime / (1000 * 60 * 60 * 24)));
            
            const dailyRate = store.subscriptionAmount / totalDuration;
            discountApplied = Math.floor(dailyRate * remainingDays);
            
            // Deduct from final amount (ensure at least 1 INR)
            finalAmount = Math.max(100, (originalAmount - discountApplied) * 100);
        }
    }

    const options = {
        amount: finalAmount,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
            plan,
            cycle,
            storeId: req.user.storeId,
            originalAmount: originalAmount,
            discountApplied: discountApplied
        }
    };

    try {
        console.log(`[Subscription] Creating upgrade order. Plan: ${plan}, Discount: ${discountApplied}, Final: ${finalAmount/100}`);
        const order = await razorpay.orders.create(options);
        
        if (!order) {
            throw new ApiError(500, "Failed to create Razorpay order");
        }

        return res.status(200).json({
            success: true,
            data: {
                ...order,
                adjustedAmount: finalAmount / 100,
                discountApplied
            },
            message: discountApplied > 0 ? `Upgrade price adjusted based on your current plan.` : "Order created successfully"
        });
    } catch (error) {
        console.error("[Razorpay Order Error]:", error);
        const errorMessage = error.message || "Unknown Razorpay Error";
        throw new ApiError(500, `Razorpay Order Error: ${errorMessage}`);
    }
});


const verifyPayment = asyncHandler(async (req, res) => {
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        plan,
        cycle
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'OGFDntqhYjPRETFY6XKf0bIr';

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
        throw new ApiError(400, "Payment verification failed: Invalid signature");
    }

    // Payment is authentic, update Store subscription
    // Use findById with the storeId directly from the user document for better reliability
    console.log("[Subscription] Payment verified. Fetching store with ID:", req.user.storeId);
    const store = await Store.findById(req.user.storeId);
    
    if (!store) {
        console.error("[Subscription] Store not found for user's storeId:", req.user.storeId);
        throw new ApiError(404, "Store not found. Please contact support.");
    }

    console.log("[Subscription] Store found. Updating subscription to:", plan);

    // Calculate expiry date
    let monthsToAdd = 1;
    if (cycle === 'quarter') monthsToAdd = 3;
    else if (cycle === 'half') monthsToAdd = 6;
    else if (cycle === 'yearly') monthsToAdd = 12;

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);


    store.subscriptionPlan = plan;
    store.subscriptionStatus = "active";
    store.subscriptionExpiry = expiryDate;
    store.subscriptionCycle = cycle;
    store.subscriptionAmount = PLANS[plan][cycle];
    store.razorpayOrderId = razorpay_order_id;
    store.razorpayPaymentId = razorpay_payment_id;

    await store.save();


    return res.status(200).json({
        success: true,
        data: {
            plan,
            expiry: expiryDate
        },
        message: "Subscription upgraded successfully"
    });
});

const getSubscriptionStatus = asyncHandler(async (req, res) => {
    const store = await Store.findOne({ ownerId: req.user._id });
    if (!store) {
        throw new ApiError(404, "Store not found");
    }

    return res.status(200).json({
        success: true,
        data: {
            plan: store.subscriptionPlan,
            status: store.subscriptionStatus,
            expiry: store.subscriptionExpiry
        }
    });
});

export {
    createOrder,
    verifyPayment,
    getSubscriptionStatus
};
