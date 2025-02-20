const express = require("express");
const router = express.Router();
const {
  register,
  login,
  authenticateToken,
  getUserById,
  getUserOrders,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/user/:id", authenticateToken, getUserById);
router.get("/user/:id/orders", authenticateToken, getUserOrders);

module.exports = router;
