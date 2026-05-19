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

  const safeSubmissions = Array.isArray(submissions) ? submissions : [];

  const mySubmissions = user
    ? safeSubmissions.filter((s) => s.student === user.name)
    : [];

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

  return (
    <div style={styles.appPage}>
      <div style={styles.header}>📚 Read to Lead</div>

      <div style={styles.container}>
        <button style={styles.navButton} onClick={() => setView("student")}>
          Student
        </button>

        <input
          placeholder="Book title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <button onClick={generateQuestions}>Generate Questions</button>
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

              {/* ✅ COLOURED STRIP */}
              <div style={{
                height: "6px",
                backgroundColor:
                  s.status === "pending" ? "#999" :
                  s.status === "rejected" ? "#c62828" :
                  levelColor
              }} />

              <div style={{ padding: "12px" }}>

                <strong>{s.title}</strong>

                {s.status === "pending" && (
                  <p>⏳ Waiting for teacher review</p>
                )}

                {s.status === "approved" && (
                  <>
                    <p style={{
                      color: levelColor,
                      fontWeight: "bold"
                    }}>
                      {s.teacher_level.toUpperCase()} ({s.points} pts)
                    </p>

                    <p>💬 {s.teacher_feedback}</p>

                    {s.next_target && (
                      <p style={styles.targetBox}>
                        🎯 {s.next_target}
                      </p>
                    )}
                  </>
                )}

                {s.status === "rejected" && (
                  <>
                    <p style={{ color: "#c62828", fontWeight: "bold" }}>
                      ❌ Needs improvement
                    </p>

                    <p>💬 {s.teacher_feedback}</p>

                    <button style={{ marginTop: "5px" }} onClick={() => {
                      setTitle(s.title);
                      setQuestions(s.questions || []);
                      setAnswers(s.answers || []);
                      setAiFeedback(s.ai_feedback || []);
                    }}>
                      ✏️ Improve and Resubmit
                    </button>
                  </>
                )}

              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  loginPage: {
    backgroundColor: "#002147",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  loginBox: {
    background: "white",
    padding: "40px",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "350px",
    textAlign: "center",
  },

  logo: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#002147",
  },

  header: {
    backgroundColor: "#002147",
    color: "white",
    padding: "15px",
    textAlign: "center",
    fontSize: "22px",
    fontWeight: "bold",
  },

  appPage: {
    backgroundColor: "#f4f6f8",
    minHeight: "100vh",
  },

  container: {
    maxWidth: "900px",
    margin: "20px auto",
    padding: "20px",
  },

  navButton: {
    margin: "5px",
    padding: "10px 15px",
    backgroundColor: "#002147",
    color: "white",
    border: "none",
    borderRadius: "6px",
  },

  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },

  card: {
    background: "white",
    borderRadius: "12px",
    marginTop: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },

  targetBox: {
    background: "#e6ffe6",
    padding: "8px",
    borderRadius: "6px",
    marginTop: "5px",
  }
};
