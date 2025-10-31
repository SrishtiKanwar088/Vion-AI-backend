const express = require('express');
const cors = require('cors');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage } = require('@langchain/core/messages');

const app = express();
const port = 3001;
require('dotenv').config();
app.use(cors());
app.use(express.json());

// Initialize Gemini model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.3,
  apiKey: process.env.apiKey 
});

app.get("/", (req, res) => {
  res.json([{ message: "Finance AI API is running." }]);
});

// ---------------- STREAMING VERSION ----------------
app.post('/build', async (req, res) => {
  try {
    const assetName = req.body.assetName?.trim();
    if (!assetName) return res.status(400).json({ error: "Asset name required." });

    // Prompt construction
    const prompt = `
You are a professional financial analyst. Analyze the asset: "${assetName}" (company, stock, or cryptocurrency).
Use only verified public data and include numeric facts wherever possible.

Format your response as:
1. Overview – Type, sector, and short description.
2. Past Performance – Key price trends (1Y, 5Y), % growth or decline, major events.
3. Current Status – Current price, market cap, P/E ratio (if stock), and recent updates.
4. Future Outlook – Expected direction with brief reasoning.
5. Recommendation – Buy / Hold / Sell with short-term and long-term notes.
6. Confidence – % confidence in this advice.

End with:
"Final Conclusion: You should *buy* it at around $90, with an estimated *90% chance of profit*."
Keep it factual, numeric, and concise.
`;

    // Set up streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Start streaming response
    const stream = await model.stream([new HumanMessage(prompt)]);

    // Listen for chunks from Gemini
    for await (const chunk of stream) {
      const text = chunk?.content?.trim();
      if (text) {
        res.write(`data: ${text}\n\n`);
      }
    }

    // End stream
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("AI Stream Error:", error.message);
    res.status(500).json({
      error: "Failed to generate financial analysis",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Finance AI API running on http://localhost:${port}`);
});
