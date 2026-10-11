const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MONGODB_URI 是文档/示例/所有迁移脚本统一使用的名字,但这里原本只读 MONGO_URI ——
    // 结果按 DEPLOY.md 配好的带认证连接串被静默忽略,应用一直去连 localhost 的匿名库。
    // 两个名字都认,MONGODB_URI 优先;只在都没配时才回退到本地默认。
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/personal-blog';
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;