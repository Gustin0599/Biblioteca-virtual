const mongoose = require("mongoose");

let isConnected = false;

function getMongoUriFromEnv() {
  const raw =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    "";

  return String(raw)
    .trim()
    .replace(/^"(.*)"$/, "$1");
}

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log("Ya conectado a MongoDB");
    return;
  }

  try {
    const mongoURI = getMongoUriFromEnv();

    if (!mongoURI) {
      throw new Error(
        "No hay URI de MongoDB en variables de entorno (MONGODB_URI/MONGO_URI/DATABASE_URL)",
      );
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("Conectado a MongoDB");
  } catch (error) {
    console.error("Error al conectar MongoDB:", error.message);
    isConnected = false;
    throw error;
  }
};

module.exports = connectDB;
