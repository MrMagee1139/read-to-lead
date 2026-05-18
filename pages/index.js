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

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [aiFeedback, setAiFeedback] = useState([]);

  const [submissions, setSubmissions] = useState([]);

  // ✅ NEW STATES
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });

    const data = await res.json();
    const qs = data.questions || [];

    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(""));
    setAiFeedback(new Array(qs.length).fill(""));
  };

  // ✅ MARK ANSWER
  const markAnswer = async (question, answer, index) => {
    const res = await fetch("/api/mark-answer", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ question, answer })
    });

    const data = await res.json();
    const newFeedback = [...aiFeedback];
    newFeedback[index] = data.result;
    setAiFeedback(newFeedback);
  };

  // ✅ SAVE SUBMISSION
  const addBook = async () => {
    const { error } = await supabase.from("submissions").insert([
      {
        student: user.name,
        title,
        difficulty: bookLevel?.difficulty || "medium",
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

  // ✅ TEACHER REVIEW
  const reviewSubmission = async (id) => {
    const status = selectedStatus[id];
    const feedback = teacherFeedback[id];
    const difficulty = {
      easy: 1,
      medium: 1.5,
      hard: 2
    }[submissions.find(s => s.id === id)?.difficulty] || 1;

    const quality = {
      mastery: 2,
      secure: 1.5,
      emerging: 1
    }[status] || 0;

    let points = 0;

    if (!feedback || feedback.trim() === "") {
      alert("Feedback required");
      return;
    }

    if (status !== "rejected") {
      points = Math.round(5 * difficulty * quality);
    }

    const { error } = await supabase
      .from("submissions")
      .update({
        status: status === "rejected" ? "rejected" : "approved",
        teacher_level: status,
        teacher_feedback: feedback,
        points
      })
      .eq("id", id);

    if (error) alert(error.message);
    else {
      alert("✅ Review saved!");
      fetchSubmissions();
    }
  };

  // ✅ SAFE DATA
  const safeSubmissions = Array.isArray(submissions) ? submissions : [];

  const pendingSubmissions = safeSubmissions.filter(
    (s) => s.status === "pending"
  );

  const reviewedSubmissions = safeSubmissions.filter(
    (s) => s.status === "approved" || s.status === "rejected"
  );

  const pendingCount = pendingSubmissions.length;

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

  const mySubmissions = safeSubmissions.filter(
    (s) => s.student === user.name
  );

  const myPoints = mySubmissions
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + (s.points || 0), 0);

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
                Check
              </button>

              <p>{aiFeedback[i]}</p>
            </div>
          ))}

          <button onClick={addBook}>Submit</button>

          <h2>My Reading</h2>

          {mySubmissions.map((s) => (
            <div key={s.id}>
              <strong>{s.title}</strong>

              {s.status === "approved" && (
                <>
                  <p>✅ {s.teacher_level} ({s.points})</p>
                  <p>{s.teacher_feedback}</p>
                </>
              )}

              {s.status === "rejected" && (
                <>
                  <p>❌ Needs improvement</p>
                  <p>{s.teacher_feedback}</p>
                </>
              )}

              {s.status === "pending" && <p>⏳ Pending</p>}
            </div>
          ))}

          <h3>Total: {myPoints}</h3>
        </div>
      )}

      {/* TEACHER */}
      {view === "teacher" && user.role === "teacher" && (
        <div>
          <h2>Teacher Dashboard ({pendingCount})</h2>
          <p>📊 Difficulty: {s.difficulty}</p>
        
          <h3>🟡 Needs Review</h3>

          {pendingSubmissions.map((s) => (
            <div key={s.id} style={{ background: "#fff3cd", margin: 10 }}>
              <p>{s.student} - {s.title}</p>

              {Array.isArray(s.questions) &&
                s.questions.map((q, i) => (
                  <div key={i}>
                    <p>{q}</p>
                    <p>{s.answers?.[i]}</p>
                    <p>{s.ai_feedback?.[i]}</p>
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
                    Submit
                  </button>
                </>
              )}
            </div>
          ))}

          <h3>✅ Reviewed</h3>

          {reviewedSubmissions.map((s) => (
            <div key={s.id}>
              <p>{s.student} - {s.title}</p>
              <p>{s.teacher_level}</p>
              <p>{s.teacher_feedback}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
