// server/server.js

const express = require('express');
const cors = require('cors');
const path = require('path'); // Import the 'path' module
require('dotenv').config();

const generateTextRoutes = require('./routes/api/generate');
const visionRoutes = require('./routes/api/vision');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// API Routes
app.use('/api/generate', generateTextRoutes);
app.use('/api/vision', visionRoutes);

// --- NEW: Production Build Configuration ---
// This code will only run when the server is in 'production' mode (on Render)
if (process.env.NODE_ENV === 'production') {
  // Serve the static files from the React app's 'build' directory
  app.use(express.static(path.join(__dirname, '../client/build')));

  // For any other request that doesn't match an API route, 
  // serve the React app's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
