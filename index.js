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
    const { prod_name, prod_price, prod_quan, prod_code } = req.body;
    const imgPath = req.file.path;

    try {
      // Read image file data as base64
      const imgData = fs.readFileSync(imgPath);
      const base64Image = imgData.toString('base64');

      // Insert product with base64 image into database
      const sql = 'INSERT INTO products (prod_name, prod_price, prod_quan, prod_code, prod_img) VALUES (?, ?, ?, ?, ?)';
      await db.query(sql, [prod_name, prod_price, prod_quan, prod_code, base64Image]);

      // Delete the uploaded image file after processing
      fs.unlinkSync(imgPath);

      res.json({ message: 'Image uploaded and product added successfully' });
    } catch (error) {
      console.error('Error uploading image and inserting into database:', error);
      res.status(500).json({ error: 'Failed to upload image and insert into database' });
    }
  });

  // GET all products
  app.get('/api/products', async (req, res) => {
    const sql = 'SELECT * FROM products';
    try {
      const [results] = await db.query(sql);
      // Convert base64 images to binary
      const products = results.map(product => ({
        ...product,
        prod_img: Buffer.from(product.prod_img, 'base64').toString('binary')
      }));
      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // PUT update product by ID
  app.put('/api/products/:id', upload.single('prod_img'), async (req, res) => {
    const { id } = req.params;
    const { prod_name, prod_price, prod_quan, prod_code } = req.body;
    let prod_img = req.body.prod_img;

    try {
      // If a new image is uploaded, update prod_img with the base64 image data
      if (req.file) {
        const imgPath = req.file.path;
        const imgData = fs.readFileSync(imgPath);
        prod_img = imgData.toString('base64');
        fs.unlinkSync(imgPath); // Delete the uploaded image file after processing
      }

      const sql = `UPDATE products SET prod_name = ?, prod_price = ?, prod_quan = ?, prod_img = ?, prod_code = ? WHERE prod_id = ?`;
      await db.query(sql, [prod_name, prod_price, prod_quan, prod_img, prod_code, id]);
      res.json({ message: 'Product updated successfully', updatedProduct: { prod_id: id, prod_name, prod_price, prod_quan, prod_img, prod_code } });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  // DELETE product by ID
  app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM products WHERE prod_id = ?';
    try {
      const [result] = await db.query(sql, [id]);
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // POST endpoint for checkout
  app.post('/api/checkout', async (req, res) => {
    const { products } = req.body;

    try {
      // Start a transaction
      await db.beginTransaction();

      // Update the product quantities in the database
      for (const product of products) {
        const sql = `UPDATE products SET prod_quan = prod_quan - ? WHERE prod_id = ? AND prod_quan >= ?`;
        const [result] = await db.query(sql, [1, product.prod_id, 1]); // Decrease by 1
        if (result.affectedRows === 0) {
          throw new Error(`Insufficient quantity for product ID: ${product.prod_id}`);
        }
      }

      // Commit the transaction
      await db.commit();

      res.json({ message: 'Checkout successful' });
    } catch (error) {
      // Rollback the transaction in case of error
      await db.rollback();
      console.error('Error during checkout:', error);
      res.status(500).json({ error: 'Failed to complete checkout' });
    }
  });

  // Start server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

// Call main function to start the server
main().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1); // Exit process with failure
});
