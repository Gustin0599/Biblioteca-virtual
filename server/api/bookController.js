// server/api/bookController.js
const Book = require("../models/bookModel");

// Simulación de una base de datos en memoria
/**
 * @type {Book[]}
 */
let books = [
  new Book(
    "B001",
    "Cien Años de Soledad",
    "Gabriel García Márquez",
    "978-0307474728",
    5
  ),
  new Book(
    "B002",
    "El Principito",
    "Antoine de Saint-Exupéry",
    "978-0156013926",
    3
  ),
  new Book("B003", "1984", "George Orwell", "978-0451524935", 7),
];

/**
 * @namespace bookController
 * @description Handles all business logic related to books.
 */
const bookController = {
  /**
   * Retrieves all books.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  getAllBooks: (req, res) => {
    // Consulta (Read)
    res.status(200).json(books);
  },

  /**
   * Retrieves a book by its ID.
   * @param {object} req - The request object containing bookId in params.
   * @param {object} res - The response object.
   */
  getBookById: (req, res) => {
    // Consulta (Read)
    const { bookId } = req.params;
    const foundBook = books.find((book) => book.bookId === bookId);
    if (foundBook) {
      res.status(200).json(foundBook);
    } else {
      res.status(404).json({ message: "Book not found" });
    }
  },

  /**
   * Adds a new book to the inventory.
   * @param {object} req - The request object containing book data in body.
   * @param {object} res - The response object.
   */
  addBook: (req, res) => {
    // Inserción (Create)
    const { bookId, title, author, isbn, quantity } = req.body;
    if (!bookId || !title || !author || !isbn || !quantity) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (books.some((book) => book.bookId === bookId)) {
      return res
        .status(409)
        .json({ message: "Book with this ID already exists" });
    }
    const newBook = new Book(bookId, title, author, isbn, quantity);
    books.push(newBook);
    res.status(201).json({ message: "Book added successfully", book: newBook });
  },

  /**
   * Updates an existing book.
   * @param {object} req - The request object containing bookId in params and updated data in body.
   * @param {object} res - The response object.
   */
  updateBook: (req, res) => {
    // Actualización (Update)
    const { bookId } = req.params;
    const { title, author, isbn, quantity } = req.body;
    const bookIndex = books.findIndex((book) => book.bookId === bookId);

    if (bookIndex !== -1) {
      const currentBook = books[bookIndex];
      currentBook.title = title || currentBook.title;
      currentBook.author = author || currentBook.author;
      currentBook.isbn = isbn || currentBook.isbn;

      if (quantity !== undefined && quantity >= 0) {
        // Ajustar availableCopies si la cantidad total cambia
        const quantityDifference = quantity - currentBook.quantity;
        currentBook.quantity = quantity;
        currentBook.availableCopies += quantityDifference;
        if (currentBook.availableCopies < 0) currentBook.availableCopies = 0; // Evitar negativos
        currentBook.isAvailable = currentBook.availableCopies > 0;
      }

      res
        .status(200)
        .json({ message: "Book updated successfully", book: currentBook });
    } else {
      res.status(404).json({ message: "Book not found" });
    }
  },

  /**
   * Deletes a book from the inventory.
   * @param {object} req - The request object containing bookId in params.
   * @param {object} res - The response object.
   */
  deleteBook: (req, res) => {
    // Eliminación (Delete)
    const { bookId } = req.params;
    const initialLength = books.length;
    books = books.filter((book) => book.bookId !== bookId);

    if (books.length < initialLength) {
      res.status(200).json({ message: "Book deleted successfully" });
    } else {
      res.status(404).json({ message: "Book not found" });
    }
  },

  /**
   * Handles the loaning of a book.
   * @param {object} req - The request object containing bookId in params.
   * @param {object} res - The response object.
   */
  loanBook: (req, res) => {
    // Prestar Libro
    const { bookId } = req.params;
    const book = books.find((b) => b.bookId === bookId);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.loanBook()) {
      res.status(200).json({ message: "Book loaned successfully", book });
    } else {
      res.status(400).json({ message: "No copies available for loan" });
    }
  },

  /**
   * Handles the returning of a book.
   * @param {object} req - The request object containing bookId in params.
   * @param {object} res - The response object.
   */
  returnBook: (req, res) => {
    // Devolver Libro
    const { bookId } = req.params;
    const book = books.find((b) => b.bookId === bookId);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    book.returnBook();
    res.status(200).json({ message: "Book returned successfully", book });
  },
};

module.exports = bookController;
