import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { question, answer } = req.body;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a KS2 reading teacher."
        },
        {
          role: "user",
          content: `
Question: ${question}
Student Answer: ${answer}

Assess this answer as:
- Emerging
- Secure
- Mastery

Also give one short sentence of feedback.

Respond exactly like:
Level: ...
Feedback: ...
`
        }
      ]
    });

    res.status(200).json({
      result: completion.choices[0].message.content
    });

  } catch (error) {
    console.error(error);

    res.status(200).json({
      result: "Error marking answer"
    });
  }
}
