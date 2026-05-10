export default function handler(req, res) {
  res.status(200).json({
    questions: [
      "What is the main idea of the story?",
      "Why did the character make an important decision?",
      "What lesson can we learn?"
    ]
  });
}
