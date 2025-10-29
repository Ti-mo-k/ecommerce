// packages
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require("dotenv").config()
const stkPush = require('./stkPush');


// express app
const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('trust proxy', 1); // if behind a proxy like Render



// database connection
const db = mysql.createPool({
   host: process.env.MYSQL_ADDON_HOST,
   user: process.env.MYSQL_ADDON_USER,
   password:process.env.MYSQL_ADDON_PASSWORD,
   database:process.env.MYSQL_ADDON_DB,
   port: process.env.MYSQL_ADDON_PORT,
   waitForConnections: true,
   connectionLimit: 5,
   queueLimit: 0,
} );

const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore({}, db.promise()); // using pool

app.use(session({
    secret: process.env.SECRET_KEY,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 30 * 60 * 1000
}

}));

// db.connect(err => {
//     if (err) console.log('Database connection error:', err.message);
//     else console.log('Connected to database');
// });

// create users table
const UserTable = `
CREATE TABLE IF NOT EXISTS users(
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  resetPasswordToken VARCHAR(255),
  resetPasswordExpires DATETIME
)
`;

db.query(UserTable, err => {
    if (err) console.log('Error creating users table:', err.message);
    else console.log('Users table created');
});

const offersTable =`
CREATE TABLE IF NOT EXISTS offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    offer_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    category VARCHAR(100),
    start_date DATE,
    end_date DATE
);

`
db.query(offersTable, err => {
    if (err) console.log('Error creating offers table:', err.message);
    else console.log('Offers table created');
});

const productsTable =`
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    category VARCHAR(100)
);

`
db.query(productsTable, err => {
    if (err) console.log('Error creating offers table:', err.message);
    else console.log('Product table created');
});

const cartTable = `
CREATE TABLE IF NOT EXISTS cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 1,
  type ENUM('product','offer') NOT NULL DEFAULT 'product',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_cart(user_id, product_id, type)
);
`;

db.query(cartTable, err => {
  if (err) console.log('Error creating cart table:', err.message);
  else console.log('Cart table created');
});



// helper middleware to check authentication
function checkAuth(req, res, next) {
    if (!req.session.user) res.redirect('/login');
    else next();
}

function checkAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }
  next();
}


// Routes
// Serve pages
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/home'); // logged in users go to home
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html')); // or a public landing page
    }
});

app.get('/registration', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'forgotPassword.html')));
app.get('/reset-password/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'resetPassword.html')));
app.get('/home', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // still index.html
});

app.get('/admin', checkAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/check-login', (req, res) => {
    if (req.session.user) res.json({ loggedIn: true, user: req.session.user });
    else res.json({ loggedIn: false });
});

// Register
app.post('/register',
    check('name').isLength({ min: 3 }),
    check('email').isEmail(),
    check('password').isLength({ min: 8 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { name, email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) return res.status(500).send('Database error');
            if (results.length > 0) return res.status(400).json({ error: 'Email already exists' });

            db.query('INSERT INTO users SET ?', { name, email, password: hashedPassword ,role: 'user'}, (err, result) => {
                if (err) return res.status(500).send('Database error');
                // Auto-login
                req.session.user = { id: result.insertId, name, email, role: 'user' };
                return res.status(201).json({ message: 'Registration successful, redirecting...', redirect: '/home' }); 
                
            });
        });
    }
);

// Login
app.post('/login', async (req, res) => {
    const { email, password, guestCart } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(400).json({ error: 'Invalid email or password' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid email or password' });

        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };

        // Merge guest cart if present
        if (Array.isArray(guestCart) && guestCart.length > 0) {
            const values = guestCart
                .filter(i => i.id && i.quantity > 0 && i.type)
                .map(i => [user.id, i.id, i.quantity, i.type]);

            if (values.length > 0) {
                const sql = `
                    INSERT INTO cart (user_id, product_id, quantity, type)
                    VALUES ?
                    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
                `;
                db.query(sql, [values], (err) => {
                    if (err) console.error('Cart merge failed:', err);
                    fetchUpdatedCart(user.id, res);
                });
                return;
            }
        }

        // If no guest cart to merge
        fetchUpdatedCart(user.id, res);
    });
});

// Helper function to fetch cart and respond
function fetchUpdatedCart(userId, res) {
    db.query('SELECT * FROM cart WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch cart' });
        res.status(200).json({ message: 'Login successful', cart: results });
    });
}


