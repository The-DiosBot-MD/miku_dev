const express = require('express');
const { getCurrentUser, getUserProfile, updateCurrentUser } = require('./user.controller');
const authMiddleware = require('../../core/middleware/auth.middleware');
const router = express.Router();

router.get('/me', authMiddleware, getCurrentUser);
router.patch('/me', authMiddleware, updateCurrentUser);

router.get('/:username', getUserProfile);

module.exports = router;