return (
  <div style={{
    padding: 20,
    fontFamily: "Arial",
    maxWidth: 600,
    margin: "auto"
  }}>
    <h1 style={{ textAlign: "center" }}>📚 Read to Lead</h1>

    <h3>Welcome {user.name} ({user.role})</h3>

    <div style={{ marginBottom: 20 }}>
      <button onClick={() => setView("student")} style={btn}>
        Student
      </button>
      <button onClick={() => setView("teacher")} style={btn}>
        Teacher
      </button>
      <button onClick={() => setView("leaderboard")} style={btn}>
        Leaderboard
      </button>
    </div>

    {view === "student" && user.role === "student" && (
      <div style={card}>
        <h2>Log a Book</h2>

        <input
          placeholder="Book title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={input}
        />

        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={input}
        >
          <option value="">Select level</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button onClick={generateQuestions} style={mainBtn}>
          Generate Questions
        </button>

        {questions.map((q, i) => (
          <p key={i}>• {q}</p>
        ))}

        <textarea
          placeholder="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          style={textarea}
        />

        <textarea
          placeholder="Inference"
          value={inference}
          onChange={(e) => setInference(e.target.value)}
          style={textarea}
        />

        <textarea
          placeholder="Reflection"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          style={textarea}
        />

        <button onClick={addBook} style={mainBtn}>
          Submit Book
        </button>
      </div>
    )}

    {view === "leaderboard" && (
      <div style={card}>
        <h2>🏆 Leaderboard</h2>
        {leaderboard.map((s, i) => (
          <p key={i}>
            {i + 1}. {s.name} – {s.points} pts
          </p>
        ))}
      </div>
    )}
  </div>
);
