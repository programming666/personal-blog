import React from 'react';
import { FaUser, FaCode, FaServer, FaHandshake, FaRobot, FaBug } from 'react-icons/fa';

const TeamPage = () => {
  // 按工作分类的团队成员数据
  const teamByWork = {
    "前端开发": [
      {
        name: "我",
        icon: <FaUser className="text-3xl text-primary-600" />
      }
    ],
    "后端开发": [
      {
        name: "我",
        icon: <FaUser className="text-3xl text-primary-600" />
      }
    ],
    "部署运维": [
      {
        name: "我",
        icon: <FaUser className="text-3xl text-primary-600" />
      }
    ],
    "友情赞助": [
      {
        name: "我",
        icon: <FaUser className="text-3xl text-primary-600" />
      }
    ],
    "代码审查": [
      {
        name: "智谱AIGLM4.5",
        icon: <FaRobot className="text-3xl text-secondary-600" />
      },
      {
        name: "deepseek-r1-0528",
        icon: <FaRobot className="text-3xl text-accent-600" />
      },
      {
        name: "通义千问3coder",
        icon: <FaRobot className="text-3xl text-info-600" />
      },
      {
        name: "gemini2.5pro",
        icon: <FaRobot className="text-3xl text-warning-600" />
      },
      {
        name: "豆包1.6seed",
        icon: <FaRobot className="text-3xl text-error-600" />
      },
      {
        name: "豆包1.5thinking",
        icon: <FaRobot className="text-3xl text-success-600" />
      },
      {
        name: "Claude4 sonnet",
        icon: <FaRobot className="text-3xl text-purple-600" />
      }
    ],
    "Bug修复": [
      {
        name: "我",
        icon: <FaUser className="text-3xl text-primary-600" />
      },
      {
        name: "智谱GLM4.5",
        icon: <FaRobot className="text-3xl text-secondary-600" />
      },
      {
        name: "deepseek-r1-0528",
        icon: <FaRobot className="text-3xl text-accent-600" />
      },
      {
        name: "通义千问3coder",
        icon: <FaRobot className="text-3xl text-info-600" />
      },
      {
        name: "gemini2.5pro",
        icon: <FaRobot className="text-3xl text-warning-600" />
      },
      {
        name: "豆包1.6seed",
        icon: <FaRobot className="text-3xl text-error-600" />
      },
      {
        name: "豆包1.5thinking",
        icon: <FaRobot className="text-3xl text-success-600" />
      },
      {
        name: "claude4 sonnet",
        icon: <FaRobot className="text-3xl text-purple-600" />
      }
    ]
  };

  // 工作类型图标映射
  const workIcons = {
    "前端开发": <FaCode className="mr-2" />,
    "后端开发": <FaServer className="mr-2" />,
    "部署运维": <FaServer className="mr-2" />,
    "友情赞助": <FaHandshake className="mr-2" />,
    "代码审查": <FaRobot className="mr-2" />,
    "Bug修复": <FaBug className="mr-2" />
  };

  // 工作类型描述
  const workDescriptions = {
    "前端开发": "负责用户界面的设计和实现，使用React构建交互式网页应用。",
    "后端开发": "负责服务器端逻辑实现，使用Node.js和Express框架构建API。",
    "部署运维": "负责应用的部署、维护和性能优化。",
    "友情赞助": "为项目提供资源支持和精神鼓励。",
    "代码审查": "提供专业的代码审查服务，确保代码质量和规范性。",
    "Bug修复": "协助发现和修复代码中的问题，提高系统稳定性。"
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">开发团队</h1>

      <div className="mb-12 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">项目介绍</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          这是一个个人博客项目，旨在分享技术知识和个人见解。项目采用前后端分离的架构，
          前端使用React构建，后端使用Node.js和Express框架。
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          本项目由热爱技术的开发者共同维护，我们致力于打造一个高质量、易用的博客平台。
        </p>
      </div>

      <h2 className="text-2xl font-semibold mb-6">团队分工</h2>

      <div className="space-y-8">
        {Object.entries(teamByWork).map(([workType, members], index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center mb-4">
              {workIcons[workType]}
              <h3 className="text-xl font-semibold">{workType}</h3>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {workDescriptions[workType]}
            </p>

            <div className="mt-4">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">负责人员：</h4>
              <div className="flex flex-wrap gap-4">
                {members.map((member, memberIndex) => (
                  <div 
                    key={memberIndex} 
                    className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-w-[120px]"
                  >
                    {member.icon}
                    <span className="mt-2 text-sm font-medium">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default TeamPage;
