import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Missing title" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a primary school reading assistant."
        },
        {
          role: "user",
          content: `Create 3 comprehension questions for KS2 students reading "${title}". Include one literal, one inference and one reflective question.`
        }
      ],
    });

    const text = completion.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("No response from AI");
    }

    res.status(200).json({
      questions: text.split("\n").filter(q => q.trim() !== ""),
    });

  } catch (error) {
    console.error("API ERROR:", error);

    res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
``
