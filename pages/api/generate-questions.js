import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  const { title } = req.body;

  const prompt = `
  Estimate the reading level for this book: "${title}"

  Return JSON only:
  {
    "difficulty": "easy | medium | hard",
    "lexile": "range like 500L-700L",
    "ageRange": "age range"
  }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }]
    });

    const text = response.choices[0].message.content;
    const json = JSON.parse(text);

    res.status(200).json(json);

  } catch (err) {
    res.status(200).json({
      difficulty: "unknown",
      lexile: "unknown",
      ageRange: "unknown"
    });
  }
}
``
