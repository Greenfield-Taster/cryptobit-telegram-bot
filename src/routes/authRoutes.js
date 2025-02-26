const express = require("express");
const router = express.Router();
const {
  register,
  login,
  authenticateToken,
  getUserById,
  getUserOrders,
  refreshToken,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/user/:id", authenticateToken, getUserById);
router.get("/user/:id/orders", authenticateToken, getUserOrders);
router.post("/refresh-token", refreshToken);

module.exports = router;
