const router = require("express").Router();
const adminController = require("../controllers/admin.controller");
const { verifyToken, requireRole } = require("../middlewares/auth");

// Mọi route bên dưới đều yêu cầu: đã login + role = admin
router.use(verifyToken, requireRole("admin"));

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Liệt kê tất cả user
 *     description: Yêu cầu role admin. Trả danh sách user kèm count, không có password/refreshToken.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer, example: 2 }
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get("/users", adminController.listUsers);

/**
 * @openapi
 * /api/admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Đổi role của user
 *     description: |
 *       Yêu cầu role admin. Đổi role giữa `user` và `admin`.
 *       **Lockout protection**: admin KHÔNG được tự hạ quyền chính mình.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId của user
 *         example: "6a0b3cb3de26ba7b0bb17c50"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Role không hợp lệ, ID sai format, hoặc tự hạ quyền
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch("/users/:id/role", adminController.updateRole);

module.exports = router;
