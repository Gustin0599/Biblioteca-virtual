const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();
const connectDB = require("./config/mongodb");
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

      if (booksCount === 0 && fs.existsSync(booksPath)) {
        const books = JSON.parse(fs.readFileSync(booksPath, "utf8"));
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

      if (usersCount === 0 && fs.existsSync(usersPath)) {
        const users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
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
      if (loansCount === 0 && fs.existsSync(loansPath)) {
        const loans = JSON.parse(fs.readFileSync(loansPath, "utf8"));
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

// Inicializar servidor
async function startServer() {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await connectDB();
    console.log("✅ Conectado a MongoDB");

    await autoSeed();
    console.log("✅ Base de datos lista");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () =>
      console.log(`✅ Servidor en http://localhost:${PORT}`),
    );
  } catch (err) {
    console.error("❌ Error al iniciar servidor:", err.message);
    process.exit(1);
  }
}

app.use(express.json());

// Configurar multer para guardar imágenes
const uploadsDir = path.join(__dirname, "../public/uploads");
if (!require("fs").existsSync(uploadsDir)) {
  require("fs").mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({ storage: storage });
app.use("/uploads", express.static(uploadsDir));

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

// Conectar y arrancar
startServer();
