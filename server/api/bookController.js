// server/api/bookController.js - Versión MongoDB
const Book = require("../models/Book");
const Loan = require("../models/Loan");

const bookController = {
  getAllBooks: async (req, res) => {
    try {
      const books = await Book.find();
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getLoanHistory: async (req, res) => {
    try {
      const loans = await Loan.find().sort({ date: -1 });
      res.json(loans);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addBook: async (req, res) => {
    try {
      let coverImage = "";

      if (
        req.files &&
        req.files.coverImage &&
        req.files.coverImage.length > 0
      ) {
        coverImage = `/uploads/${req.files.coverImage[0].filename}`;
      }

      const newBook = new Book({
        bookId: req.body.bookId,
        title: req.body.title,
        author: req.body.author,
        isbn: req.body.isbn || "",
        quantity: parseInt(req.body.quantity),
        availableCopies: parseInt(req.body.quantity),
        isAvailable: true,
        description: req.body.description || "",
        coverImage: coverImage,
        category: req.body.category || "Sin categoría",
      });

      await newBook.save();
      res.status(201).json(newBook);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateBook: async (req, res) => {
    try {
      const { bookId } = req.params;
      const { title, author, isbn, quantity, description, category } = req.body;

      const book = await Book.findOne({ bookId });

      if (!book) {
        return res.status(404).json({ message: "Libro no encontrado" });
      }

      const oldQuantity = book.quantity;
      const newQuantity = parseInt(quantity) || book.quantity;
      const difference = newQuantity - oldQuantity;

      if (title) book.title = title;
      if (author) book.author = author;
      if (isbn) book.isbn = isbn;
      if (description) book.description = description;
      if (category) book.category = category;

      // Actualizar cantidad
      if (!isNaN(newQuantity)) {
        book.quantity = newQuantity;
        book.availableCopies = Math.max(0, book.availableCopies + difference);
        book.isAvailable = book.availableCopies > 0;
      }

      // Actualizar imagen si existe
      if (
        req.files &&
        req.files.coverImage &&
        req.files.coverImage.length > 0
      ) {
        book.coverImage = `/uploads/${req.files.coverImage[0].filename}`;
      }

      await book.save();
      res.json(book);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  deleteBook: async (req, res) => {
    try {
      const { bookId } = req.params;
      await Book.deleteOne({ bookId });
      res.json({ message: "Libro eliminado" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  loanBook: async (req, res) => {
    try {
      const { bookId } = req.params;
      const { username } = req.body;
      const MAX_LOANS = 5;

      // Verificar límite de préstamos activos
      const activeLoans = await Loan.countDocuments({
        username,
        returned: false,
      });

      if (activeLoans >= MAX_LOANS) {
        return res.status(400).json({
          message: `Has alcanzado el límite de ${MAX_LOANS} préstamos activos. Devuelve algunos libros primero.`,
          currentLoans: activeLoans,
          maxLoans: MAX_LOANS,
        });
      }

      // Buscar y actualizar el libro
      const book = await Book.findOne({ bookId });

      if (!book || !book.isAvailable) {
        return res.status(400).json({ message: "Libro no disponible" });
      }

      // Crear registro de préstamo
      const loan = new Loan({
        username: username || "Usuario",
        bookId: book.bookId,
        bookTitle: book.title,
        date: new Date(),
        returned: false,
        status: "Préstamo",
      });

      await loan.save();

      // Actualizar disponibilidad del libro
      book.availableCopies -= 1;
      book.isAvailable = book.availableCopies > 0;
      await book.save();

      res.json({ message: "Libro prestado", book });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  returnBook: async (req, res) => {
    try {
      const { username } = req.body;
      const { bookId } = req.params;

      if (!username) {
        return res.status(400).json({ message: "Usuario no proporcionado" });
      }

      // Buscar préstamo activo
      const loan = await Loan.findOne({
        bookId,
        username,
        returned: false,
      }).sort({ date: -1 });

      if (!loan) {
        return res.status(400).json({
          message: "No tienes un préstamo activo de este libro",
        });
      }

      // Marcar como devuelto
      loan.returned = true;
      loan.returnDate = new Date();
      loan.status = "Devolución";
      await loan.save();

      // Actualizar disponibilidad del libro
      const book = await Book.findOne({ bookId });
      if (book) {
        book.availableCopies += 1;
        book.isAvailable = true;
        await book.save();
      }

      res.json({ message: "Libro devuelto" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getUserLoans: async (req, res) => {
    try {
      const { username } = req.params;

      // Obtener préstamos activos (no devueltos)
      const userLoans = await Loan.find({
        username,
        returned: false,
      }).sort({ date: -1 });

      res.json(userLoans);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getUserLoanHistory: async (req, res) => {
    try {
      const { username } = req.params;

      // Obtener historial completo del usuario
      const userHistory = await Loan.find({ username }).sort({ date: -1 });

      res.json(userHistory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  logHistory: async (req, res) => {
    try {
      const { bookId, bookTitle, username, date, status } = req.body;

      const loan = new Loan({
        bookId: bookId || null,
        bookTitle,
        username,
        date: date || new Date(),
        returned: status === "Devolución",
        status: status || "Acción",
      });

      await loan.save();
      res.status(201).json({ message: "Registro agregado al historial" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = bookController;
