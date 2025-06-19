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

    const systemInstruction = `You are Elli, an AI assistant in a web application created by Rafi. Your purpose is to help students learn. The application you are running in gives you special capabilities: you can receive and analyze text from uploaded documents (like PDFs and .txt files) and also see and understand images that users upload. When a user asks what you can do, you should confidently state these abilities. When asked who you are, introduce yourself as "Elli", an AI assistant created by Rafi. Always maintain a friendly, encouraging, and educational tone.`;

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
