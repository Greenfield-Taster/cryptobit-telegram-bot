const express = require("express");
const router = express.Router();
const promoCodeController = require("../controllers/promoCodeController");
const { authenticateToken } = require("../controllers/authController");

router.post(
  "/validate",
  authenticateToken,
  promoCodeController.validatePromoCode
);
router.get("/user", authenticateToken, promoCodeController.getUserPromoCodes);

module.exports = router;
