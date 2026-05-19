import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ReadToLeadApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("student");

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [aiFeedback, setAiFeedback] = useState([]);

  const [submissions, setSubmissions] = useState([]);

  const [selectedStatus, setSelectedStatus] = useState({});
  const [teacherFeedback, setTeacherFeedback] = useState({});

  const login = (name) => {
    const role = name.toLowerCase().includes("teacher")
      ? "teacher"
      : "student";
    setUser({ name, role });
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase.from("submissions").select("*");
    if (error) console.error(error);
    else setSubmissions(data || []);
  };

  const generateQuestions = async () => {
    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });

    const data = await res.json();
    const qs = data.questions || [];
    const diff = data.difficulty || "medium";

    setQuestions(qs);
    setDifficulty(diff);
    setAnswers(new Array(qs.length).fill(""));
    setAiFeedback(new Array(qs.length).fill(""));
  };

  const markAnswer = async (question, answer, index) => {
    const res = await fetch("/api/mark-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer })
    });

    const data = await res.json();
    const newFeedback = [...aiFeedback];
    newFeedback[index] = data.result;
    setAiFeedback(newFeedback);
  };

  const addBook = async () => {
    if (difficulty === "hard") {
      const tooShort = answers.some(a => (a || "").length < 40);
      if (tooShort) {
        alert("For harder books, please give longer answers.");
        return;
      }
    }

    const { error } = await supabase.from("submissions").insert([
      {
        student: user.name,
        title,
        difficulty,
        questions,
        answers,
        ai_feedback: aiFeedback,
        status: "pending",
        points: 0
      }
    ]);

    if (error) alert(error.message);
    else {
      alert("✅ Submitted!");
      fetchSubmissions();
    }
  };

  // ---------------- DATA ----------------

  const safeSubmissions = Array.isArray(submissions) ? submissions : [];

  const pendingSubmissions = safeSubmissions.filter(
    (s) => s.status === "pending"
  );

  const scores = {};
  safeSubmissions.forEach((s) => {
    if (s.status === "approved") {
      scores[s.student] = (scores[s.student] || 0) + s.points;
    }
  });

  const leaderboard = Object.entries(scores)
    .map(([name, pts]) => ({ name, pts }))
    .sort((a, b) => b.pts - a.pts);

  const mySubmissions = user
    ? safeSubmissions.filter((s) => s.student === user.name)
    : [];

  // ---------------- LOGIN ----------------

  if (!user) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <h1 style={styles.logo}>📚 Read to Lead</h1>

          <input
            style={styles.input}
            placeholder="Your name"
            autoComplete="username"
            onKeyDown={(e) => {
              if (e.key === "Enter") login(e.target.value);
            }}
          />
        </div>
      </div>
    );
  }

  // ---------------- APP ----------------

  return (
    <div style={styles.appPage}>
      <div style={styles.header}>📚 Read to Lead</div>

      <div style={styles.container}>

        <button style={styles.navButton} onClick={() => setView("student")}>Student</button>
        <button style={styles.navButton} onClick={() => setView("teacher")}>Teacher</button>
        <button style={styles.navButton} onClick={() => setView("leaderboard")}>Leaderboard</button>

        {/* STUDENT */}
        {view === "student" && user.role === "student" && (
          <div>

            <input
              placeholder="Book title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <button onClick={generateQuestions}>Generate Questions</button>

            {questions.map((q, i) => (
              <div key={i}>
                <p>{q}</p>

                <textarea
                  style={styles.textarea}
                  value={answers[i] || ""}
                  onChange={(e) => {
                    const a = [...answers];
                    a[i] = e.target.value;
                    setAnswers(a);
                  }}
                />

                <button onClick={() => markAnswer(q, answers[i], i)}>
                  Check
                </button>

                <p>{aiFeedback[i]}</p>
              </div>
            ))}

            <button onClick={addBook}>Submit</button>

            <h2>📖 My Submissions</h2>

            {mySubmissions.map((s) => {

              const levelColor =
                s.teacher_level === "mastery" ? "#2e7d32" :
                s.teacher_level === "secure" ? "#1565c0" :
                s.teacher_level === "emerging" ? "#f9a825" :
                "#c62828";

              return (
                <div key={s.id} style={styles.card}>

                  <div style={{
                    height: "6px",
                    backgroundColor:
                      s.status === "pending" ? "#999" :
                      s.status === "rejected" ? "#c62828" :
                      levelColor
                  }} />

                  <div style={{ padding: "10px" }}>
                    <strong>{s.title}</strong>

                    {s.status === "pending" && (
                      <p>⏳ Waiting for teacher review</p>
                    )}

                    {s.status === "approved" && (
                      <>
                        <p style={{ color: levelColor, fontWeight: "bold" }}>
                          {s.teacher_level.toUpperCase()} ({s.points} pts)
                        </p>
                        <p>💬 {s.teacher_feedback}</p>
                      </>
                    )}
                  </div>

                </div>
              );
            })}

          </div>
        )}

        {/* TEACHER (UNCHANGED) */}
        {view === "teacher" && user.role === "teacher" && (
          
<div>
  <h2>{pending.length} to review</h2>

  {pending.map((s) => (
    <div key={s.id} style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc" }}>

      <p><strong>{s.student} - {s.title}</strong></p>

      <p>📊 Difficulty: {s.difficulty}</p>

      {/* ✅ QUESTIONS + ANSWERS */}
      {Array.isArray(s.questions) && s.questions.map((q, i) => (
        <div key={i} style={{ marginBottom: "10px" }}>

          <p><strong>Question:</strong> {q}</p>

          <p><strong>Answer:</strong> {s.answers?.[i]}</p>

          <p style={{ background: "#e6f7ff", padding: "5px" }}>
            <strong>AI Feedback:</strong> {s.ai_feedback?.[i]}
          </p>

        </div>
      ))}

      {/* ✅ MARKING BUTTONS */}
      <button onClick={() =>
        setSelectedStatus({ ...selectedStatus, [s.id]: "emerging" })
      }>Emerging</button>

      <button onClick={() =>
        setSelectedStatus({ ...selectedStatus, [s.id]: "secure" })
      }>Secure</button>

      <button onClick={() =>
        setSelectedStatus({ ...selectedStatus, [s.id]: "mastery" })
      }>Mastery</button>

      <button onClick={() =>
        setSelectedStatus({ ...selectedStatus, [s.id]: "rejected" })
      }>Reject</button>

      {/* ✅ FEEDBACK BOX */}
      {selectedStatus[s.id] && (
        <>
          <textarea
            style={{ width: "100%", marginTop: "10px" }}
            placeholder="Write feedback..."
            value={teacherFeedback[s.id] || ""}
            onChange={(e) =>
              setTeacherFeedback({
                ...teacherFeedback,
                [s.id]: e.target.value
              })
            }
          />

          <button onClick={() => reviewSubmission(s.id)}>
            ✅ Submit Review
          </button>
        </>
      )}

    </div>
  ))}
</div>


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
    </div>
  );
}

// ---------------- STYLES ----------------

const styles = {
  loginPage: {
    backgroundColor: "#002147",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  loginBox: {
    background: "white",
    padding: "40px",
    borderRadius: "12px",
    width: "300px",
    textAlign: "center"
  },

  header: {
    backgroundColor: "#002147",
    color: "white",
    padding: "15px",
    textAlign: "center"
  },

  appPage: {
    backgroundColor: "#f4f6f8",
    minHeight: "100vh"
  },

  container: {
    maxWidth: "900px",
    margin: "20px auto",
    padding: "20px"
  },

  navButton: {
    margin: "5px",
    padding: "10px",
    background: "#002147",
    color: "white",
    border: "none",
    borderRadius: "6px"
  },

  input: {
    padding: "10px",
    width: "100%"
  },

  textarea: {
    width: "100%",
    height: "120px",
    marginTop: "5px"
  },

  card: {
    background: "white",
    borderRadius: "12px",
    marginTop: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    overflow: "hidden"
  }
};
