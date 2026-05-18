export default function handler(req, res) {
  if (req.method === "POST") {
    const { id, status, feedback } = req.body;

    console.log("Received review:", { id, status, feedback });

    // Later: save to database

    res.status(200).json({ message: "Saved successfully" });
  } else {
    res.status(405).end();
  }
}
