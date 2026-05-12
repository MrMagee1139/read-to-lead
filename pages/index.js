import { useState, useEffect } from "react";

export default function ReadToLeadApp() {

  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [user, setUser] = useState({ name: "Andrew", role: "student" });
  const [view, setView] = useState("student");

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [summary, setSummary] = useState("");
  const [inference, setInference] = useState("");
  const [reflection, setReflection] = useState("");

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
            <div key={i} style={{ marginTop: 10 }}>
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
              />
            </div>
          ))}

          <br />

          <button>Submit Book</button>
        </div>
      )}

    </div>
  );
}
