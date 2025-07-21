// server/models/bookModel.js

/**
 * @class Book
 * @description Represents a book in the library.
 */
class Book {
  /**
   * @constructor
   * @param {string} bookId - Unique identifier for the book.
   * @param {string} title - The title of the book.
   * @param {string} author - The author of the book.
   * @param {string} isbn - The ISBN of the book.
   * @param {number} quantity - The number of available copies.
   * @param {boolean} isAvailable - Indicates if the book is currently available for loan.
   */
  constructor(bookId, title, author, isbn, quantity, isAvailable = true) {
    this.bookId = bookId;
    this.title = title;
    this.author = author;
    this.isbn = isbn;
    this.quantity = quantity;
    this.availableCopies = quantity; // Inicialmente, todas las copias están disponibles
    this.isAvailable = isAvailable;
  }

  /**
   * Decrements the number of available copies.
   * @returns {boolean} True if the loan was successful, false otherwise.
   */
  loanBook() {
    if (this.availableCopies > 0) {
      this.availableCopies--;
      this.isAvailable = this.availableCopies > 0;
      return true;
    }
    return false;
  }

  /**
   * Increments the number of available copies.
   * @returns {void}
   */
  returnBook() {
    if (this.availableCopies < this.quantity) {
      this.availableCopies++;
      this.isAvailable = true;
    }
  }
}

/**
 * @typedef {Object} BookData
 * @property {string} bookId
 * @property {string} title
 * @property {string} author
 * @property {string} isbn
 * @property {number} quantity
 * @property {number} availableCopies
 * @property {boolean} isAvailable
 */

module.exports = Book;
