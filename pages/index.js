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
  const [bookLevel, setBookLevel] = useState(null);

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

  // ✅ CHECK BOOK LEVEL (mock or AI)
  const getBookLevel = async () => {
    const res = await fetch("/api/get-book-level", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title })
    });

    const data = await res.json();
    setBookLevel(data);
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

  // ✅ SUBMIT BOOK
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

  // ✅ TEACHER REVIEW WITH CORRECT SCORING
  const reviewSubmission = async (id) => {
    const status = selectedStatus[id];
    const feedback = teacherFeedback[id];

    if (!feedback || feedback.trim() === "") {
      alert("Feedback required");
      return;
    }

    const submission = submissions.find((item) => item.id === id);

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

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "auto" }}>
      <h1>📚 Read to Lead</h1>
      <h3>{user.name} ({user.role})</h3>

      <button onClick={() => setView("student")}>Student</button>
      <button onClick={() => setView("teacher")}>Teacher</button>

      {/* STUDENT */}
      {view === "student" && user.role === "student" && (
        <div>
          <input
            placeholder="Book title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <button onClick={getBookLevel}>Check Level</button>

          {bookLevel && (
            <p>📊 Difficulty: {bookLevel.difficulty}</p>
          )}

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
        </div>
      )}

      {/* TEACHER */}
      {view === "teacher" && user.role === "teacher" && (
        <div>
          <h2>{pendingCount} to Review</h2>

          <h3>🟡 Pending</h3>

          {pendingSubmissions.map((s) => (
            <div key={s.id} style={{ background: "#fff3cd", margin: 10 }}>
              <p>{s.student} - {s.title} (📊 {s.difficulty})</p>

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
                    Submit Review
                  </button>
                </>
              )}
            </div>
          ))}

          <h3>✅ Reviewed</h3>

          {reviewedSubmissions.map((s) => (
            <div key={s.id} style={{ margin: 10 }}>
              <p>{s.student} - {s.title}</p>
              <p>{s.teacher_level}</p>
              <p>{s.teacher_feedback}</p>
              <p>⭐ {s.points}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
``
