const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  bookId: {
    type: String,
    default: "",
  },
  bookTitle: {
    type: String,
    required: true,
  },
  // status: 'Préstamo' | 'Devolución' | 'Edición' | 'Eliminación' | etc.
  status: {
    type: String,
    default: "Préstamo",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  returned: {
    type: Boolean,
    default: false,
  },
  returnDate: {
    type: Date,
    default: null,
  },
  isHistoryOnly: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Loan", loanSchema);
