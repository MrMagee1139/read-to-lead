
import { useState, useEffect } from "react";

const API_URL = "/api/books";

export default function ReadToLeadApp() {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [summary, setSummary] = useState("");
  const [inference, setInference] = useState("");
  const [reflection, setReflection] = useState("");
  const [questions, setQuestions] = useState([]);
  const [view, setView] = useState("student");
  const [user, setUser] = useState(null);

  // ✅ SIMPLE LOGIN
  const login = (name) => {
    const role = name.toLowerCase().includes("teacher")
      ? "teacher"
      : "student";
    setUser({ name, role });
  };

  // ✅ LOAD BOOKS
  useEffect(() => {
    if (!user) return;
    fetch(API_URL)
      .then((res) => res.json())
      .then(setBooks)
      .catch(() => setBooks([]));
  }, [user]);

  // ✅ GENERATE QUESTIONS
  const generateQuestions = async () => {
    if (!title) return;

    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    const data = await res.json();
    setQuestions(data.questions);
  };

  // ✅ ADD BOOK
  const addBook = async () => {
    if (!title || !level || !user) return;

    const newBook = {
      title,
      level,
      summary,
      inference,
      reflection,
      student: user.name,
      approved: false,
      points: 0,
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newBook),
    });

    const saved = await res.json();
    setBooks([...books, saved]);

    setTitle("");
    setLevel("");
    setSummary("");
    setInference("");
    setReflection("");
    setQuestions([]);
  };

  // ✅ APPROVE BOOK
  const approveBook = async (id, level, rubric) => {
    const base = level === "easy" ? 2 : level === "medium" ? 5 : 10;
    const mult = rubric === "mastery" ? 2 : rubric === "secure" ? 1.5 : 1;
    const points = Math.round(base * mult);

    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ approved: true, rubric, points }),
    });

    const updated = await res.json();
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? updated : b))
    );
  };

  // ✅ LEADERBOARD
  const studentScores = {};
  books.forEach((b) => {
    if (b.approved) {
      studentScores[b.student] =
        (studentScores[b.student] || 0) + b.points;
    }
  });

  const leaderboard = Object.entries(studentScores)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);

  // ✅ LOGIN SCREEN
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Login</h2>
        <input
          placeholder="Enter name (add 'teacher' if needed)"
          onKeyDown={(e) => {
            if (e.key === "Enter") login(e.target.value);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Welcome {user.name} ({user.role})</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView("student")}>Student</button>
        <button onClick={() => setView("teacher")}>Teacher</button>
        <button onClick={() => setView("leaderboard")}>Leaderboard</button>
      </div>

      {/* STUDENT VIEW */}
      {view === "student" && user.role === "student" && (
        <div>
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

          {Array.isArray(questions) && questions.map((q, i) => (
            <p key={i}>• {q}</p>
          ))}

          <textarea
            placeholder="Summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <br />

          <textarea
            placeholder="Inference"
            value={inference}
            onChange={(e) => setInference(e.target.value)}
          />
          <br />

          <textarea
            placeholder="Reflection"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
          <br /><br />

          <button onClick={addBook}>Submit Book</button>
        </div>
      )}

      {/* TEACHER VIEW */}
      {view === "teacher" && user.role === "teacher" && (
        <div>
          <h3>Teacher Dashboard</h3>

          {books.map((b) => (
            <div key={b.id} style={{ marginBottom: 10 }}>
              <strong>{b.title}</strong> - {b.student}
              <p>{b.summary}</p>

              {!b.approved && (
                <div>
                  <button onClick={() => approveBook(b.id, b.level, "emerging")}>
                    Emerging
                  </button>
                  <button onClick={() => approveBook(b.id, b.level, "secure")}>
                    Secure
                  </button>
                  <button onClick={() => approveBook(b.id, b.level, "mastery")}>
                    Mastery
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LEADERBOARD */}
      {view === "leaderboard" && (
        <div>
          <h3>Leaderboard</h3>
          {leaderboard.map((s, i) => (
            <p key={i}>
              {i + 1}. {s.name} - {s.points}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
