const express = require("express");
const path = require("path");
const pool = require("./db"); // Conexión a Postgres

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public")); // Carga tu diseño desde la carpeta public

// --- RUTA PARA OBTENER LIBROS ---
app.get("/api/books", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al obtener libros" });
  }
});

// --- RUTA PARA PRÉSTAMOS ---
app.post("/api/books/loan/:id", async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  try {
    const update = await pool.query(
      "UPDATE books SET available_copies = available_copies - 1 WHERE book_id = $1 AND available_copies > 0 RETURNING title",
      [id],
    );
    if (update.rowCount === 0)
      return res.status(400).json({ error: "Sin copias" });

    await pool.query(
      "INSERT INTO loans (book_id, username, book_title, status) VALUES ($1, $2, $3, $4)",
      [id, username, update.rows[0].title, "Préstamo"],
    );
    res.json({ message: "Éxito" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});
