import mongoose from "mongoose";
import "dotenv/config";
import { Page } from "../src/modules/page/page.model.js";

const MONGO_URI = process.env.MONGODB_URI;

const pages = [
    {
        slug: "contact",
        title: "Contact Us",
        description: "Get in touch with our team for any queries or support.",
        sections: [
            {
                title: "Office Address",
                content: "123 Business Avenue, Tech Park, Bangalore, 560001",
                icon: "fa-map-marker-alt"
            },
            {
                title: "Email Support",
                content: "support@quadstock.com",
                icon: "fa-envelope"
            },
            {
                title: "Phone",
                content: "+91 98765 43210",
                icon: "fa-phone-alt"
            }
        ],
        metadata: {
            "email": "contact@quadstock.com",
            "phone": "+91 80 1234 5678",
            "working_hours": "Mon - Sat: 9:00 AM - 8:00 PM"
        }
    },
    {
        slug: "portfolio",
        title: "Our Portfolio",
        description: "Explore the journey and impact of QuadStock.",
        sections: [
            {
                title: "Inventory Management",
                content: "Real-time stock tracking with intelligent expiry alerts.",
                icon: "fa-boxes"
            },
            {
                title: "Smart Analytics",
                content: "Deep insights into your store's performance and trends.",
                icon: "fa-chart-line"
            },
            {
                title: "Udhaar Ledger",
                content: "Managing customer credit with simplicity and security.",
                icon: "fa-book"
            }
        ],
        metadata: {
            "founded_year": "2024",
            "total_stores": "500+",
            "satisfied_users": "10,000+"
        }
    },
    {
        slug: "privacy-policy",
        title: "Privacy Policy",
        description: "How we protect and manage your data.",
        sections: [
            {
                title: "Data Collection",
                content: "We collect basic store information and stock data to provide our inventory services.",
                icon: "fa-shield-alt"
            },
            {
                title: "Data Security",
                content: "Your data is encrypted and stored securely on our cloud infrastructure.",
                icon: "fa-lock"
            }
        ],
        metadata: {
            "last_revised": "March 2024",
            "version": "1.2.0"
        }
    }
];

const seed = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB for seeding pages...");

        for (const page of pages) {
            await Page.findOneAndUpdate(
                { slug: page.slug },
                page,
                { upsert: true, new: true }
            );
            console.log(`Seeded page: ${page.slug}`);
        }

        console.log("Seeding complete!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seed();
