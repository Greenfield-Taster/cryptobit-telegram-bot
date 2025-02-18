const express = require("express");
const router = express.Router();
const {
  register,
  login,
  authenticateToken,
  getUserById,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/user/:id", authenticateToken, getUserById);

module.exports = router;
