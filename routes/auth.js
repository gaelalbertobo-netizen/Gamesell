const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');

router.post('/registro', [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email no válido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
], async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

  const { nombre, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.execute(
      'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
      [nombre, email, hash]
    );
    res.json({ mensaje: '¡Registro exitoso! Ya puedes iniciar sesión.' });
  } catch (err) {
    console.log('ERROR DETALLADO:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese email ya está registrado.' });
    res.status(500).json({ error: 'Error del servidor.' });
  }
});

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

  const { email, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const usuario = rows[0];
    const esCorrecta = await bcrypt.compare(password, usuario.password);
    if (!esCorrecta) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, nombre: usuario.nombre });
  } catch (err) {
    console.log('ERROR DETALLADO:', err);
    res.status(500).json({ error: 'Error del servidor.' });
  }
});

module.exports = router;