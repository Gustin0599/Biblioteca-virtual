const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const connectDB = require("./config/mongodb");
const seedData = require("./config/seedData");
const Book = require("./models/Book");
const User = require("./models/User");
const Loan = require("./models/Loan");

async function autoSeed() {
  try {
    const booksCount = await Book.countDocuments();
    const usersCount = await User.countDocuments();

    if (booksCount === 0 || usersCount === 0) {
      const booksPath = path.join(__dirname, "./data/books.json");
      const usersPath = path.join(__dirname, "./data/users.json");
      const loansPath = path.join(__dirname, "./data/loans.json");

      let books = [];
      let users = [];
      let loans = [];

      books = fs.existsSync(booksPath)
        ? JSON.parse(fs.readFileSync(booksPath, "utf8"))
        : seedData.books;
      users = fs.existsSync(usersPath)
        ? JSON.parse(fs.readFileSync(usersPath, "utf8"))
        : seedData.users;
      loans = fs.existsSync(loansPath)
        ? JSON.parse(fs.readFileSync(loansPath, "utf8"))
        : [];

      if (booksCount === 0 && books.length > 0) {
        await Book.insertMany(
          books.map((b) => ({
            bookId: b.bookId,
            title: b.title,
            author: b.author,
            isbn: b.isbn || "",
            quantity: b.quantity || 1,
            availableCopies: b.availableCopies || b.quantity || 1,
            isAvailable: typeof b.isAvailable === "boolean" ? b.isAvailable : true,
            description: b.description || "",
            coverImage: b.coverImage || "",
            category: b.category || "Sin categoria",
          })),
        );
      }

      if (usersCount === 0 && users.length > 0) {
        const usersToInsert = users.map((u) => ({
          username: (u.username || "").toLowerCase(),
          password: u.password || "",
          name: u.name || u.firstName || "",
          lastName: u.lastName || u.last_name || "",
          email: (u.email || "").toLowerCase(),
          phone: u.phone || "",
          role: u.role || "user",
          blocked: !!u.blocked,
        }));
        await User.collection.insertMany(usersToInsert);
      }

      const loansCount = await Loan.countDocuments();
      if (loansCount === 0 && loans.length > 0) {
        const loansToInsert = loans.map((l) => ({
          username: (l.username || "").toLowerCase(),
          bookId: l.bookId || "",
          bookTitle: l.bookTitle || "",
          date: l.date ? new Date(l.date) : new Date(),
          status: l.status || (l.returned ? "Devolucion" : "Prestamo"),
          returned: l.status === "Devolucion" || !!l.returned,
          returnDate: l.returnDate ? new Date(l.returnDate) : null,
          isHistoryOnly: true,
        }));
        await Loan.insertMany(loansToInsert);
      }
    }
  } catch (err) {
    console.error("Error en auto-seed:", err.message);
    throw err;
  }
}

let initPromise = null;
let isInitialized = false;
let lastInitError = null;

async function initServer() {
  if (isInitialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      lastInitError = null;
      await connectDB();

      try {
        await autoSeed();
      } catch (seedErr) {
        console.warn("Error en auto-seed (continuando):", seedErr.message);
      }

      isInitialized = true;
    })().catch((err) => {
      initPromise = null;
      isInitialized = false;
      lastInitError = err;
      throw err;
    });
  }

  return initPromise;
}

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    dbInitialized: isInitialized,
    dbError: lastInitError ? lastInitError.message : null,
    timestamp: new Date(),
  });
});

app.use(async (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }
  try {
    await initServer();
    next();
  } catch (err) {
    return res.status(503).json({
      message: "Servicio temporalmente no disponible (DB no conectada)",
      detail: err.message,
    });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Solo se permiten archivos de imagen"));
  },
});

const bookRoutes = require("./routes/bookRoutes");
const authController = require("./api/authController");

app.use("/api/books", upload.fields([{ name: "coverImage" }]), bookRoutes);

app.post("/api/login", authController.login);
app.post("/api/change-password", authController.changePassword);
app.post("/api/register", authController.register);
app.get("/api/users", authController.getUsers);
app.put("/api/users/:username", authController.updateUser);
app.post("/api/users/:username/block", authController.blockUser);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  initServer()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Servidor en puerto ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("No se pudo iniciar el servidor:", err.message);
      process.exit(1);
    });
}
