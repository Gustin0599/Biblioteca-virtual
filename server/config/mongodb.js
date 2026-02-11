const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  // Si ya está conectado, retornar
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log("📌 Ya conectado a MongoDB");
    return;
  }

  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/biblioteca_virtual";

    if (!mongoURI) {
      throw new Error("MONGODB_URI no está definido en variables de entorno");
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("✅ Conectado a MongoDB");
  } catch (error) {
    console.error("❌ Error al conectar MongoDB:", error.message);
    isConnected = false;
    throw error;
  }
};

module.exports = connectDB;
