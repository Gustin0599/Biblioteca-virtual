// server/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const bookRoutes = require('./routes/bookRoutes');

/**
 * @constant {number} PORT - The port number for the server.
 */
const PORT = process.env.PORT || 3000;

/**
 * @constant {express.Application} app - The Express application instance.
 */
const app = express();

// Middlewares
app.use(cors()); // Habilita CORS para permitir solicitudes desde el frontend
app.use(express.json()); // Permite a Express parsear cuerpos de solicitud JSON

// Sirve archivos estáticos desde la carpeta 'public'
// Esto permite que el navegador acceda a index.html, style.css y app.js
app.use(express.static(path.join(__dirname, '../public')));

// Prefijo para todas las rutas de la API de libros
app.use('/api', bookRoutes);

// Ruta raíz para servir el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Frontend accessible at http://localhost:${PORT}`);
    console.log(`API accessible at http://localhost:${PORT}/api/books`);
});