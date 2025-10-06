const Post = require('../models/Post');
const Comment = require('../models/Comment');

exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const tag = req.query.tag;

    const query = { status: 'published' };
    if (tag) query.tags = tag;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username name avatar')
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
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await Post.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.slug }]
    })
      .populate('author', 'username name avatar bio')
      .populate('comments');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.viewCount = (post.viewCount || 0) + 1;
    await post.save();

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPost = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can create posts' });
    }

    const postData = { ...req.body, author: req.user._id };
    if (req.file && req.file.path) {
      postData.thumbnail = req.file.path;
    }

    const post = await Post.create(postData);
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
    if (req.file && req.file.path) {
      updateData.thumbnail = req.file.path;
    }

    const post = await Post.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
};
