import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { title } = req.body;

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
      ]
    });

    const text = completion.choices[0].message.content;

    res.status(200).json({
      questions: text.split("\n").filter(q => q.trim() !== ""),
    });

  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      error: "Failed to generate questions"
    });
  }
}
