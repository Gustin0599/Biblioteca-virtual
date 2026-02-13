// server/api/bookController.js - Versión MongoDB
const Book = require("../models/Book");
const Loan = require("../models/Loan");

function buildCoverImageFromUpload(req) {
  if (!req.files || !req.files.coverImage || req.files.coverImage.length === 0) {
    return "";
  }

  const file = req.files.coverImage[0];

  if (file.buffer && file.mimetype) {
    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  }

  if (file.filename) {
    return `/uploads/${file.filename}`;
  }

  return "";
}

async function createHistoryEntry({
  username,
  bookId = "",
  bookTitle = "N/A",
  status,
  returned = false,
  returnDate = null,
}) {
  const entry = new Loan({
    username: (username || "sistema").toLowerCase(),
    bookId,
    bookTitle,
    status: status || "Acción",
    date: new Date(),
    returned,
    returnDate,
    isHistoryOnly: true,
  });

  await entry.save();
}

const bookController = {
  getAllBooks: async (req, res) => {
    try {
      const books = await Book.find()
        .collation({ locale: "en", numericOrdering: true })
        .sort({ bookId: 1 });
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getLoanHistory: async (req, res) => {
    try {
      const loans = await Loan.find().sort({ date: -1, createdAt: -1, _id: -1 });
      res.json(loans);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addBook: async (req, res) => {
    try {
      const coverImage = buildCoverImageFromUpload(req);

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
      await createHistoryEntry({
        username: req.body.username,
        bookId: newBook.bookId,
        bookTitle: newBook.title,
        status: "Creación de Libro",
      });
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
      const coverImage = buildCoverImageFromUpload(req);
      if (coverImage) {
        book.coverImage = coverImage;
      }

      await book.save();
      await createHistoryEntry({
        username: req.body.username,
        bookId: book.bookId,
        bookTitle: book.title,
        status: "Edición de Libro",
      });
      res.json(book);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  deleteBook: async (req, res) => {
    try {
      const { bookId } = req.params;
      const deletedBook = await Book.findOneAndDelete({ bookId });

      if (!deletedBook) {
        return res.status(404).json({ message: "Libro no encontrado" });
      }

      await createHistoryEntry({
        username: req.body?.username,
        bookId: deletedBook.bookId,
        bookTitle: deletedBook.title,
        status: "Eliminación de Libro",
      });
      res.json({ message: "Libro eliminado" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  loanBook: async (req, res) => {
    try {
      const { bookId } = req.params;
      const { username } = req.body;
      const normalizedUsername = (username || "usuario").toLowerCase();
      const MAX_LOANS = 5;

      // Verificar límite de préstamos activos
      const activeLoans = await Loan.countDocuments({
        username: normalizedUsername,
        status: "Préstamo",
        returned: false,
        isHistoryOnly: { $ne: true },
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
        username: normalizedUsername,
        bookId: book.bookId,
        bookTitle: book.title,
        date: new Date(),
        returned: false,
        status: "Préstamo",
      });

      await loan.save();
      await createHistoryEntry({
        username: normalizedUsername,
        bookId: book.bookId,
        bookTitle: book.title,
        status: "Préstamo",
        returned: false,
      });

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
      const normalizedUsername = (username || "").toLowerCase();

      if (!normalizedUsername) {
        return res.status(400).json({ message: "Usuario no proporcionado" });
      }

      // Buscar préstamo activo
      const loan = await Loan.findOne({
        bookId,
        username: normalizedUsername,
        status: "Préstamo",
        returned: false,
        isHistoryOnly: { $ne: true },
      }).sort({ date: -1 });

      if (!loan) {
        return res.status(400).json({
          message: "No tienes un préstamo activo de este libro",
        });
      }

      // Marcar como devuelto
      loan.returned = true;
      loan.returnDate = new Date();
      await loan.save();

      // Actualizar disponibilidad del libro
      const book = await Book.findOne({ bookId });
      if (book) {
        book.availableCopies += 1;
        book.isAvailable = true;
        await book.save();
      }

      await createHistoryEntry({
        username: normalizedUsername,
        bookId: loan.bookId,
        bookTitle: loan.bookTitle,
        status: "Devolución",
        returned: true,
        returnDate: new Date(),
      });

      res.json({ message: "Libro devuelto" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getUserLoans: async (req, res) => {
    try {
      const { username } = req.params;
      const normalizedUsername = (username || "").toLowerCase();

      // Obtener préstamos activos (no devueltos)
      const userLoans = await Loan.find({
        username: normalizedUsername,
        status: "Préstamo",
        returned: false,
        isHistoryOnly: { $ne: true },
      }).sort({ date: -1 });

      res.json(userLoans);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getUserLoanHistory: async (req, res) => {
    try {
      const { username } = req.params;
      const normalizedUsername = (username || "").toLowerCase();

      // Obtener historial completo del usuario
      const userHistory = await Loan.find({ username: normalizedUsername }).sort({
        date: -1,
      });

      res.json(userHistory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  logHistory: async (req, res) => {
    try {
      const { bookId, bookTitle, username, status } = req.body;
      await createHistoryEntry({
        username,
        bookId: bookId || "",
        bookTitle: bookTitle || "N/A",
        status: status || "Acción",
        returned: status === "Devolución",
        returnDate: status === "Devolución" ? new Date() : null,
      });
      res.status(201).json({ message: "Registro agregado al historial" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = bookController;
