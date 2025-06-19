// server/controllers/imageController.js

const generateImage = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ message: 'A prompt is required to generate an image.' });
        }
        
        // This is the payload structure required by the Imagen model
        const payload = {
            instances: [{ prompt: prompt }],
            parameters: { "sampleCount": 1 }
        };

        const apiKey = process.env.GEMINI_API_KEY; // We use the same API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

        // We use 'fetch' here as it's built into Node.js
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error from Imagen API:', errorData);
            throw new Error('Failed to generate image from API.');
        }

        const result = await response.json();

        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            // Send the base64 image data back to the client
            res.status(200).json({
                success: true,
                base64Image: result.predictions[0].bytesBase64Encoded
            });
        } else {
            throw new Error('Invalid response structure from the Imagen API.');
        }

    } catch (error) {
        console.error('Error in generateImage controller:', error.message);
        res.status(500).json({ message: 'Server error while generating image.' });
    }
};

module.exports = {
    generateImage,
};
