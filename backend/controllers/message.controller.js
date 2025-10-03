const Message = require('../models/Message');
const User = require('../models/User');

// 管理员发送站内信
exports.sendMessage = async (req, res) => {
  try {
    const { title, content, recipients } = req.body;

    // 验证参数
    if (!title || !content || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供标题、内容和至少一个接收者'
      });
    }

    // 存储成功发送的消息和失败的消息
    const sentMessages = [];
    const failedMessages = [];

    // 为每个接收者创建消息
    for (const recipient of recipients) {
      try {
        let recipientIdentifier = recipient.value;
        let recipientType = recipient.type; // user_id, email, username
        
        // 如果是邮箱或用户名，需要查找对应用户ID
        if (recipientType === 'email' || recipientType === 'username') {
          const user = await User.findOne({ [recipientType]: recipientIdentifier });
          if (!user) {
            failedMessages.push({
              recipient: recipientIdentifier,
              reason: `找不到对应的用户`
            });
            continue;
          }
          // 将标识符改为用户ID
          recipientIdentifier = user._id.toString();
          recipientType = 'user_id';
        }
        
        // 创建消息
        const message = await Message.create({
          title,
          content,
          sender: req.user._id, // 管理员ID
          recipient: recipientIdentifier,
          recipientType: 'user_id' // 统一存储为用户ID
        });
        
        sentMessages.push(message);
      } catch (error) {
        failedMessages.push({
          recipient: recipient.value,
          reason: error.message
        });
      }
    }

    // 返回结果
    res.status(201).json({
      success: true,
      message: `成功发送 ${sentMessages.length} 条消息${failedMessages.length > 0 ? `，失败 ${failedMessages.length} 条` : ''}`,
      data: {
        sent: sentMessages,
        failed: failedMessages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 用户获取自己的站内信
exports.getUserMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // 查询条件：接收者是当前用户且未被删除
    const query = {
      $or: [
        { recipient: req.user.id },
        { recipient: req.user.email },
        { recipient: req.user.username }
      ],
      isDeleted: false
    };

    // 执行查询
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // 获取总数
    const total = await Message.countDocuments(query);

    res.status(200).json({
      success: true,
      count: messages.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 用户标记消息为已读
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找消息并确保接收者是当前用户
    const message = await Message.findOne({
      _id: id,
      $or: [
        { recipient: req.user.id },
        { recipient: req.user.email },
        { recipient: req.user.username }
      ]
    });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在或您无权访问'
      });
    }
    
    // 更新为已读
    message.isRead = true;
    message.readAt = Date.now();
    await message.save();
    
    res.status(200).json({
      success: true,
      message: '消息已标记为已读',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 用户删除消息（软删除）
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找消息并确保接收者是当前用户
    const message = await Message.findOne({
      _id: id,
      $or: [
        { recipient: req.user.id },
        { recipient: req.user.email },
        { recipient: req.user.username }
      ]
    });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在或您无权访问'
      });
    }
    
    // 软删除
    message.isDeleted = true;
    await message.save();
    
    res.status(200).json({
      success: true,
      message: '消息已删除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 管理员获取所有消息（用于管理）
exports.getAllMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // 查询所有消息
    const messages = await Message.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recipient', 'username email name'); // 尝试关联用户信息
    
    // 获取总数
    const total = await Message.countDocuments({});
    
    res.status(200).json({
      success: true,
      count: messages.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取用户未读消息数量
exports.getUnreadCount = async (req, res) => {
  try {
    // 查询条件：接收者是当前用户且未读且未被删除
    const query = {
      $or: [
        { recipient: req.user.id },
        { recipient: req.user.email },
        { recipient: req.user.username }
      ],
      isRead: false,
      isDeleted: false
    };

    const unreadCount = await Message.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};