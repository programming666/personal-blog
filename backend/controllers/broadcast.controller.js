const BroadcastMessage = require('../models/BroadcastMessage');
const Message = require('../models/Message');
const User = require('../models/User');

// 获取所有注册用户列表（用于广播选择）
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    
    // 查询条件
    const query = { role: 'user' };
    
    // 搜索功能
    if (req.query.search) {
      query.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { name: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // 获取用户列表
    const users = await User.find(query)
      .select('username email name createdAt role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // 获取总数
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 创建广播消息并开始发送
exports.createBroadcast = async (req, res) => {
  try {
    const { title, content, sendToAll = true, specificUsers = [] } = req.body;
    
    // 验证参数
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '请提供标题和内容'
      });
    }
    
    // 获取目标用户
    let targetUsers = [];
    if (sendToAll) {
      // 发送给所有用户
      targetUsers = await User.find({ role: 'user' }).select('_id');
    } else if (specificUsers && specificUsers.length > 0) {
      // 发送给特定用户
      targetUsers = await User.find({ 
        _id: { $in: specificUsers },
        role: 'user'
      }).select('_id');
    }
    
    if (targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有找到目标用户'
      });
    }
    
    // 创建广播记录
    const broadcast = await BroadcastMessage.create({
      title,
      content,
      sender: req.user._id, // 使用字符串标识
      totalRecipients: targetUsers.length,
      sendDetails: targetUsers.map(user => ({
        userId: user._id,
        status: 'pending'
      }))
    });
    
    // 异步开始发送（不阻塞响应）
    setTimeout(() => {
      processBroadcastMessages(broadcast._id).catch(console.error);
    }, 100);
    
    res.status(201).json({
      success: true,
      message: `广播消息已创建，将发送给 ${targetUsers.length} 个用户`,
      data: {
        broadcastId: broadcast._id,
        totalRecipients: targetUsers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 处理广播消息发送（异步）
async function processBroadcastMessages(broadcastId) {
  try {
    const broadcast = await BroadcastMessage.findById(broadcastId);
    if (!broadcast) return;
    
    // 更新状态为发送中
    broadcast.status = 'sending';
    broadcast.startedAt = new Date();
    await broadcast.save();
    
    const sendDetails = broadcast.sendDetails;
    let successCount = 0;
    let failedCount = 0;
    
    // 分批发送以避免内存问题
    const batchSize = 50;
    for (let i = 0; i < sendDetails.length; i += batchSize) {
      const batch = sendDetails.slice(i, i + batchSize);
      
      // 并行处理批次
      await Promise.all(batch.map(async (detail) => {
        if (detail.status === 'pending' || (detail.status === 'failed' && detail.retryCount < broadcast.maxRetries)) {
          try {
            // 创建个人消息
            await Message.create({
              title: broadcast.title,
              content: broadcast.content,
              sender: 'admin', // 使用字符串'admin'作为发送者标识
              recipient: detail.userId.toString(), // 确保转换为字符串
              recipientType: 'user_id'
            });
            
            // 更新发送状态
            detail.status = 'sent';
            detail.sentAt = new Date();
            successCount++;
          } catch (error) {
            detail.status = 'failed';
            detail.error = error.message;
            detail.retryCount++;
            failedCount++;
          }
        }
      }));
      
      // 更新广播进度
      broadcast.successCount = successCount;
      broadcast.failedCount = failedCount;
      await broadcast.updateProgress();
      
      // 短暂延迟以避免过载
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 最终状态更新
    await broadcast.updateProgress();
    
  } catch (error) {
    console.error('广播处理错误:', error);
    // 更新广播状态为失败
    await BroadcastMessage.findByIdAndUpdate(broadcastId, {
      status: 'failed',
      errorMessage: error.message
    });
  }
}

// 获取广播消息列表
exports.getBroadcasts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // 查询条件
    const query = {};
    
    // 日期范围筛选
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // 状态筛选
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // 获取广播列表
    const broadcasts = await BroadcastMessage.find(query)
      .populate('sender', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // 获取总数
    const total = await BroadcastMessage.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: broadcasts.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: broadcasts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取广播详情
exports.getBroadcastDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const broadcast = await BroadcastMessage.findById(id)
      .populate('sender', 'username email')
      .populate('sendDetails.userId', 'username email name');
    
    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: '广播消息不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      data: broadcast
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 重试失败的广播发送
exports.retryBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    
    const broadcast = await BroadcastMessage.findById(id);
    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: '广播消息不存在'
      });
    }
    
    if (broadcast.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: '只有失败的广播才能重试'
      });
    }
    
    if (broadcast.retryCount >= broadcast.maxRetries) {
      return res.status(400).json({
        success: false,
        message: '已达到最大重试次数'
      });
    }
    
    // 重置状态并重试
    broadcast.status = 'pending';
    broadcast.retryCount++;
    broadcast.errorMessage = '';
    await broadcast.save();
    
    // 异步重试
    setTimeout(() => {
      processBroadcastMessages(broadcast._id).catch(console.error);
    }, 100);
    
    res.status(200).json({
      success: true,
      message: '广播重试已开始'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取广播统计信息
exports.getBroadcastStats = async (req, res) => {
  try {
    const totalBroadcasts = await BroadcastMessage.countDocuments();
    const completedBroadcasts = await BroadcastMessage.countDocuments({ status: 'completed' });
    const failedBroadcasts = await BroadcastMessage.countDocuments({ status: 'failed' });
    const pendingBroadcasts = await BroadcastMessage.countDocuments({ status: 'pending' });
    
    // 最近7天的广播统计
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentStats = await BroadcastMessage.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          successRate: { 
            $avg: { 
              $cond: [
                { $eq: ['$status', 'completed'] },
                100,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalBroadcasts,
        completedBroadcasts,
        failedBroadcasts,
        pendingBroadcasts,
        recentStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};