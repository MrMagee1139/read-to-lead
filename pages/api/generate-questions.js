import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { title, yearGroup } = req.body;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an expert KS2 reading teacher.

Book: "${title}"
Year group: ${yearGroup || "Y5"}

Do the following:

1. Decide the book difficulty: easy, medium, or hard.

2. Generate 3 comprehension questions appropriate to BOTH:
   - the book difficulty
   - the student age

Guidelines:

Easy:
- retrieval questions
- short, simple answers
- focus on basic understanding

Medium:
- inference questions
- explain thinking
- include "why" and "how" questions

Hard:
- deeper reasoning
- themes, author intent, evidence
- encourage extended responses

Respond ONLY as JSON (no extra text):
{
  "questions": ["q1", "q2", "q3"],
  "difficulty": "easy | medium | hard"
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const text = completion.choices[0].message.content;

    // ✅ Safe parsing (prevents your previous crash)
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse failed:", text);

      return res.status(200).json({
        questions: [],
        difficulty: "medium",
      });
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("API ERROR:", error);

    res.status(200).json({
      questions: [],
      difficulty: "medium",
    });
  }
}
