const fs = require("fs");
const path = require("path");

// Definir categorías por libro
const bookCategories = {
  B001: "Ficción",
  B002: "Infantil",
  B003: "Clásicos",
  B004: "Ciencia",
  B005: "Programación",
  B006: "Programación",
  B007: "Ficción",
  B008: "Fantasía",
  B009: "Distopía",
  B010: "Ciencia",
  B011: "Clásicos",
  B012: "Historia",
  B013: "Estrategia",
  B014: "Clásicos",
  B015: "Tecnología",
  B016: "Geografía",
  B017: "Historia",
  B018: "Psicología",
  B019: "Economía",
  B020: "Cocina",
  B022: "Pruebas",
  B023: "Pruebas",
  B024: "Pruebas",
  B025: "Pruebas",
};

// Definir años de publicación
const bookYears = {
  B001: 1967,
  B002: 1943,
  B003: 1605,
  B004: 1988,
  B005: 2001,
  B006: 2008,
  B007: 1998,
  B008: 1954,
  B009: 1949,
  B010: 1859,
  B011: 800,
  B012: 2014,
  B013: 500,
  B014: 1866,
  B015: 2010,
  B016: 2015,
  B017: 1947,
  B018: 2009,
  B019: 2010,
  B020: 2000,
  B022: 2024,
  B023: 2024,
  B024: 2024,
  B025: 2024,
};

const booksPath = path.join(__dirname, "server", "data", "books.json");
const books = JSON.parse(fs.readFileSync(booksPath, "utf8"));

// Actualizar cada libro
books.forEach((book) => {
  book.category = bookCategories[book.bookId] || "General";
  book.year = bookYears[book.bookId] || 2024;
  // Mapear stockDisponible (que es lo que usa el frontend)
  book.stockDisponible = book.availableCopies;
});

fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));
console.log("✅ books.json actualizado con categorías y años");
