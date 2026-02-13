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

function normalizeUsername(username) {
  return String(username || "sistema").trim().toLowerCase();
}

function parseQuantity(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
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
    username: normalizeUsername(username),
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

async function createHistoryEntrySafe(payload) {
  try {
    await createHistoryEntry(payload);
  } catch (err) {
    console.warn("No se pudo guardar historial:", err.message);
  }
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
      const loans = await Loan.find({ isHistoryOnly: true }).sort({
        date: -1,
        createdAt: -1,
        _id: -1,
      });
      res.json(loans);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addBook: async (req, res) => {
    try {
      const quantity = parseQuantity(req.body.quantity, 1);
      const coverImage = buildCoverImageFromUpload(req);

      const newBook = new Book({
        bookId: String(req.body.bookId || "").trim(),
        title: String(req.body.title || "").trim(),
        author: String(req.body.author || "").trim(),
        isbn: req.body.isbn || "",
        quantity,
        availableCopies: quantity,
        isAvailable: true,
        description: req.body.description || "",
        coverImage,
        category: req.body.category || "Sin categoría",
      });

      await newBook.save();

      await createHistoryEntrySafe({
        username: req.body.username,
        bookId: newBook.bookId,
        bookTitle: newBook.title,
        status: "Creación de Libro",
      });

      res.status(201).json(newBook);
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.bookId) {
        return res.status(409).json({ message: "El ID del libro ya existe" });
      }
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
      const newQuantity = parseQuantity(quantity, book.quantity);
      const difference = newQuantity - oldQuantity;

      if (title) book.title = title;
      if (author) book.author = author;
      if (isbn) book.isbn = isbn;
      if (description) book.description = description;
      if (category) book.category = category;

      book.quantity = newQuantity;
      book.availableCopies = Math.max(0, book.availableCopies + difference);
      book.isAvailable = book.availableCopies > 0;

      const coverImage = buildCoverImageFromUpload(req);
      if (coverImage) {
        book.coverImage = coverImage;
      }

      await book.save();

      await createHistoryEntrySafe({
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

      await createHistoryEntrySafe({
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
      const normalizedUsername = normalizeUsername(req.body.username);
      const MAX_LOANS = 5;

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

      const book = await Book.findOne({ bookId });

      if (!book || !book.isAvailable) {
        return res.status(400).json({ message: "Libro no disponible" });
      }

      const loan = new Loan({
        username: normalizedUsername,
        bookId: book.bookId,
        bookTitle: book.title,
        date: new Date(),
        returned: false,
        status: "Préstamo",
      });

      await loan.save();

      await createHistoryEntrySafe({
        username: normalizedUsername,
        bookId: book.bookId,
        bookTitle: book.title,
        status: "Préstamo",
        returned: false,
      });

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
      const { bookId } = req.params;
      const normalizedUsername = normalizeUsername(req.body.username);

      if (!normalizedUsername) {
        return res.status(400).json({ message: "Usuario no proporcionado" });
      }

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

      loan.returned = true;
      loan.returnDate = new Date();
      await loan.save();

      const book = await Book.findOne({ bookId });
      if (book) {
        book.availableCopies += 1;
        book.isAvailable = true;
        await book.save();
      }

      await createHistoryEntrySafe({
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
      const normalizedUsername = normalizeUsername(req.params.username);

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
      const normalizedUsername = normalizeUsername(req.params.username);

      const userHistory = await Loan.find({
        username: normalizedUsername,
        isHistoryOnly: true,
      }).sort({ date: -1, createdAt: -1, _id: -1 });

      res.json(userHistory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  logHistory: async (req, res) => {
    try {
      const { bookId, bookTitle, username, status } = req.body;

      await createHistoryEntrySafe({
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
