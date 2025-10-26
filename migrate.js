// migrate.js
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.MYSQL_ADDON_HOST,
   user: process.env.MYSQL_ADDON_USER,
   password:process.env.MYSQL_ADDON_PASSWORD,
   database:process.env.MYSQL_ADDON_DB,
   port: process.env.MYSQL_ADDON_PORT
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to remote DB');

  // Check if 'role' column exists
  const checkColumn = `
    SHOW COLUMNS FROM users LIKE 'role';
  `;

  db.query(checkColumn, (err, result) => {
    if (err) throw err;

    if (result.length === 0) {
      // Add the column if it doesn't exist
      const alterTable = `
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
      `;
      db.query(alterTable, err => {
        if (err) throw err;
        console.log('🟩 Added "role" column to users table.');
        setAdmin();
      });
    } else {
      console.log('ℹ️ "role" column already exists.');
      setAdmin();
    }
  });

  // Function to set admin role for your email
  function setAdmin() {
    const adminEmail = 'timkepha@gmail.com'; // Replace this with your actual email
    const setAdminRole = `
      UPDATE users SET role = 'admin' WHERE email = ?;
    `;
    db.query(setAdminRole, [adminEmail], err => {
      if (err) throw err;
      console.log(`👑 ${adminEmail} is now an admin.`);
      db.end();
    });
  }
});
