const path = require("path");
const fs = require("fs");
require("dotenv").config();
const connectDB = require("../server/config/mongodb");
const User = require("../server/models/User");
const Book = require("../server/models/Book");
const Loan = require("../server/models/Loan");

async function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
  const loansPath = path.join(__dirname, "../server/data/loans.json");
  const loans = await readJson(loansPath).catch(() => []);
}

async function main() {
  await connectDB();

  const usersPath = path.join(__dirname, "../server/data/users.json");
  const booksPath = path.join(__dirname, "../server/data/books.json");

  const users = await readJson(usersPath).catch(() => []);
  const books = await readJson(booksPath).catch(() => []);

  const args = process.argv.slice(2);
  const adminPassArg = args.find((a) => a.startsWith("--admin-pass="));
  const adminPass = adminPassArg ? adminPassArg.split("=")[1] : null;

  try {
    // Insert books if collection empty
    const booksCount = await Book.countDocuments();
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
      console.log(`✅ Insertados ${books.length} libros`);
    } else {
      console.log(
        "ℹ️ Colección de libros ya contiene datos, no se insertaron libros",
      );
    }

    // Insert users if collection empty (use raw insert for already-hashed passwords)
    const usersCount = await User.countDocuments();
    if (usersCount === 0 && users.length > 0) {
      // Normalize usernames/emails to lowercase
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

      // Use collection.insertMany to avoid Mongoose pre-save hashing (passwords in JSON may already be hashed)
      await User.collection.insertMany(usersToInsert);
      console.log(
        `✅ Insertados ${usersToInsert.length} usuarios (hash insert)`,
      );
    } else {
      console.log(
        "ℹ️ Colección de usuarios ya contiene datos, no se insertaron usuarios",
      );
    }

    // Insert loans if collection empty
    const loansCount = await Loan.countDocuments();
    if (loansCount === 0 && loans.length > 0) {
      // Normalize and insert
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
        `✅ Insertados ${loansToInsert.length} registros de historial`,
      );
    } else {
      console.log(
        "ℹ️ Colección de historial ya contiene datos, no se insertaron logs",
      );
    }

    // If adminPass provided, create or update admin user with that plaintext password
    if (adminPass) {
      const adminUsername = "admin";
      let admin = await User.findOne({ username: adminUsername });
      if (!admin) {
        admin = new User({
          username: adminUsername,
          password: adminPass,
          name: "Administrador",
          lastName: "Principal",
          email: `admin@local`,
          role: "admin",
          blocked: false,
        });
        await admin.save();
        console.log(`✅ Admin creado: ${adminUsername} / ${adminPass}`);
      } else {
        admin.password = adminPass;
        await admin.save();
        console.log(
          `✅ Password del admin actualizado: ${adminUsername} / ${adminPass}`,
        );
      }
    }

    console.log("\n🎉 Seed finalizado");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error en seed:", err);
    process.exit(1);
  }
}

main();
