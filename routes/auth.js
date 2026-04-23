const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');

pool.query(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('Error creando tabla:', err));

router.post('/registro', [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email no valido'),
  body('password').isLength({ min: 6 }).withMessage('Minimo 6 caracteres'),
], async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
  const { nombre, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
      [nombre, email, hash]
    );
    res.json({ mensaje: 'Registro exitoso! Ya puedes iniciar sesion.' });
  } catch (err) {
    console.error('ERROR:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'Ese email ya esta registrado.' });
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
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Email o contrasena incorrectos.' });
    const usuario = result.rows[0];
    const esCorrecta = await bcrypt.compare(password, usuario.password);
    if (!esCorrecta) return res.status(401).json({ error: 'Email o contrasena incorrectos.' });
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, nombre: usuario.nombre });
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).json({ error: 'Error del servidor.' });
  }
});

module.exports = router;