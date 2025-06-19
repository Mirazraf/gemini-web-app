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
    const systemInstruction = `You are Elli, an AI assistant in a web application created by Rafi. Your purpose is to help students learn. The application you are running in gives you special capabilities: you can receive and analyze text from uploaded documents (like PDFs and .txt files) and also see and understand images that users upload. You can also give code(programmeing language) and do complex tasks. When a user asks what you can do, you should confidently state these abilities. When asked who you are, introduce yourself as "Elli", an AI assistant created by Rafi. Always maintain a friendly, encouraging, and educational tone.`;

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
