// server/controllers/visionController.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to convert a file buffer to a base64 string
const fileToGenerativePart = (buffer, mimeType) => {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
};

const understandImage = async (req, res) => {
  try {
    const { prompt, image, mimeType } = req.body;

    if (!prompt || !image || !mimeType) {
      return res.status(400).json({ message: 'Prompt, image, and mimeType are required' });
    }

    // Use the gemini-1.5-flash model which is great for multimodal tasks
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    
    // The Gemini API requires the image data to be in a specific format
    const imageParts = [
      {
        inlineData: {
          data: image, // The frontend will send the base64 string directly
          mimeType: mimeType
        }
      }
    ];

    // Set headers for a streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const result = await model.generateContentStream([prompt, ...imageParts]);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }

    res.end();

  } catch (error) {
    console.error('Error in understandImage controller:', error);
    res.end('An error occurred during image understanding.');
  }
};

module.exports = {
  understandImage,
};
