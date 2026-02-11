const { Pool } = require("pg");

// Configuración de la conexión
const pool = new Pool({
  user: "postgres", // Tu usuario de pgAdmin
  host: "localhost", // Servidor local
  database: "biblioteca", // El nombre que le dimos en pgAdmin
  password: "1234", // La contraseña que elegiste al instalar
  port: 5432, // Puerto por defecto de Postgres
});

// Verificación de conexión
pool.on("connect", () => {
  console.log("✅ Conexión exitosa a PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Error inesperado en el cliente de Postgres", err);
});

module.exports = pool;
