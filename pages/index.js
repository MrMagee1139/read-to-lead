import { useState } from "react";

export default function ReadToLeadApp() {

  const [user, setUser] = useState(null);
  const [view, setView] = useState("student");

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);

  // ✅ LOGIN
  const login = (name) => {
    const role = name.toLowerCase().includes("teacher")
      ? "teacher"
      : "student";

    setUser({ name, role });
  };

  // ✅ GENERATE QUESTIONS
  const generateQuestions = async () => {
    try {
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

    } catch (error) {
      console.error(error);
      alert("Error generating questions");
    }
  };

  // ✅ SUBMIT BOOK
