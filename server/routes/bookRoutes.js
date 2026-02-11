const express = require("express");
const router = express.Router();
const bookController = require("../api/bookController");

// Rutas base
router.get("/", bookController.getAllBooks);

// Esta es la ruta que causaba el error si no estaba bien definida
router.get("/history", bookController.getLoanHistory);

// Rutas de usuario individual
router.get("/user/:username/loans", bookController.getUserLoans);
router.get("/user/:username/history", bookController.getUserLoanHistory);

// Rutas de gestión de libros
router.post("/", bookController.addBook);
router.put("/:bookId", bookController.updateBook);
router.delete("/:bookId", bookController.deleteBook);

// Rutas de préstamos y devoluciones
router.post("/:bookId/loan", bookController.loanBook);
router.post("/:bookId/return", bookController.returnBook);

// Ruta para agregar registros al historial
router.post("/history/log", bookController.logHistory);

module.exports = router;
