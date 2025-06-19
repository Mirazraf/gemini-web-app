// server/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// We are currently not using the database, so this is commented out
// const connectDB = require('./config/db');
// connectDB();

const generateTextRoutes = require('./routes/api/generate');
const visionRoutes = require('./routes/api/vision'); // Import the new vision route

const app = express();

// Increase the body parser limit to handle base64 image strings and place it before cors
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Use the respective routes for each endpoint
app.use('/api/generate', generateTextRoutes);
app.use('/api/vision', visionRoutes); // Use the new vision route

app.get('/', (req, res) => {
  res.send('Gemini AI Server is running!');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
