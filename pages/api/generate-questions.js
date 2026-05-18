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
 
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
 
    // ✅ STEP 1: GET DIFFICULTY FIRST
    const difficultyResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You classify reading difficulty for KS2."
        },
        {
          role: "user",
          content: `Classify this book for KS2:
"${title}"
 
Respond with ONE word only:
easy OR medium OR hard`
        }
      ]
    });
 
    let difficulty = difficultyResponse.choices?.[0]?.message?.content
      ?.toLowerCase()
      .trim();
 
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      difficulty = "medium";
    }
 
    // ✅ STEP 2: SET NUMBER OF QUESTIONS
    const numQuestions =
      difficulty === "easy" ? 3 :
      difficulty === "medium" ? 5 : 7;
 
    // ✅ STEP 3: GENERATE QUESTIONS
    const questionResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a KS2 reading assistant helping multilingual learners."
        },
        {
          role: "user",
          content: `Create exactly ${numQuestions} comprehension questions about the book "${title}".
 
Rules:
- Do NOT include any introduction
- Do NOT number the questions
- Each question must be on a new line
- Keep language simple for KS2 students
- Include a mix of WHAT, WHY, and deeper thinking questions
 
Output ONLY the questions.`
        }
      ]
    });
 
    const text = questionResponse.choices?.[0]?.message?.content || "";
 
    const questions = text
      .split("\n")
      .map(q => q.replace(/^\d+[.)\s]*/, "").trim())
      .filter(q => q !== "")
      .slice(0, numQuestions);
 
    res.status(200).json({
      questions,
      difficulty
    });
 
  } catch (error) {
    console.error("AI ERROR:", error);
 
    res.status(200).json({
      questions: ["Error generating questions"],
      difficulty: "medium"
    });
  }
}
