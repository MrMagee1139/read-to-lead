import { useState } from "react";

export default function ReadToLeadApp() {

  const [user, setUser] = useState(null);
  const [view, setView] = useState("student");

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [aiFeedback, setAiFeedback] = useState([]);

  const [submissions, setSubmissions] = useState([]);

  // ✅ LOGIN
  const login = (name) => {
    const role = name.toLowerCase().includes("teacher")
      ? "teacher"
      : "student";

    setUser({ name, role });
  };

  // ✅ GENERATE QUESTIONS
  const generateQuestions = async () => {
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
  };

  // ✅ AI MARKING
  const markAnswer = async (question, answer, index) => {
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
  };

  // ✅ SUBMIT BOOK
  const addBook = () => {
    const newSubmission = {
      id: Date.now(),
      student: user.name,
      title,
      level,
      questions,
      answers,
      aiFeedback,
      status: "pending",
      points: 0
    };

    setSubmissions([...submissions, newSubmission]);
    alert("✅ Submitted for teacher review!");
  };

  // ✅ TEACHER APPROVES WITH SCORE
  const approveSubmission = (id, level) => {
    const updated = submissions.map((s) => {
      if (s.id === id) {
        const base = s.level === "easy" ? 2 : s.level === "medium" ? 5 : 10;
        const multiplier = level === "mastery" ? 2 : level === "secure" ? 1.5 : 1;
        return {
          ...s,
          status: "approved",
          points: Math.round(base * multiplier),
          teacherLevel: level
        };
      }
      return s;
    });

    setSubmissions(updated);
  };

  // ✅ LEADERBOARD
  const scores = {};
  submissions.forEach((s) => {
    if (s.status === "approved") {
      scores[s.student] = (scores[s.student] || 0) + s.points;
    }
  });

  const leaderboard = Object.entries(scores)
    .map(([name, pts]) => ({ name, pts }))
    .sort((a, b) => b.pts - a.pts);

  // ✅ LOGIN SCREEN
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Login</h2>
        <input
          placeholder="Enter name (add 'teacher')"
          onKeyDown={(e) => {
            if (e.key === "Enter") login(e.target.value);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "auto" }}>
      <h1>📚 Read to Lead</h1>
      <h3>{user.name} ({user.role})</h3>

      <button onClick={() => setView("student")}>Student</button>
      <button onClick={() => setView("teacher")}>Teacher</button>
      <button onClick={() => setView("leaderboard")}>Leaderboard</button>

      {/* STUDENT */}
      {view === "student" && user.role === "student" && (
        <div>
          <input
            placeholder="Book title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select onChange={(e) => setLevel(e.target.value)}>
            <option value="">Level</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <button onClick={generateQuestions}>Generate Questions</button>

          {questions.map((q, i) => (
            <div key={i}>
              <p>{q}</p>

              <textarea
                value={answers[i] || ""}
                onChange={(e) => {
                  const a = [...answers];
                  a[i] = e.target.value;
                  setAnswers(a);
                }}
              />

              <button onClick={() => markAnswer(q, answers[i], i)}>
                Check Answer
              </button>

              <div>{aiFeedback[i]}</div>
            </div>
          ))}

          <button onClick={addBook}>Submit</button>
        </div>
      )}

      {/* TEACHER */}
      {view === "teacher" && user.role === "teacher" && (
        <div>
          <h2>Teacher Dashboard</h2>

          {submissions.map((s) => (
            <div key={s.id} style={{ border: "1px solid black", margin: 10 }}>
              <p><strong>{s.student}</strong> - {s.title}</p>

              {s.questions.map((q, i) => (
                <div key={i}>
                  <p>{q}</p>
                  <p>{s.answers[i]}</p>
                  <p>{s.aiFeedback[i]}</p>
                </div>
              ))}

              {s.status === "pending" && (
                <div>
                  <button onClick={() => approveSubmission(s.id, "emerging")}>Emerging</button>
                  <button onClick={() => approveSubmission(s.id, "secure")}>Secure</button>
                  <button onClick={() => approveSubmission(s.id, "mastery")}>Mastery</button>
                </div>
              )}

              {s.status === "approved" && (
                <p>✅ Approved: {s.points} pts</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LEADERBOARD */}
      {view === "leaderboard" && (
        <div>
          <h2>🏆 Leaderboard</h2>
          {leaderboard.map((s, i) => (
            <p key={i}>{i + 1}. {s.name} – {s.pts} pts</p>
          ))}
        </div>
      )}
    </div>
  );
}
