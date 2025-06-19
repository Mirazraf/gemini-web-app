// server/routes/api/vision.js

const express = require('express');
const router = express.Router();
const { understandImage } = require('../../controllers/visionController');

// @route   POST api/vision
// @desc    Understand an image with a text prompt
// @access  Public
router.post('/', understandImage);

module.exports = router;
