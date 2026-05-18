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
 
  // ✅ LOGIN (ready for MS365)
  const login = (name) => {
    const role = name.toLowerCase().includes("teacher") ? "teacher" : "student";
 
    // will come from MS365 later
    const yearGroup = "Y5";
 
    setUser({ name, role, yearGroup });
  };
 
  useEffect(() => {
    fetchSubmissions();
  }, []);
 
  const fetchSubmissions = async () => {
    const { data } = await supabase.from("submissions").select("*");
    setSubmissions(data || []);
  };
 
  // ✅ AI QUESTIONS
  const generateQuestions = async () => {
    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        yearGroup: user?.yearGroup || "Y5"
      })
    });
 
    const data = await res.json();
 
    setQuestions(data.questions || []);
    setDifficulty(data.difficulty || "medium");
 
    setAnswers(new Array((data.questions || []).length).fill(""));
    setAiFeedback(new Array((data.questions || []).length).fill(""));
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
 
  // ✅ SUBMIT
  const addBook = async () => {
 
    if (difficulty === "hard") {
      const tooShort = answers.some(a => (a || "").length < 40);
      if (tooShort) {
        alert("Please give longer answers for challenging books.");
        return;
      }
    }
 
    await supabase.from("submissions").insert([{
      student: user.name,
      year_group: user.yearGroup,
      title,
      difficulty,
      questions,
      answers,
      ai_feedback: aiFeedback,
      status: "pending",
      points: 0
    }]);
 
    alert("✅ Submitted!");
    fetchSubmissions();
  };
 
  // ✅ REVIEW
  const reviewSubmission = async (id) => {
 
    const status = selectedStatus[id];
    const feedback = teacherFeedback[id];
 
    if (!feedback) {
      alert("Write feedback first");
      return;
    }
 
    const submission = submissions.find(s => s.id === id);
 
    let nextTarget = "";
 
    if (status === "rejected") nextTarget = "Improve your answers with more detail.";
    else if (status === "emerging") nextTarget = "Explain your thinking more clearly.";
    else if (status === "secure") nextTarget = "Try a more challenging book next.";
    else if (status === "mastery") nextTarget = "Excellent! Push yourself with harder texts.";
 
    const diff = { easy: 1, medium: 1.5, hard: 2 }[submission?.difficulty];
    const qual = { emerging: 1, secure: 1.5, mastery: 2 }[status];
 
    const points = status === "rejected" ? 0 : Math.round(5 * diff * qual);
 
    await supabase
      .from("submissions")
      .update({
        status: status === "rejected" ? "rejected" : "approved",
        teacher_level: status,
        teacher_feedback: feedback,
        next_target: nextTarget,
        points
      })
      .eq("id", id);
 
    alert("✅ Saved!");
    fetchSubmissions();
  };
 
  const mySubmissions = user
    ? submissions.filter(s => s.student === user.name)
    : [];
 
  const pending = submissions.filter(s => s.status === "pending");
 
  const leaderboard = Object.entries(
    submissions.reduce((acc, s) => {
      if (s.status === "approved")
        acc[s.student] = (acc[s.student] || 0) + s.points;
      return acc;
    }, {})
  ).map(([name, pts]) => ({ name, pts }))
   .sort((a, b) => b.pts - a.pts);
 
  // ✅ LOGIN SCREEN
  if (!user) {
    return (
      <div style={{
        height: "100vh",
        background: "linear-gradient(135deg, #001f3f, #7a0019)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white"
      }}>
        <div style={{
          background: "white",
          color: "#001f3f",
          padding: "40px",
          borderRadius: "10px",
          textAlign: "center"
        }}>
          <h1>📚 Read to Lead</h1>
          <p>Harrow Shenzhen Reading Platform</p>
          <input
            placeholder="Enter name (add 'teacher')"
            onKeyDown={(e) => {
              if (e.key === "Enter") login(e.target.value);
            }}
          />
        </div>
      </div>
    );
  }
 
  return (
    <div style={{
      background: "#f5f5f5",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "Arial"
    }}>
 
      {/* HEADER */}
      <div style={{
        background: "#001f3f",
        color: "white",
        padding: "20px",
        borderRadius: "10px"
      }}>
        <h1>📚 Read to Lead</h1>
        <p>{user.name} ({user.role})</p>
      </div>
 
      <div style={{ marginTop: "10px" }}>
        <button onClick={() => setView("student")}>Student</button>
        <button onClick={() => setView("teacher")}>Teacher</button>
        <button onClick={() => setView("leaderboard")}>Leaderboard</button>
      </div>
 
      {/* STUDENT */}
      {view === "student" && user.role === "student" && (
        <div style={{ background: "white", padding: "20px", marginTop: "10px", borderRadius: "10px" }}>
 
          <h2>📚 Log Your Reading</h2>
 
          <input value={title} onChange={e => setTitle(e.target.value)} />
 
          <button onClick={generateQuestions}>Generate Questions</button>
 
          {questions.map((q, i) => (
            <div key={i}>
              <p>❓ {q}</p>
              <textarea
                style={{
                  width: "100%",
                  height: difficulty === "hard" ? "150px" : "100px"
                }}
                value={answers[i] || ""}
                onChange={(e) => {
                  const a = [...answers];
                  a[i] = e.target.value;
                  setAnswers(a);
                }}
              />
              <button onClick={() => markAnswer(q, answers[i], i)}>
                ✅ Check
              </button>
              <p>💡 {aiFeedback[i]}</p>
            </div>
          ))}
 
          <button onClick={addBook}>🚀 Submit</button>
 
          <h2>📖 My Submissions</h2>
          {mySubmissions.map((s) => (
            <div key={s.id}>
              <strong>{s.title}</strong>
              <p>{s.teacher_feedback}</p>
              <p>🎯 {s.next_target}</p>
            </div>
          ))}
 
          <h2>📈 My Progress</h2>
          {mySubmissions.map((s, i) => (
            <p key={i}>📘 {s.title} → {s.teacher_level} → ⭐ {s.points}</p>
          ))}
        </div>
      )}
 
      {/* TEACHER */}
      {view === "teacher" && (
        <div>
          <h2>{pending.length} to review</h2>
 
          {pending.map(s => (
            <div key={s.id}>
              <p>{s.student} - {s.title}</p>
 
              {s.questions.map((q, i) => (
                <div key={i}>
                  <p>{q}</p>
                  <p>{s.answers[i]}</p>
                  <p>{s.ai_feedback[i]}</p>
                </div>
              ))}
 
              <button onClick={() => setSelectedStatus({ ...selectedStatus, [s.id]: "emerging" })}>Emerging</button>
              <button onClick={() => setSelectedStatus({ ...selectedStatus, [s.id]: "secure" })}>Secure</button>
              <button onClick={() => setSelectedStatus({ ...selectedStatus, [s.id]: "mastery" })}>Mastery</button>
              <button onClick={() => setSelectedStatus({ ...selectedStatus, [s.id]: "rejected" })}>Reject</button>
 
              <textarea onChange={e => setTeacherFeedback({ ...teacherFeedback, [s.id]: e.target.value })} />
 
              <button onClick={() => reviewSubmission(s.id)}>Submit Review</button>
            </div>
          ))}
        </div>
      )}
 
      {/* LEADERBOARD */}
      {view === "leaderboard" && (
        <div>
          <h2>🏆 Leaderboard</h2>
          {leaderboard.map((s, i) => (
            <p key={i}>{i + 1}. {s.name} – {s.pts}</p>
          ))}
        </div>
      )}
 
    </div>
  );
}
``
