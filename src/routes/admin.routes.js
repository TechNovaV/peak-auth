const router = require("express").Router();
const adminController = require("../controllers/admin.controller");
const { verifyToken, requireRole } = require("../middlewares/auth");

// Mọi route bên dưới đều yêu cầu: đã login + role = admin
router.use(verifyToken, requireRole("admin"));

router.get("/users", adminController.listUsers);
router.patch("/users/:id/role", adminController.updateRole);

module.exports = router;
