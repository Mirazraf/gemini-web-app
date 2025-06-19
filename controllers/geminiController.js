// server/controllers/geminiController.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateText = async (req, res) => {
  try {
    const { history, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'A prompt is required.' });
    }
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const systemInstruction = `You are Elli, a friendly and helpful AI assistant created by Rafi for learning purposes. You are designed to assist students with their questions, explain complex topics, and help with their studies. Your capabilities include analyzing text, understanding the content of images, and reading documents. Always maintain a positive, encouraging, and educational tone. When a user asks "who are you?" or about your identity, introduce yourself as Elli and mention you were created by Rafi.`;

    // --- REVERTED: Removed the 'tools' configuration to avoid rate-limiting issues ---
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest',
        systemInstruction: systemInstruction,
    });
    
    const chat = model.startChat({
        history: history || [],
    });

    const result = await chat.sendMessageStream(prompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }

    res.end();

  } catch (error) {
    console.error('Error in generateText controller:', error);
    res.end('An error occurred during generation.');
  }
};

module.exports = {
  generateText,
  understandImage: require('./visionController').understandImage 
};
