const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Connection pool settings
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    // Connection timeout for individual connections
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10)
});

// Test connection on startup
db.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection error:', err.message);
        process.exit(1);
    });

module.exports = db;
