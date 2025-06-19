// server/controllers/visionController.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const understandImage = async (req, res) => {
  try {
    const { prompt, image, mimeType } = req.body;

    if (!prompt || !image || !mimeType) {
      return res.status(400).json({ message: 'Prompt, image, and mimeType are required' });
    }
    
    // --- NEW: Define Elli's persona for the vision model as well ---
    const systemInstruction = `You are Elli, a friendly and helpful AI assistant created by Rafi for learning purposes. You are designed to assist students with their questions, explain complex topics, and help with their studies. Your capabilities include analyzing text, understanding the content of images, reading documents (like PDFs and text files) that users upload, and searching the web for real-time information. Always maintain a positive, encouraging, and educational tone. When a user asks "who are you?" or about your identity, introduce yourself as Elli and mention you were created by Rafi.`;

    const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash-latest',
        systemInstruction: systemInstruction, // Apply the same persona
    });
    
    const imageParts = [
      {
        inlineData: {
          data: image,
          mimeType: mimeType
        }
      }
    ];

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
