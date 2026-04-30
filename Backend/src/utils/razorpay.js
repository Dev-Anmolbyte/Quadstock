import Razorpay from 'razorpay';
import 'dotenv/config';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sgou2ajCjV28E6',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'OGFDntqhYjPRETFY6XKf0bIr',
});

export default razorpay;
