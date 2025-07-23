const Post = require('../models/Post');
const Comment = require('../models/Comment');

// 获取所有文章
 exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const tag = req.query.tag;
    const author = req.query.author;

    // 构建查询条件
    const query = { status: 'published' };
    if (tag) query.tags = tag;
    if (author) query.author = author;

    // 执行查询
    const posts = await Post.find(query)
      .populate('author', 'username name avatar')
      .skip(skip)
      .limit(limit)
      .sort({ publishedAt: -1 });

    // 获取总数
    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取单篇文章
 exports.getPost = async (req, res) => {
  try {
    const post = await Post.findOne({
      $or: [
        { _id: req.params.id },
        { slug: req.params.slug }
      ]
    })
      .populate('author', 'username name avatar bio')
      .populate('comments');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // 更新阅读计数
    post.viewCount = (post.viewCount || 0) + 1;
    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 创建文章
 exports.createPost = async (req, res) => {
  try {
    const postData = {
      ...req.body,
      author: req.user.id
    };
    
    // 处理缩略图上传
    if (req.file && req.file.path) {
      postData.thumbnail = req.file.path;
    }

    const post = await Post.create(postData);
    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
};

// 更新文章
 exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // 检查权限
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const updateData = { ...req.body };
    
    // 处理缩略图更新
    if (req.file && req.file.path) {
      updateData.thumbnail = req.file.path;
    }

    post = await Post.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating post',
      error: error.message
    });
  }
};

// 删除文章
 exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // 检查权限
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 点赞文章
 exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // 检查用户是否已经点赞
    const alreadyLiked = post.likes.some(
      like => like.toString() === req.user.id
    );

    if (alreadyLiked) {
      // 取消点赞
      post.likes = post.likes.filter(
        like => like.toString() !== req.user.id
      );
    } else {
      // 添加点赞
      post.likes.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      likes: post.likes.length,
      data: post.likes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取用户文章
 exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
