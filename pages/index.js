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

  // LOGIN
  const login = (name) => {
    const role = name.toLowerCase().includes("teacher")
      ? "teacher"
      : "student";
    setUser({ name, role });
  };

  // LOAD DATA
  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase.from("submissions").select("*");
    if (error) console.error(error);
    else setSubmissions(data || []);
  };

  // GENERATE QUESTIONS
  const generateQuestions = async () => {
    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title, yearGroup: "Y5" })
    });

    const data = await res.json();
    const qs = data.questions || [];
    const diff = data.difficulty || "medium";

    setQuestions(qs);
    setDifficulty(diff);
    setAnswers(new Array(qs.length).fill(""));
    setAiFeedback(new Array(qs.length).fill(""));
  };

  // MARK ANSWERS
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

  // SUBMIT
  const addBook = async () => {

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

  // REVIEW (FULLY RESTORED + FIXED)
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
      nextTarget = "Focus on explaining your thinking clearly.";
    } else if (status === "secure") {
      nextTarget =
        submission?.difficulty === "easy"
          ? "Try a more challenging book next time."
          : "Keep developing your explanations.";
    } else if (status === "mastery") {
      nextTarget = "Excellent work! Try a more challenging book.";
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

    if (error) {
      alert(error.message);
    } else {
      alert(`✅ Saved! (${points} pts)`); // ✅ RESTORED
      fetchSubmissions();
    }
  };

  // DATA
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

  // LOGIN SCREEN
  if (!user) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <h1>📚 Read to Lead</h1>
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
    <div style={styles.appPage}>
      <div style={styles.header}>📚 Read to Lead</div>

      <div style={styles.container}>

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

            {mySubmissions.map((s) => (
              <div key={s.id} style={styles.card}>
                <strong>{s.title}</strong>
                <p>{s.teacher_feedback}</p>
                {s.next_target && <p>🎯 {s.next_target}</p>}
              </div>
            ))}

          </div>
        )}

        {/* TEACHER */}
        {view === "teacher" && user.role === "teacher" && (
          <div>

            <h2>{pendingSubmissions.length} to review</h2>

            {pendingSubmissions.map((s) => (
              <div key={s.id} style={styles.card}>

                <p><strong>{s.student} - {s.title}</strong></p>
                <p>📊 {s.difficulty}</p>

                {Array.isArray(s.questions) && s.questions.map((q, i) => (
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
                }>Reject</button>

                {selectedStatus[s.id] && (
                  <>
                    <textarea
                      style={styles.textarea}
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
    background: "#002147",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "white"
  },
  loginBox: {
    background: "white",
    color: "black",
    padding: "30px",
    borderRadius: "10px"
  },
  header: {
    background: "#002147",
    color: "white",
    padding: "15px"
  },
  appPage: {
    background: "#f4f6f8",
    minHeight: "100vh"
  },
  container: {
    maxWidth: "900px",
    margin: "20px auto"
  },
  textarea: {
    width: "100%",
    height: "120px"
  },
  card: {
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    marginTop: "15px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
  }
};
