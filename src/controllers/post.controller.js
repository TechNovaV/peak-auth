const mongoose = require("mongoose");
const Post = require("../models/Post");
const { httpError } = require("../utils/validators");

// Lean object + thêm likeCount, likedByMe để frontend không phải tính
const formatPost = (post, currentUserId) => {
  const obj = post.toObject ? post.toObject() : post;
  const likes = obj.likes || [];
  return {
    ...obj,
    likeCount: likes.length,
    likedByMe: currentUserId
      ? likes.some((id) => id.toString() === currentUserId)
      : false,
  };
};

exports.createPost = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== "string" || !content.trim())
      throw httpError(400, "Nội dung không được rỗng");

    if (content.length > 1000)
      throw httpError(400, "Nội dung không quá 1000 ký tự");

    const post = await Post.create({
      author: req.user.sub,
      content: content.trim(),
    });

    // Populate author để response có thông tin user
    await post.populate("author", "username fullName avatarUrl");

    res.status(201).json({
      message: "Đăng bài thành công",
      post: formatPost(post, req.user.sub),
    });
  } catch (err) {
    next(err);
  }
};

exports.listPosts = async (req, res, next) => {
  try {
    // Có thể thêm pagination sau (?page, ?limit). Hiện tạm trả 50 bài mới nhất.
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "username fullName avatarUrl");

    res.json({
      count: posts.length,
      posts: posts.map((p) => formatPost(p, req.user.sub)),
    });
  } catch (err) {
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw httpError(400, "ID không hợp lệ");

    const post = await Post.findById(id);
    if (!post) throw httpError(404, "Không tìm thấy bài viết");

    // Chỉ author hoặc admin được xóa
    const isAuthor = post.author.toString() === req.user.sub;
    const isAdmin = req.user.role === "admin";
    if (!isAuthor && !isAdmin)
      throw httpError(403, "Bạn không có quyền xóa bài này");

    await post.deleteOne();
    res.json({ message: "Đã xóa bài viết" });
  } catch (err) {
    next(err);
  }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw httpError(400, "ID không hợp lệ");

    const post = await Post.findById(id);
    if (!post) throw httpError(404, "Không tìm thấy bài viết");

    const userId = req.user.sub;
    const idx = post.likes.findIndex((u) => u.toString() === userId);

    let liked;
    if (idx === -1) {
      // Chưa like → thêm
      post.likes.push(userId);
      liked = true;
    } else {
      // Đã like → bỏ like (toggle)
      post.likes.splice(idx, 1);
      liked = false;
    }

    await post.save();
    res.json({ liked, likeCount: post.likes.length });
  } catch (err) {
    next(err);
  }
};
