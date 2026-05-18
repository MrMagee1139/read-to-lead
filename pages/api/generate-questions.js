import OpenAI from "openai";
 
export default async function handler(req, res) {
  try {
    const { title } = req.body;
 
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
 
    // ✅ STEP 1: GET DIFFICULTY
    const diffRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You classify reading difficulty for KS2."
        },
        {
          role: "user",
          content: `Classify this book:
"${title}"
 
Respond with ONE word:
easy OR medium OR hard`
        }
      ]
    });
 
    let difficulty = diffRes.choices?.[0]?.message?.content.toLowerCase().trim();
 
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      difficulty = "medium";
    }
 
    // ✅ STEP 2: SET QUESTION COUNT + STYLE
    let numQuestions = 3;
    let instruction = "";
 
    if (difficulty === "easy") {
      numQuestions = 3;
      instruction = "Use simple WHAT questions. Keep sentences short.";
    } else if (difficulty === "medium") {
      numQuestions = 5;
      instruction = "Use a mix of WHAT and WHY questions. Include some explanation.";
    } else {
      numQuestions = 7;
      instruction = "Use deeper questions including WHY, HOW, and inference. Encourage reasoning.";
    }
 
    // ✅ STEP 3: GENERATE QUESTIONS
    const qRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a KS2 reading assistant helping multilingual learners."
        },
        {
          role: "user",
          content: `Create exactly ${numQuestions} comprehension questions about "${title}".
 
Rules:
- Do NOT number them
- One per line
- ${instruction}`
        }
      ]
    });
 
    const text = qRes.choices?.[0]?.message?.content || "";
 
    const questions = text
      .split("\n")
      .map(q => q.trim())
      .filter(q => q !== "")
      .slice(0, numQuestions);
 
    res.status(200).json({
      questions,
      difficulty
    });
 
  } catch (err) {
    console.error(err);
 
    res.status(200).json({
      questions: ["Error generating questions"],
      difficulty: "medium"
    });
  }
}
