const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
require("dotenv").config();
const connectDB = require("./config/mongodb");

// Conectar a MongoDB
connectDB();

app.use(express.json());

// Servir archivos estáticos desde public
app.use(express.static(path.join(__dirname, "../public")));

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

// Ruta para servir login.html explícitamente
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

// Para todas las demás rutas, servir index.html (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor en http://localhost:${PORT}`));
