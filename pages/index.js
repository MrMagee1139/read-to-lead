import { useState } from "react";

export default function ReadToLeadApp() {

  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [user, setUser] = useState({ name: "Andrew", role: "student" });
  const [view, setView] = useState("student");

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");

  const generateQuestions = async () => {
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

