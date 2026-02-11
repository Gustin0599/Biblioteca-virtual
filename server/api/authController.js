// server/api/authController.js - Versión MongoDB
const User = require("../models/User");

const authController = {
  login: async (req, res) => {
    const { username, password } = req.body;

    // Validaciones de entrada
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Usuario y contraseña son requeridos" });
    }

    if (username.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Usuario debe tener al menos 3 caracteres" });
    }

    if (password.length < 4) {
      return res
        .status(400)
        .json({ message: "Contraseña debe tener al menos 4 caracteres" });
    }

    try {
      const user = await User.findOne({ username: username.toLowerCase() });

      if (!user) {
        return res
          .status(401)
          .json({ message: "Usuario o contraseña incorrectos" });
      }

      if (user.blocked) {
        return res
          .status(403)
          .json({ message: "Cuenta bloqueada. Contacta al administrador." });
      }

      // Comparar contraseña
      const passwordMatch = await user.comparePassword(password);

      if (passwordMatch) {
        // No enviar password al frontend
        const userObj = user.toObject();
        delete userObj.password;
        res.status(200).json({
          message: "Login exitoso",
          user: userObj,
        });
      } else {
        res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }
    } catch (error) {
      console.error("Error de autenticación:", error);
      res
        .status(500)
        .json({ message: "Error en el servidor de autenticación" });
    }
  },

  changePassword: async (req, res) => {
    const { username, currentPassword, newPassword, confirmPassword } =
      req.body;

    // Validaciones
    if (!username || !currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos" });
    }

    if (newPassword.length < 4) {
      return res
        .status(400)
        .json({ message: "Nueva contraseña debe tener al menos 4 caracteres" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "La nueva contraseña debe ser diferente a la actual",
      });
    }

    try {
      const user = await User.findOne({ username: username.toLowerCase() });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Verificar contraseña actual
      const passwordMatch = await user.comparePassword(currentPassword);

      if (!passwordMatch) {
        return res
          .status(401)
          .json({ message: "Contraseña actual incorrecta" });
      }

      // Actualizar contraseña (se hasheará automáticamente antes de guardar)
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        message: "Contraseña actualizada correctamente",
      });
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      res.status(500).json({ message: "Error al cambiar contraseña" });
    }
  },

  register: async (req, res) => {
    const {
      username,
      password,
      confirmPassword,
      firstName,
      lastName,
      phone,
      email,
    } = req.body;

    if (
      !username ||
      !password ||
      !confirmPassword ||
      !firstName ||
      !lastName ||
      !email
    ) {
      return res.status(400).json({
        message: "Todos los campos son requeridos (excepto teléfono).",
      });
    }

    if (username.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Usuario debe tener al menos 3 caracteres" });
    }

    if (password.length < 4) {
      return res
        .status(400)
        .json({ message: "Contraseña debe tener al menos 4 caracteres" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    // simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    try {
      const existingUser = await User.findOne({
        $or: [
          { username: username.toLowerCase() },
          { email: email.toLowerCase() },
        ],
      });

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "El nombre de usuario o email ya existe" });
      }

      const newUser = new User({
        username: username.toLowerCase(),
        password,
        name: firstName,
        lastName,
        phone: phone || "",
        email: email.toLowerCase(),
        role: "user",
        blocked: false,
      });

      await newUser.save();

      const userObj = newUser.toObject();
      delete userObj.password;

      res.status(201).json({
        message: "Registro exitoso",
        user: userObj,
      });
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await User.find({}, { password: 0 });
      res.json(users);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ message: error.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { username } = req.params;
      const { name, lastName, phone, email, role } = req.body;

      const user = await User.findOne({ username: username.toLowerCase() });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      if (name !== undefined) user.name = name;
      if (lastName !== undefined) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (email !== undefined) user.email = email;
      if (role !== undefined) user.role = role;

      await user.save();

      const userObj = user.toObject();
      delete userObj.password;

      res.json({ message: "Usuario actualizado", user: userObj });
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      res.status(500).json({ message: error.message });
    }
  },

  blockUser: async (req, res) => {
    try {
      const { username } = req.params;
      const { block } = req.body;

      const user = await User.findOne({ username: username.toLowerCase() });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      user.blocked = !!block;
      await user.save();

      res.json({
        message: `Usuario ${block ? "bloqueado" : "desbloqueado"}`,
      });
    } catch (error) {
      console.error("Error al bloquear usuario:", error);
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = authController;
