const express = require('express');
const router = express.Router();
const { login, getUsers, addUser, updateUser, deleteUser } = require('../controllers/authController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.post('/login', login);

// Rutas protegidas para administración de usuarios (Solo Admin)
router.get('/users', verifyToken, verifyRole(['Admin']), getUsers);
router.post('/users', verifyToken, verifyRole(['Admin']), addUser);
router.put('/users/:rowNum', verifyToken, verifyRole(['Admin']), updateUser);
router.delete('/users/:rowNum', verifyToken, verifyRole(['Admin']), deleteUser);

module.exports = router;
