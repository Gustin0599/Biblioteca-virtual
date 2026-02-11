/**
 * Script de migración para hashear contraseñas existentes
 * Ejecutar: node migrate-passwords.js
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

const usersPath = path.join(__dirname, "server/data/users.json");

async function migratePasswords() {
  try {
    console.log("Iniciando migración de contraseñas...");

    const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

    // Hashear todas las contraseñas
    const migratedUsers = await Promise.all(
      usersData.map(async (user) => {
        // Si ya está hasheado (comienza con $2), no hacer nada
        if (user.password && user.password.startsWith("$2")) {
          console.log(`✓ ${user.username} - ya hasheado`);
          return user;
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(user.password, 10);
        console.log(`✓ ${user.username} - contraseña hasheada`);

        return {
          ...user,
          password: hashedPassword,
        };
      }),
    );

    // Guardar usuarios actualizados
    fs.writeFileSync(
      usersPath,
      JSON.stringify(migratedUsers, null, 2),
      "utf-8",
    );

    console.log("\n✅ Migración completada exitosamente");
    console.log(`${migratedUsers.length} usuarios actualizados`);
  } catch (error) {
    console.error("❌ Error en la migración:", error.message);
    process.exit(1);
  }
}

migratePasswords();
