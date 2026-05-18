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
    console.log("API response:", data);
 
    const qs = data.questions || [];
    const diff = data.difficulty || "medium";
 
    setQuestions(qs);
    setDifficulty(diff);
 
    setAnswers(new Array(qs.length).fill(""));
    setAiFeedback(new Array(qs.length).fill(""));
  };
 
  // ✅ MARK ANSWERS
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
 
  // ✅ REVIEW (FINAL FIXED)
  const reviewSubmission = async (id) => {
    const status = selectedStatus[id];
    const feedback = teacherFeedback[id];
 
    if (!feedback || feedback.trim() === "") {
      alert("Feedback required");
      return;
    }
 
    const submission = submissions.find((s) => s.id === id);
 
    let nextTarget = "";
 
    if (status === "rejected") {
      nextTarget = "Improve your answers by adding more detail.";
    } else if (status === "emerging") {
      nextTarget = "Explain your thinking more clearly.";
    } else if (status === "secure") {
      nextTarget = submission?.difficulty === "easy"
        ? "Try a more challenging book."
        : "Keep improving your explanations.";
    } else if (status === "mastery") {
      nextTarget = "Excellent! Try a more challenging book.";
    }
 
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
 
  // ✅ DATA PREP
  const safeSubmissions = Array.isArray(submissions) ? submissions : [];
 
  const mySubmissions = user
    ? safeSubmissions.filter((s) => s.student === user.name)
    : [];
 
  const pendingSubmissions = safeSubmissions.filter(
    (s) => s.status === "pending"
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
 
  // ✅ PROGRESS VIEW
  const myProgress = mySubmissions
    .filter(s => s.status === "approved")
    .map((s) => ({
      title: s.title,
      difficulty: s.difficulty,
      level: s.teacher_level,
      points: s.points
    }));
 
  // ✅ LOGIN
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
    <div style={{ padding: 20 }}>
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
 
          <button onClick={generateQuestions}>Generate Questions</button>
 
          {questions.map((q, i) => (
            <div key={i}>
              <p>{q}</p>
 
              <textarea
                style={{
                  width: "100%",
                  height: difficulty === "hard" ? "160px" : "120px"
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
 
          <button onClick={addBook}>Submit</button>
 
          <h2>📖 My Submissions</h2>
 
          {mySubmissions.map((s) => (
            <div key={s.id}>
              <strong>{s.title}</strong>
 
              {s.status === "approved" && (
                <>
                  <p>✅ {s.teacher_level} ({s.points})</p>
                  <p>{s.teacher_feedback}</p>
                  <p>🎯 {s.next_target}</p>
                </>
              )}
 
              {s.status === "rejected" && (
                <>
                  <p>❌ Needs improvement</p>
                  <p>{s.teacher_feedback}</p>
                </>
              )}
            </div>
          ))}
 
          <h2>📈 My Progress</h2>
 
          {myProgress.map((p, i) => (
            <div key={i}>
              {p.title} → {p.difficulty} → {p.level} → ⭐ {p.points}
            </div>
          ))}
        </div>
      )}
 
      {/* TEACHER */}
      {view === "teacher" && user.role === "teacher" && (
        <div>
          <h2>{pendingSubmissions.length} to Review</h2>
 
          {pendingSubmissions.map((s) => (
            <div key={s.id} style={{ background: "#fff3cd", margin: 10 }}>
              <p>{s.student} - {s.title}</p>
 
              {s.questions.map((q, i) => (
                <div key={i}>
                  <p>{q}</p>
                  <p>{s.answers[i]}</p>
                  <p>{s.ai_feedback[i]}</p>
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
    </div>
  );
}
