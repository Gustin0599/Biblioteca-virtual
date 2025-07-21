// server/routes/bookRoutes.js
const express = require("express");
const router = express.Router();
const bookController = require("../api/bookController");

console.log("DEBUG: Tipo de bookController:", typeof bookController);
console.log(
  "DEBUG: Tipo de bookController.getAllBooks:",
  typeof bookController.getAllBooks
);

/**
 * @namespace bookRoutes
 * @description Defines API routes for book management.
 */

// Rutas para consultar libros (GET)
router.get("/books", bookController.getAllBooks);
router.get("/books/:bookId", bookController.getBookById);

// Ruta para añadir un nuevo libro (POST - Inserción)
router.post("/books", bookController.addBook);

// Ruta para actualizar un libro (PUT - Actualización)
router.put("/books/:bookId", bookController.updateBook);

// Ruta para eliminar un libro (DELETE - Eliminación)
router.delete("/books/:bookId", bookController.deleteBook);

// Rutas para prestar y devolver libros
router.post("/books/:bookId/loan", bookController.loanBook);
router.post("/books/:bookId/return", bookController.returnBook);

module.exports = router;
