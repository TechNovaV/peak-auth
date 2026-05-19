const router = require("express").Router();
const postController = require("../controllers/post.controller");
const { verifyToken } = require("../middlewares/auth");

// Mọi route đều yêu cầu đã login
router.use(verifyToken);

/**
 * @openapi
 * /api/posts:
 *   get:
 *     tags: [Posts]
 *     summary: Lấy feed (50 bài mới nhất)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bài viết
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       content: { type: string }
 *                       author:
 *                         type: object
 *                         properties:
 *                           _id: { type: string }
 *                           username: { type: string }
 *                           fullName: { type: string }
 *                           avatarUrl: { type: string }
 *                       likes:
 *                         type: array
 *                         items: { type: string }
 *                       likeCount: { type: integer }
 *                       likedByMe: { type: boolean }
 *                       createdAt: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Posts]
 *     summary: Đăng bài mới
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 1000 }
 *     responses:
 *       201: { description: Đăng thành công }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get("/", postController.listPosts);
router.post("/", postController.createPost);

/**
 * @openapi
 * /api/posts/{id}:
 *   delete:
 *     tags: [Posts]
 *     summary: Xóa bài viết (chỉ author hoặc admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Đã xóa }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete("/:id", postController.deletePost);

/**
 * @openapi
 * /api/posts/{id}/like:
 *   post:
 *     tags: [Posts]
 *     summary: Like / unlike bài viết (toggle)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Toggle thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked: { type: boolean }
 *                 likeCount: { type: integer }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post("/:id/like", postController.toggleLike);

module.exports = router;