// Forgot Password
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(400).json({ error: 'No email found' });

        const user = results[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expirationTime = new Date(Date.now() + 3600000); // 1 hour
        const formattedExpiration = expirationTime.toISOString().slice(0, 19).replace('T', ' ');

        db.query('UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id= ?', 
        [token, formattedExpiration, user.id], (err) => {
          console.error('MySQL error:', err);
            if (err) return res.status(500).json({ error: 'Failed to store reset token' });

            const resetLink = `http://localhost:5000/reset-password/${token}`;
            const mailOptions = {
                from: process.env.EMAIL,
                to: email,
                subject: 'Password Reset',
                text: `Click here to reset your password: ${resetLink}`
            };

            const transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: { user: process.env.EMAIL, pass: process.env.PASS }
            });

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) return res.status(500).json({ error: 'Error sending email' });
                return res.status(200).json({ message: 'Email sent successfully' });
            });
        });
    });
});

// Reset Password
app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    db.query('SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > NOW()', [token], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });

        const user = results[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query('UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?', 
        [hashedPassword, user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Error resetting password' });
            return res.status(200).json({ message: 'Password has been reset' });
        });
    });
});

// Get user cart
app.get('/api/cart', checkAuth, (req, res) => {
    const user_id = req.session.user.id;
    const sql = `
      SELECT c.quantity, c.type, 
             CASE WHEN c.type='product' THEN p.name ELSE o.name END AS name,
             CASE WHEN c.type='product' THEN p.price ELSE o.offer_price END AS price,
             CASE WHEN c.type='product' THEN p.image_url ELSE o.image_url END AS image_url
      FROM cart c
      LEFT JOIN products p ON c.type='product' AND c.product_id = p.id
      LEFT JOIN offers o ON c.type='offer' AND c.product_id = o.id
      WHERE c.user_id = ?
    `;
    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});


// Merge guest cart into user cart
app.post('/api/cart/merge', checkAuth, (req, res) => {
    const user_id = req.session.user.id;
    const { items } = req.body;

    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid cart data' });

    const values = items.map(i => [user_id, i.id, i.quantity]);
    const sql = `
        INSERT INTO cart (user_id, product_id, quantity)
        VALUES ?
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `;
    db.query(sql, [values], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Cart merged successfully' });
    });
});

// Update item quantity
app.post('/api/cart/update', checkAuth, (req, res) => {
    const { productId, type, change } = req.body; // <-- include type
    const user_id = req.session.user.id;

    if (!type || !['product','offer'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }

    const sql = `
        INSERT INTO cart (user_id, product_id, quantity, type)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `;

    db.query(sql, [user_id, productId, change, type], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Quantity updated' });
    });
});


// Remove item from cart
// Remove item from cart
app.post('/api/cart/remove', checkAuth, (req, res) => {
    const { productId, type } = req.body; // <-- include type
    const user_id = req.session.user.id;

    if (!type || !['product','offer'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }

    const sql = `DELETE FROM cart WHERE user_id = ? AND product_id = ? AND type = ?`;
    db.query(sql, [user_id, productId, type], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Item removed' });
    });
});



app.post('/api/products', checkAdmin, (req, res) => {
  const { name, price, description, image_url, category } = req.body;
  db.query(
    'INSERT INTO products (name, price, description, image_url, category) VALUES (?, ?, ?, ?, ?)',
    [name, price, description, image_url, category],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Product added successfully', id: result.insertId });
    }
  );
});

app.post('/api/offers', checkAdmin, (req, res) => {
  const { name, offer_price, description, image_url, category, start_date, end_date } = req.body;
  db.query(
    'INSERT INTO offers (name, offer_price, description, image_url, category, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, offer_price, description, image_url, category, start_date, end_date],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Offer added successfully', id: result.insertId });
    }
  );
});



// Get all products
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});
// Get all current offers
// Get all current offers
app.get('/api/offers', (req, res) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    db.query(
        'SELECT * FROM offers WHERE start_date <= ? AND end_date >= ?',
        [today, today],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(results);
        }
    );
});



app.post("/api/stkpush", async (req, res) => {
  const { phone, total } = req.body; // from frontend form

  try {
    const result = await stkPush(phone, total);
    res.json({ success: true, message: "STK Push sent successfully!", result });
  } catch (error) {
    console.error("STK Push failed:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "STK Push failed" });
  }
});
app.post('/callback', (req, res) => {
  console.log('📩 Callback from Safaricom:', req.body);
  res.status(200).send('OK');
});


// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out');
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.redirect('/login');          // Redirect to login page
    });
});


// Run server
const PORT = process.env.PORT ;
app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));
