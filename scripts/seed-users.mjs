/**
 * Seed Users Script - Creates login credentials for all roles
 * Run with: node scripts/seed-users.mjs
 * 
 * This script creates/updates users in MongoDB for all roles with consistent credentials.
 */

import 'dotenv/config';
import connectToDatabase from '../lib/mongodb.js';
import { db } from '../lib/db.js';
import { ROLES } from '../constants/roles.js';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'Password123!'; // Change this in production!

const users = [
    {
        id: 'u-admin-01',
        name: 'System Admin',
        email: 'admin@invoiceflow.com',
        role: ROLES.ADMIN,
        assignedProjects: [],
        vendorId: null,
        department: 'IT'
    },
    {
        id: 'u-finance-01',
        name: 'Finance User',
        email: 'financeuser@invoiceflow.com',
        role: ROLES.FINANCE_USER,
        assignedProjects: [],
        vendorId: null,
        department: 'Finance'
    },
    {
        id: 'u-pm-01',
        name: 'Project Manager',
        email: 'pm@invoiceflow.com',
        role: ROLES.PROJECT_MANAGER,
        assignedProjects: ['Project Alpha', 'Cloud Migration'],
        vendorId: null,
        department: 'Operations'
    },
    {
        id: 'u-vendor-01',
        name: 'Acme Solutions',
        email: 'vendor@acme.com',
        role: ROLES.VENDOR,
        assignedProjects: [],
        vendorId: 'v-001',
        department: 'Vendor'
    }
];

async function seedUsers() {
    try {
        console.log('🔐 Starting user seed process...\n');
        await connectToDatabase();

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

        const results = {
            created: [],
            updated: [],
            skipped: []
        };

        for (const userData of users) {
            const existing = await db.getUserByEmail(userData.email);
            
            if (existing) {
                // Update existing user (preserve password if already set, or update to default)
                const updatedUser = await db.createUser({
                    ...userData,
                    passwordHash: existing.password_hash || passwordHash
                });
                results.updated.push({
                    email: userData.email,
                    role: userData.role,
                    name: userData.name
                });
                console.log(`✅ Updated: ${userData.email} (${userData.role})`);
            } else {
                // Create new user
                await db.createUser({
                    ...userData,
                    passwordHash
                });
                results.created.push({
                    email: userData.email,
                    role: userData.role,
                    name: userData.name
                });
                console.log(`✨ Created: ${userData.email} (${userData.role})`);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Created: ${results.created.length}`);
        console.log(`   Updated: ${results.updated.length}`);
        console.log(`   Skipped: ${results.skipped.length}`);
        console.log('\n🔑 Default Password for all users:', DEFAULT_PASSWORD);
        console.log('\n📝 Login Credentials:');
        console.log('─'.repeat(60));
        users.forEach(u => {
            console.log(`   ${u.role.padEnd(20)} | ${u.email.padEnd(30)} | ${DEFAULT_PASSWORD}`);
        });
        console.log('─'.repeat(60));
        console.log('\n✅ User seed completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding users:', error);
        process.exit(1);
    }
}

seedUsers();
