import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        questions: ["Please enter a book title first."]
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        questions: ["API key is missing"]
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a KS2 reading assistant helping multilingual learners."
        },
        {
          role: "user",
          content: `Create exactly 3 comprehension questions about the book "${title}".

Rules:
- Do NOT include any introduction or explanation
- Do NOT number the questions
- Each question should be on a new line
- Keep language simple for KS2 students
- Include one WHAT, one WHY, and one lesson question

Output ONLY the 3 questions.`
        }
      ]
    });

    const text = completion.choices?.[0]?.message?.content || "";

    const questions = text
      .split("\n")
      .map(q => q.replace(/^\d+[.)\s]*/, "").trim())
      .filter(q => q.trim() !== "");

    res.status(200).json({ questions });

  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(200).json({
      questions: ["Error generating questions. Check API key or OpenAI setup."]
    });
  }
}
