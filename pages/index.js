import { useState } from "react";

export default function ReadToLeadApp() {

  const [user, setUser] = useState(null);
  const [view, setView] = useState("student");

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [aiFeedback, setAiFeedback] = useState([]);

  // ✅ LOGIN
  const login = (name) => {
    const role = name.toLowerCase().includes("teacher")
      ? "teacher"
      : "student";

    setUser({ name, role });
  };

  // ✅ GENERATE QUESTIONS
  const generateQuestions = async () => {
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title })
      });

      const data = await res.json();

      const qs = data.questions || [];

      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(""));
      setAiFeedback(new Array(qs.length).fill(""));

    } catch (error) {
      console.error(error);
      alert("Error generating questions");
    }
  };

  // ✅ AI MARKING
  const markAnswer = async (question, answer, index) => {
    try {
      const res = await fetch("/api/mark-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question, answer })
      });

      const data = await res.json();

      const newFeedback = [...aiFeedback];
      newFeedback[index] = data.result;

      setAiFeedback(newFeedback);

    } catch (error) {
      console.error(error);
      alert("Error checking answer");
    }
  };

  // ✅ SUBMIT BOOK
  const addBook = () => {
    const newBook = {
      student: user.name,
      title,
      level,
      questions,
      answers,
      aiFeedback
    };

    console.log("Submitted:", newBook);

    alert(`✅ Well done ${user.name}! Your answers were submitted.`);
  };

  // ✅ LOGIN SCREEN
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Login</h2>
        <input
          placeholder="Enter your name (add 'teacher' if needed)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              login(e.target.value);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      padding: 20,
      fontFamily: "Arial",
      maxWidth: 600,
      margin: "auto"
    }}>
      <h1 style={{ textAlign: "center" }}>📚 Read to Lead</h1>

      <h3>Welcome {user.name} ({user.role})</h3>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setView("student")}>Student</button>
        <button onClick={() => setView("teacher")}>Teacher</button>
        <button onClick={() => setView("leaderboard")}>Leaderboard</button>
      </div>

      {/* STUDENT VIEW */}
      {view === "student" && user.role === "student" && (
        <div>
          <h2>Log a Book</h2>

          <input
            placeholder="Book title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <br /><br />

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Select level</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <br /><br />

          <button onClick={generateQuestions}>
            Generate Questions
          </button>

          {/* QUESTIONS + ANSWERS */}
          {questions.map((q, i) => (
            <div key={i} style={{
              marginTop: 10,
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 6
            }}>
              <p><strong>Question {i + 1}:</strong></p>
              <p>{q}</p>

              <textarea
                placeholder="Write your answer..."
                value={answers[i] || ""}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[i] = e.target.value;
                  setAnswers(newAnswers);
                }}
                style={{ width: "100%", height: 80 }}
              />

              {/* ✅ AI MARKING */}
              <button
                onClick={() => markAnswer(q, answers[i], i)}
                style={{ marginTop: 5 }}
              >
                Check Answer
              </button>

              {/* ✅ FEEDBACK */}
              {aiFeedback[i] && (
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  background: "#f0f8ff",
                  borderRadius: 5
                }}>
                  {aiFeedback[i]}
                </div>
              )}
            </div>
          ))}

          <br />

          <button onClick={addBook}>
            Submit Book
          </button>
        </div>
      )}
    </div>
  );
}
