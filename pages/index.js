import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ connect to Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

  // ✅ LOAD ALL DATA FROM DATABASE
  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*");

    if (error) {
      console.error(error);
    } else {
      setSubmissions(data || []);
    }
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

  // ✅ SAVE SUBMISSION TO DATABASE
  const addBook = async () => {
    console.log("Submitting to Supabase...");
    
    const { data, error } = await supabase
      .from("submissions")
      .insert([
        {
          student: user.name,
          title,
          level,
          questions,
          answers,
          ai_feedback: aiFeedback,
          status: "pending",
          points: 0
        }
      ]);

    console.log("Result:", data, error);
    
    if (error) {
      alert(error.message);
    } else {
      alert("✅ Submitted!");
    }
  };

  // ✅ TEACHER APPROVES + SAVES POINTS
  const approveSubmission = async (id, teacherLevel, bookLevel) => {

  console.log("Approving:", id, teacherLevel);

  const base =
    bookLevel === "easy" ? 2 :
    bookLevel === "medium" ? 5 : 10;

  const multiplier =
    teacherLevel === "mastery" ? 2 :
    teacherLevel === "secure" ? 1.5 : 1;

  const points = Math.round(base * multiplier);

  const { data, error } = await supabase
    .from("submissions")
    .update({
      status: "approved",
      teacher_level: teacherLevel,
      points: points
    })
    .eq("id", id);

  console.log("Update result:", data, error);

  if (error) {
    alert(error.message);
  } else {
    alert("✅ Mark saved!");
    fetchSubmissions(); // ✅ THIS IS CRITICAL
  }
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
  
  const mySubmissions = submissions.filter(
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

      {/* STUDENT VIEW */}
      {view === "student" && user.role === "student" && (
  <div>
    <h2>📚 Log a Book</h2>

    <input
      placeholder="Enter Book title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />

    <button onClick={generateQuestions}>Generate Questions</button>

    {questions.map((q, i) => (
      <div key={i} style={{ marginTop: 10 }}>
        <p><strong>Question {i + 1}</strong></p>
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

    <hr />

    {/* ✅ NEW DASHBOARD SECTION */}
    <h2>📖 My Reading</h2>

    {mySubmissions.length === 0 && (
      <p>No books submitted yet</p>
    )}

    {mySubmissions.map((s) => (
      <div key={s.id} style={{
        border: "1px solid #ccc",
        padding: 10,
        marginTop: 10
      }}>
        <strong>{s.title}</strong>

        {s.status === "approved" ? (
          <p>✅ Approved ({s.points} pts)</p>
        ) : (
          <p>⏳ Pending</p>
        )}
      </div>
    ))}

    <h3>⭐ Total Points: {myPoints}</h3>
  </div>
)}
      {/* TEACHER VIEW */}
      {view === "teacher" && user.role === "teacher" && (
        <div>
          <h2>Teacher Dashboard</h2>

          {submissions.map((s) => (
            <div key={s.id} style={{ border: "1px solid black", margin: 10 }}>
              <p><strong>{s.student}</strong> - {s.title}</p>

              {s.questions?.map((q, i) => (
                <div key={i}>
                  <p>{q}</p>
                  <p><strong>Answer:</strong> {s.answers[i]}</p>
                  <p>{s.ai_feedback[i]}</p>
                </div>
              ))}

              {s.status === "pending" && (
                <div>
                  <button onClick={() =>
                    setSelectedStatus({ ...selectedStatus, [s.id]: "emerging" })
                  }>
                    Emerging
                  </button>

                  <button onClick={() =>
                    setSelectedStatus({ ...selectedStatus, [s.id]: "secure" })
                  }>
                    Secure
                  </button>

                  <button onClick={() =>
                    setSelectedStatus({ ...selectedStatus, [s.id]: "mastery" })
                  }>
                    Mastery
                  </button>

                  <button
                    style={{ backgroundColor: "red", color: "white" }}
                    onClick={() =>
                      setSelectedStatus({ ...selectedStatus, [s.id]: "rejected" })
                    }
                  >
                    Reject
                  </button>

                  {/* ✅ FEEDBACK BOX APPEARS AFTER SELECT */}
                  {selectedStatus[s.id] && (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        placeholder="Write feedback for student..."
                        value={teacherFeedback[s.id] || ""}
                        onChange={(e) =>
                          setTeacherFeedback({
                            ...teacherFeedback,
                            [s.id]: e.target.value
                          })
                        }
                      />

                      <br />

                      <button onClick={() => reviewSubmission(s.id)}>
                        Submit Review
                      </button>
                    </div>
                  )}
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
