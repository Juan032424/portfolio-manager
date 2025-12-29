import pg from 'pg';
const { Client } = pg;

// Using the direct compute endpoint (removing -pooler)
const connectionString = 'postgresql://neondb_owner:npg_Rg4fuOhUZ9MG@ep-blue-cell-aeerkdn1.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const client = new Client({
    connectionString,
    ssl: true,
});

async function test() {
    console.log("Testing connection to: " + connectionString.split('@')[1]); // Log host only for safety
    try {
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Server time:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
    }
}

test();
