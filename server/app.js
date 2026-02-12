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

// Auto-seed al iniciar si las colecciones están vacías
async function autoSeed() {
  try {
    console.log("⏳ Verificando datos en MongoDB...");

    const booksCount = await Book.countDocuments();
    const usersCount = await User.countDocuments();

    if (booksCount === 0 || usersCount === 0) {
      console.log("📚 Cargando datos iniciales...");

      const booksPath = path.join(__dirname, "./data/books.json");
      const usersPath = path.join(__dirname, "./data/users.json");
      const loansPath = path.join(__dirname, "./data/loans.json");

      let books = [];
      let users = [];
      let loans = [];

      // Intentar cargar de archivos JSON, si no existen usar seedData
      if (fs.existsSync(booksPath)) {
        books = JSON.parse(fs.readFileSync(booksPath, "utf8"));
      } else {
        books = seedData.books;
      }

      if (fs.existsSync(usersPath)) {
        users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
      } else {
        users = seedData.users;
      }

      if (fs.existsSync(loansPath)) {
        loans = JSON.parse(fs.readFileSync(loansPath, "utf8"));
      } else {
        loans = [];
      }

      if (booksCount === 0 && books.length > 0) {
        await Book.insertMany(
          books.map((b) => ({
            bookId: b.bookId,
            title: b.title,
            author: b.author,
            isbn: b.isbn || "",
            quantity: b.quantity || 1,
            availableCopies: b.availableCopies || b.quantity || 1,
            isAvailable:
              typeof b.isAvailable === "boolean" ? b.isAvailable : true,
            description: b.description || "",
            coverImage: b.coverImage || "",
            category: b.category || "Sin categoría",
          })),
        );
        console.log(`✅ Cargados ${books.length} libros`);
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
        console.log(`✅ Cargados ${usersToInsert.length} usuarios`);
      }

      const loansCount = await Loan.countDocuments();
      if (loansCount === 0 && loans.length > 0) {
        const loansToInsert = loans.map((l) => ({
          username: (l.username || "").toLowerCase(),
          bookId: l.bookId || null,
          bookTitle: l.bookTitle || "",
          date: l.date ? new Date(l.date) : new Date(),
          status: l.status || (l.returned ? "Devolución" : "Préstamo"),
          returned: l.status === "Devolución" || !!l.returned,
          returnDate: l.returnDate ? new Date(l.returnDate) : null,
        }));
        await Loan.insertMany(loansToInsert);
        console.log(
          `✅ Cargados ${loansToInsert.length} registros de historial`,
        );
      }
    } else {
      console.log(
        `📊 Base de datos lista: ${booksCount} libros, ${usersCount} usuarios`,
      );
    }
  } catch (err) {
    console.error("⚠️ Error en auto-seed:", err.message);
    throw err;
  }
}

let initPromise;

// Inicializa MongoDB una sola vez (útil para entorno serverless en Vercel)
async function initServer() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log("🔌 Conectando a MongoDB...");
        await connectDB();
        console.log("✅ Conectado a MongoDB");

        try {
          await autoSeed();
          console.log("✅ Base de datos lista");
        } catch (seedErr) {
          console.warn(
            "⚠️ Error en auto-seed (continuando sin fallar):",
            seedErr.message,
          );
        }
      } catch (err) {
        console.error("⚠️ Error al inicializar MongoDB:", err.message);
      }
    })();
  }

  return initPromise;
}

app.use(express.json());

// Asegura conexión a MongoDB antes de cada request
app.use(async (req, res, next) => {
  await initServer();
  next();
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

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

const bookRoutes = require("./routes/bookRoutes");
// Importamos el controlador de autenticación
const authController = require("./api/authController");

app.use("/api/books", upload.fields([{ name: "coverImage" }]), bookRoutes);

// Rutas de autenticación
app.post("/api/login", authController.login);
app.post("/api/change-password", authController.changePassword);
// Registro y gestión de usuarios
app.post("/api/register", authController.register);
app.get("/api/users", authController.getUsers);
app.put("/api/users/:username", authController.updateUser);
app.post("/api/users/:username/block", authController.blockUser);

// Export para Vercel (@vercel/node)
module.exports = app;

// Levantar servidor solo en ejecución local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  initServer().finally(() => {
    app.listen(PORT, () => {
      console.log(`✅ Servidor en puerto ${PORT}`);
    });
  });
}
