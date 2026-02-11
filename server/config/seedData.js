// Datos de seed para producción (cuando no hay archivos JSON)
module.exports = {
  users: [
    {
      username: "admin",
      password: "$2b$10$JR1pGjs.OjfFX6p66Dr/FuLnlvpHIGWgjlqOwyEFmrlwklUDfZ7C.",
      role: "admin",
      name: "Administrador",
      lastName: "Principal",
      email: "admin@biblioteca.com",
      phone: "",
      blocked: false,
    },
    {
      username: "usuario1",
      password: "$2b$10$iALobDDKQihHqIoaz.dD8OtoFsabzjtfxWPaUi7fUzHG.AThEL6RS",
      role: "user",
      name: "Juan",
      lastName: "Pérez",
      email: "juanpe@gmail.com",
      phone: "3117330741",
      blocked: false,
    },
    {
      username: "viviana",
      password: "$2b$10$2Sxg1O9M7LRChlyZDneC7u1QsoXYtLjQc4FfJeRZseuAkr.0BQEPO",
      role: "user",
      name: "Viviana",
      lastName: "Tumiña",
      email: "vivianatu@gmail.com",
      phone: "3215655787",
      blocked: false,
    },
    {
      username: "gunter",
      password: "$2b$10$Ncd0k47kBdBlpSz5C9d5F.ZBc5XeFXGKwI4D7AzLrQrOGPHBVtZQS",
      role: "user",
      name: "Gunter",
      lastName: "Gravini",
      email: "guntergra@gmail.com",
      phone: "3145268795",
      blocked: false,
    },
  ],
  books: [
    {
      bookId: "B001",
      title: "Cien Años de Soledad",
      author: "Gabriel García Márquez",
      isbn: "978-0307474728",
      quantity: 13,
      availableCopies: 12,
      isAvailable: true,
      description:
        "Una novela épica que relata la historia de siete generaciones de la familia Buendía.",
      coverImage:
        "https://images-na.ssl-images-amazon.com/images/P/0307474720.01.L.jpg",
      category: "Ficción",
    },
    {
      bookId: "B002",
      title: "El Principito",
      author: "Antoine de Saint-Exupéry",
      isbn: "978-0156013987",
      quantity: 18,
      availableCopies: 18,
      isAvailable: true,
      description:
        "Un cuento poético sobre un joven príncipe que viaja por diferentes planetas.",
      coverImage:
        "https://images-na.ssl-images-amazon.com/images/P/0156013983.01.L.jpg",
      category: "Infantil",
    },
    {
      bookId: "B003",
      title: "1984",
      author: "George Orwell",
      isbn: "978-0451524935",
      quantity: 8,
      availableCopies: 6,
      isAvailable: true,
      description: "Una novela distópica sobre un futuro totalitario.",
      coverImage:
        "https://images-na.ssl-images-amazon.com/images/P/0451524934.01.L.jpg",
      category: "Ficción",
    },
  ],
};
