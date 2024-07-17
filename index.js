const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // directory where files should be uploaded
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // renaming file to avoid duplicates
  }
});

const upload = multer({ storage });

// Main async function to set up the server
const main = async () => {
  try {
    // MySQL Connection
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Connect to MySQL
    await db.connect();
    console.log('MySQL Connected...');

    // POST endpoint to handle image upload
    app.post('/api/upload', upload.single('prod_img'), async (req, res) => {
      // Implementation remains the same as your code
    });

    // GET all products
    app.get('/api/products', async (req, res) => {
      // Implementation remains the same as your code
    });

    // PUT update product by ID
    app.put('/api/products/:id', upload.single('prod_img'), async (req, res) => {
      // Implementation remains the same as your code
    });

    // DELETE product by ID
    app.delete('/api/products/:id', async (req, res) => {
      // Implementation remains the same as your code
    });

    // POST endpoint for checkout
    app.post('/api/checkout', async (req, res) => {
      // Implementation remains the same as your code
    });

    // Start server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Error during server setup:', err);
    process.exit(1); // Exit process with failure
  }
};

// Call main function to start the server
main();
