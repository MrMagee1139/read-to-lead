import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        questions: ["Please enter a book title first."],
        difficulty: "medium"
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        questions: ["API key is missing"],
        difficulty: "medium"
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
          content: `
Book: "${title}"

TASK:
1. Create exactly 3 comprehension questions
2. Estimate the reading difficulty of the book

RULES:
- Do NOT include explanations
- Questions must be simple for KS2
- One WHAT, one WHY, one lesson question

Return ONLY valid JSON in this format:
{
  "questions": ["question1", "question2", "question3"],
  "difficulty": "easy | medium | hard"
}
`
        }
      ]
    });

    const text = completion.choices?.[0]?.message?.content || "";

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      // ✅ fallback if AI formatting breaks
      parsed = {
        questions: text
          .split("\n")
          .map(q => q.trim())
          .filter(q => q !== "")
          .slice(0, 3),
        difficulty: "medium"
      };
    }

    res.status(200).json({
      questions: parsed.questions || [],
      difficulty: parsed.difficulty || "medium"
    });

  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(200).json({
      questions: ["Error generating questions."],
      difficulty: "medium"
    });
  }
}
