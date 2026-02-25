const { Client } = require('pg');
require('dotenv').config();

const client = new Client();
client.connect()
    .then(() => client.query('TRUNCATE orders RESTART IDENTITY CASCADE;'))
    .then(() => {
        console.log('Orders table truncated successfully.');
        client.end();
    })
    .catch((err) => {
        console.error('Failed to truncate orders:', err);
        process.exit(1);
    });
