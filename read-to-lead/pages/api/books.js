let books = [];
let idCounter = 1;

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.json(books);
  }

  if (req.method === "POST") {
    const newBook = {
      id: idCounter++,
      approved: false,
      points: 0,
      ...req.body,
    };

    books.push(newBook);
    return res.json(newBook);
  }

  if (req.method === "PUT") {
    const { id } = req.query;

    const index = books.findIndex((b) => b.id == id);

    if (index === -1) {
      return res.status(404).json({ error: "Book not found" });
    }

    books[index] = {
      ...books[index],
      ...req.body,
    };

    return res.json(books[index]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}