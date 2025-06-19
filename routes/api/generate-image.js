// server/routes/api/generate-image.js
const express = require('express');
const router = express.Router();
const { generateImage } = require('../../controllers/imageController');

// @route   POST api/generate-image
// @desc    Generate an image using Imagen model
// @access  Public
router.post('/', generateImage);

module.exports = router;
