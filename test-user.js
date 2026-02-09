// Test script to check and create finance user
import { db } from './lib/db.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function main() {
    try {
        console.log('Checking for finance user...');

        const existingUser = await db.getUserByEmail('financeuser@gmail.com');

        if (existingUser) {
            console.log('User already exists:', JSON.stringify(existingUser, null, 2));
            return;
        }

        console.log('User not found, creating...');

        const passwordHash = await bcrypt.hash('financeuser@gmail.com', 10);
        const newUser = await db.createUser({
            id: randomUUID(),
            name: 'Finance User',
            email: 'financeuser@gmail.com',
            passwordHash,
            role: 'Finance User'
        });

        console.log('User created successfully:', JSON.stringify(newUser, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    }
}

main();
