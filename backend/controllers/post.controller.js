const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { invalidateSource, prewarmTranslations } = require('../services/aiTranslate');
// L3: 列表接口只接受声明的查询参数(page/limit/tag),未知参数(?status=draft 等)一律丢弃,
// 避免枚举探测出隐藏行为 — 接口对参数白名单的态度是:不声明的就不生效。
function pickQuery(req, allowed) {
  const out = {};
  for (const k of allowed) {
    if (req.query[k] !== undefined) out[k] = req.query[k];
  }
  return out;
}

exports.getPosts = async (req, res) => {
  try {
    const q = pickQuery(req, ['page', 'limit', 'tag']);
    const page = parseInt(q.page, 10) || 1;
    const limit = parseInt(q.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const tag = q.tag;

    const query = { status: 'published' };
    if (tag) query.tags = tag;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username name avatar role')
        .skip(skip)
        .limit(limit)
        .sort({ publishedAt: -1 }),
      Post.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
      data: posts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.getPost = async (req, res) => {
  try {
    // 无效 ID 直接 400,避免 CastError 500(也不会向客户端泄露 Mongoose 模型名)
    const idCond = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : null;
    const query = idCond ? { $or: [idCond, { slug: req.params.slug }] } : { slug: req.params.slug };
    const post = await Post.findOne(query)
      .populate('author', 'username name avatar bio role')
      .populate('comments');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.viewCount = (post.viewCount || 0) + 1;
    await post.save();

    // H2: 详情接口对非管理员隐藏审核内部信息,避免泄露审核模型/理由/重试次数
    const isAdmin = req.user?.role === 'admin';
    if (post.comments && post.comments.length) {
      post.comments = post.comments
        .filter((c) => isAdmin || c.moderationStatus === 'approved') // 被拒/待审评论仅管理员可见
        .map((c) => {
          const plain = c.toObject ? c.toObject() : c;
          if (!isAdmin) {
            delete plain.moderationModel;
            delete plain.moderationReason;
            delete plain.moderationRetries;
          }
          return plain;
        });
    }

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: '无效的内容 ID' });
    }
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.createPost = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can create posts' });
    }

    const postData = { ...req.body, author: req.user._id };
    // 兼容 single('thumbnail') 与 fields([{name:'thumbnail', maxCount:1},...]) 两种用法
    const thumbFile = req.file || (req.files && req.files.thumbnail && req.files.thumbnail[0]);
    if (thumbFile && thumbFile.path) {
      postData.thumbnail = thumbFile.path;
    } else if (typeof req.body.thumbnail === 'string' && req.body.thumbnail.startsWith('uploads/')) {
      // 兼容 multipart 模式下 req.body.thumbnail 已经被 multer 解析成字符串字段
      postData.thumbnail = req.body.thumbnail;
    }
    // 配图(可选):若前端传了 images 数组(URL 字符串列表)直接保存;若同时通过 multipart 上传,合并
    const bodyImages = Array.isArray(req.body.images) ? req.body.images : [];
    if (req.galleryPaths && req.galleryPaths.length) {
      postData.images = [...bodyImages, ...req.galleryPaths.map((p) => `/${p}`)];
    } else if (bodyImages.length) {
      postData.images = bodyImages;
    }

    const post = await Post.create(postData);
    // 发布后异步预热译文(只预热与原文不同的另一种语言,原文已是目标语言则 needed:false)
    prewarmTranslations({ sourceType: 'post', sourceId: post._id }, { title: post.title, body: post.content || '' }).catch(() => {});
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating post', error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can update posts' });
    }

    const updateData = { ...req.body };
    const thumbFile = req.file || (req.files && req.files.thumbnail && req.files.thumbnail[0]);
    if (thumbFile && thumbFile.path) {
      updateData.thumbnail = thumbFile.path;
    } else if (typeof req.body.thumbnail === 'string' && req.body.thumbnail.startsWith('uploads/')) {
      updateData.thumbnail = req.body.thumbnail;
    }
    // 配图:前端把当前完整 images 数组传过来(可能包含新上传的 url);若同时有 multipart 上传,合并到末尾
    const bodyImages = Array.isArray(req.body.images) ? req.body.images : undefined;
    if (req.galleryPaths && req.galleryPaths.length) {
      updateData.images = [...(bodyImages || []), ...req.galleryPaths.map((p) => `/${p}`)];
    } else if (bodyImages !== undefined) {
      updateData.images = bodyImages;
    }

    const post = await Post.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });

    }

    // 内容已变更,失效旧译文缓存 + 异步预热新译文
    await invalidateSource('post', post._id);
    prewarmTranslations({ sourceType: 'post', sourceId: post._id }, { title: post.title, body: post.content || '' }).catch(() => {});
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating post', error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can delete posts' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    await post.deleteOne();
    await Comment.deleteMany({ post: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const userId = req.user._id.toString();
    const idx = post.likes.findIndex((l) => l.toString() === userId);
    if (idx >= 0) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();

    res.status(200).json({
      success: true,
      liked: idx < 0,
      count: post.likes.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};
