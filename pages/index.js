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

  // ✅ LOGIN
  const login = (name) => {
    const role = name.toLowerCase().includes("teacher")
      ? "teacher"
      : "student";
    setUser({ name, role });
  };

  // ✅ LOAD DATA
  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase.from("submissions").select("*");
    if (error) console.error(error);
    else setSubmissions(data || []);
  };

  // ✅ GENERATE QUESTIONS + DIFFICULTY
  const generateQuestions = async () => {
    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title })
    });

    const data = await res.json();
    console.log("API response:", data);

    const qs = data.questions || [];
    const diff = data.difficulty || "medium"; // ✅ IMPORTANT

    setQuestions(qs);
    setDifficulty(diff);

    setAnswers(new Array(qs.length).fill(""));
    setAiFeedback(new Array(qs.length).fill(""));
  };

  // ✅ MARK ANSWERS
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
  
  // ✅ SUBMIT
  const addBook = async () => {

    // ✅ MOVE VALIDATION HERE (CORRECT PLACE)
    if (difficulty === "hard") {
      const tooShort = answers.some(a => (a || "").length < 40);

      if (tooShort) {
        alert("For harder books, please give longer, detailed answers.");
        return;
      }
    }

    const { error } = await supabase.from("submissions").insert([
      {
        student: user.name,
        title,
        difficulty: difficulty || "medium",
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

  // ✅ REVIEW (FIXED + SAFE)
  const reviewSubmission = async (id) => {
    const status = selectedStatus[id];
    const feedback = teacherFeedback[id];
    
    if (status === "rejected") {
      nextTarget = "Improve your answers by adding more detail and explanation.";
    } else if (status === "emerging") {
      nextTarget = "Focus on explaining your thinking clearly.";
    } else if (status === "secure") {
      nextTarget = submission?.difficulty === "easy"
        ? "Try a more challenging book next time."
        : "Keep developing your explanations.";
    } else if (status === "mastery") {
      nextTarget = "Excellent work! Try a more challenging book.";
    }

    if (!feedback || feedback.trim() === "") {
      alert("Feedback required");
      return;
    }

    const submission = submissions.find((s) => s.id === id);

    const difficultyMultiplier = {
      easy: 1,
      medium: 1.5,
      hard: 2
    }[submission?.difficulty || "medium"];

    const qualityMultiplier = {
      mastery: 2,
      secure: 1.5,
      emerging: 1
    }[status] || 1;

    let points = 0;

    if (status !== "rejected") {
      points = Math.round(5 * difficultyMultiplier * qualityMultiplier);
    }

    const { error } = await supabase
      .from("submissions")
      .update({
        status: status === "rejected" ? "rejected" : "approved",
        teacher_level: status,
        teacher_feedback: feedback,
        next_target: nextTarget,
        points
      })
      .eq("id", id);

    if (error) alert(error.message);
    else {
      alert(`✅ Saved! (${points} pts)`);
      fetchSubmissions();
    }
  };

  // ✅ SAFE DATA
const safeSubmissions = Array.isArray(submissions) ? submissions : [];

const pendingSubmissions = safeSubmissions.filter(
  (s) => s.status === "pending"
);

const reviewedSubmissions = safeSubmissions.filter(
  (s) => s.status !== "pending"
);

// ✅ LEADERBOARD
const scores = {};
safeSubmissions.forEach((s) => {
  if (s.status === "approved") {
    scores[s.student] = (scores[s.student] || 0) + s.points;
  }
});

const leaderboard = Object.entries(scores)
  .map(([name, pts]) => ({ name, pts }))
  .sort((a, b) => b.pts - a.pts);

const pendingCount = pendingSubmissions.length;

// ✅ FIXED: SAFE USER CHECK
const mySubmissions = user
  ? safeSubmissions.filter((s) => s.student === user.name)
  : [];

  // ✅ LOGIN SCREEN
  
if (!user) {
  return (
    <div style={styles.loginPage}>
      <div style={styles.loginBox}>
        
        <h1 style={styles.logo}>📚 Read to Lead</h1>
        <p style={{ marginBottom: "20px" }}>
          Enter your name (add "teacher" if staff)
        </p>

        <input
          style={styles.input}
          placeholder="Your name"
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

    {/* HEADER */}
    <div style={styles.header}>
      📚 Read to Lead
    </div>

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
                style={{
                  width: "100%",
                  height: difficulty === "hard" ? "160px" : "120px",
                  padding: "10px",
                  fontSize: "14px",
                  borderRadius: "6px",
                  border: "1px solid #ccc"
                }}
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

          {difficulty === "hard" && (
            <p style={{ color: "red" }}>
              ⚠️ For this book, give detailed answers (at least 2–3 sentences)
            </p>
          )}
 
{difficulty === "medium" && (
  <p>Explain your thinking clearly.</p>
)}
          <button onClick={addBook}>Submit</button>
            
          <h2>📖 My Submissions</h2>

          {mySubmissions.length === 0 && <p>No submissions yet</p>}

          {mySubmissions.map((s) => (
            <div
              key={s.id}
              style={{
                border: "1px solid #ccc",
                padding: 10,
                marginTop: 10
              }}
            >
              <strong>{s.title}</strong>

              {s.status === "pending" && (
                <p>⏳ Waiting for teacher review</p>
              )}

              {s.status === "approved" && (
                <>
                  <p>✅ {s.teacher_level} ({s.points} pts)</p>
                  <p>💬 {s.teacher_feedback}</p>
                  
                  {s.next_target && (
                    <p style={{
                      background: "#e6ffe6",
                      padding: "6px",
                      marginTop: "5px"
                    }}>
                      🎯 {s.next_target}
                    </p>
                  )}

                </>
              )}

              {s.status === "rejected" && (
                <>
                  <p style={{ color: "red" }}>❌ Needs improvement</p>
                  <p>💬 {s.teacher_feedback}</p>

                  <button onClick={() => {
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
          ))}

        </div>
      )}

      {/* TEACHER */}
      {view === "teacher" && user.role === "teacher" && (
        <div>
          <h2>{pendingCount} to Review</h2>

          {pendingSubmissions.map((s) => (
            <div key={s.id} style={{ background: "#fff3cd", margin: 10 }}>
              <p>{s.student} - {s.title}</p>
              <p>📊 {s.difficulty}</p>

              {Array.isArray(s.questions) &&
                s.questions.map((q, i) => (                 
                  <div key={i} style={{ marginBottom: 10 }}>
                    <p><strong>Question:</strong> {q}</p>
                                
                    <p><strong>Student Answer:</strong></p>
                    <p>{s.answers?.[i]}</p>

                    <p><strong>AI Feedback:</strong></p>
                    <p style={{ background: "#e6f7ff", padding: 5, borderLeft: "4px solid blue" }}>
                      {s.ai_feedback?.[i]}
                    </p>
                  </div>
                ))}

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
              }>
                Reject
              </button>

              {selectedStatus[s.id] && (
                <>
                  <textarea
                   style={{
                      width: "100%",
                      height: "120px",
                      padding: "10px",
                      fontSize: "14px",
                      borderRadius: "6px",
                      border: "1px solid #ccc"
                    }} 
                    value={teacherFeedback[s.id] || ""}
                    onChange={(e) =>
                      setTeacherFeedback({
                        ...teacherFeedback,
                        [s.id]: e.target.value
                      })
                    }
                  />
                  <button onClick={() => reviewSubmission(s.id)}>
                    Submit Review
                  </button>
                </>
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
    cursor: "pointer",
  },

  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  }

};

