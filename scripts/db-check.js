require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function test() {
    const id = 'INV-D38E5503'; // One from the screenshot and previous check
    console.log(`--- Checking Invoice ${id} ---`);
    try {
        const { rows } = await sql`SELECT * FROM invoices WHERE id = ${id}`;
        console.log('Result:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error('Failed:', e.message);
    }
}

test();
