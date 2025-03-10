const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const isAdmin = require("../middleware/isAdmin");
const { authenticateToken } = require("../controllers/authController");

router.use(authenticateToken);
router.use(isAdmin);

router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

router.get("/orders", adminController.getAllExchangeRequests);
router.get("/orders/:id", adminController.getExchangeRequestById);
router.put("/orders/:id/status", adminController.updateExchangeRequestStatus);

router.get("/exchange-statistics", adminController.getExchangeStatistics);

module.exports = router;
