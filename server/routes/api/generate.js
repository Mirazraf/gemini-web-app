// server/routes/api/generate.js

const express = require('express');
const router = express.Router();

// We will create this controller file in the next step
const { generateText } = require('../../controllers/geminiController');

// @route   POST api/generate
// @desc    Generate text using Gemini API
// @access  Public
router.post('/', generateText);

module.exports = router;
