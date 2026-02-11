const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  bookId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  isbn: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    default: "Sin categoría",
  },
  quantity: {
    type: Number,
    default: 1,
  },
  availableCopies: {
    type: Number,
    default: 1,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    default: "",
  },
  coverImage: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Book", bookSchema);
