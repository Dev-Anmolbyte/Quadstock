import mongoose from 'mongoose';
import 'dotenv/config';
import { Leave } from './Backend/src/modules/leave/leave.model.js';
import { Employee } from './Backend/src/modules/employee/employee.model.js';

async function checkLeaves() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const leaves = await Leave.find({}).populate('employeeId');
        console.log(`Found ${leaves.length} leaves total.`);
        
        leaves.forEach(l => {
            console.log(`- Leave ID: ${l._id}, Staff: ${l.employeeId?.name || 'Unknown'}, Status: ${l.status}, Store: ${l.storeId}`);
        });

        const employees = await Employee.find({});
        console.log(`Found ${employees.length} employees total.`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkLeaves();
