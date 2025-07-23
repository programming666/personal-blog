import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              隐私政策
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              最后更新日期：2025年8月
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                1. 引言
              </h2>
              <p>
                我们高度重视您的隐私和个人信息安全。本隐私政策旨在透明地向您说明我们如何收集、使用、存储和保护您的个人信息。我们承诺以负责任的态度处理您的数据，并为您提供清晰的选择。
              </p>
              <p className="mt-2">
                使用我们的服务即表示您同意本隐私政策的条款。我们建议您仔细阅读并理解这些内容，如有疑问，请随时联系我们。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                2. 信息收集
              </h2>
              <p>
                为了提供优质的服务体验，我们可能会收集以下类型的信息：
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>注册信息：</strong>用户名、邮箱地址、密码等基本信息</li>
                <li><strong>个人资料：</strong>头像、个人简介、兴趣爱好等自愿提供的信息</li>
                <li><strong>使用数据：</strong>访问时间、浏览内容、互动行为等服务使用记录</li>
                <li><strong>技术信息：</strong>IP地址、浏览器类型、设备标识符等技术数据</li>
              </ul>
              <p className="mt-2">
                我们仅在必要范围内收集信息，并始终遵循最小化原则。您有权通过联系支持人员来选择是否提供某些信息，但这可能影响您使用部分功能的完整性。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                3. 信息使用
              </h2>
              <p>
                我们收集的信息主要用于以下目的：
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>提供、维护和改进我们的服务</li>
                <li>创建和维护您的账户</li>
                <li>向您发送与服务相关的重要通知</li>
                <li>个性化您的使用体验</li>
                <li>防止欺诈和保障安全</li>
                <li>遵守法律法规要求</li>
              </ul>
              <p className="mt-2">
                我们承诺不会将您的个人信息用于与服务无关的目的。任何超出上述范围的使用，我们都会事先征得您的明确同意。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                4. 信息共享与披露
              </h2>
              <p>
                我们深知个人信息的重要性，因此严格限制信息共享范围：
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>不出售承诺：</strong>我们郑重承诺不会向任何第三方出售您的个人信息</li>
                <li><strong>服务提供商：</strong>仅在必要时与可信的服务提供商共享，且须遵守严格的保密义务</li>
                <li><strong>法律要求：</strong>在法律法规要求或法院传票等法律程序下，可能需要披露相关信息</li>
                <li><strong>业务转让：</strong>如发生合并、收购或资产转让，相关信息可能作为业务资产转移</li>
              </ul>
              <p className="mt-2">
                任何信息共享都将在合法、正当、必要的原则下进行，并尽可能进行去标识化处理。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                5. 数据安全
              </h2>
              <p>
                我们采取业界标准的安全措施保护您的个人信息，包括但不限于：
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>使用加密技术传输和存储敏感信息</li>
                <li>实施访问控制和权限管理</li>
                <li>定期进行安全审计和漏洞扫描</li>
                <li>对员工进行隐私保护培训</li>
              </ul>
              <p className="mt-2">
                尽管我们已尽最大努力保障数据安全，但请您理解，没有任何互联网传输或电子存储方式是绝对安全的。我们建议您也采取适当措施保护您的账户安全，如使用强密码并定期更新。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                6. 数据保留
              </h2>
              <p>
                我们仅在实现收集目的所必需的期限内保留您的个人信息。具体保留期限根据以下因素确定：
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>实现服务目的所需的时间</li>
                <li>法律法规要求的保留期限</li>
                <li>解决争议和执行协议的需要</li>
              </ul>
              <p className="mt-2">
                当信息不再需要时，我们将采取合理措施安全删除或匿名化处理。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                7. 您的权利
              </h2>
              <p>
                根据相关法律法规，您享有以下权利：
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>访问权：</strong>查询我们持有的关于您的个人信息</li>
                <li><strong>更正权：</strong>更新或更正不准确的个人信息</li>
                <li><strong>删除权：</strong>在特定情况下要求删除您的个人信息</li>
                <li><strong>限制处理权：</strong>限制或反对处理您的个人信息</li>
                <li><strong>数据可携权：</strong>获取您个人信息的副本</li>
              </ul>
              <p className="mt-2">
                您可以通过联系我们的支持团队直接行使您的权利。我们将在合理时间内响应您的请求。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                8. Cookie和类似技术
              </h2>
              <p>
                我们使用Cookie和类似技术来提升用户体验、分析服务使用情况并提供个性化内容。这些技术帮助我们包括但不限于如下服务：
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>记住您的偏好设置</li>
                <li>保持登录状态</li>
                <li>了解用户如何使用我们的服务</li>
                <li>改进和优化服务功能</li>
              </ul>
              <p className="mt-2">
                大多数浏览器允许您管理Cookie设置。您可以联系支持团队来选择是否拒绝某些Cookie，但这可能影响部分功能的正常使用。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                9. 第三方服务
              </h2>
              <p>
                我们的服务可能包含第三方提供的功能或链接到第三方网站。这些第三方有其独立的隐私政策，我们建议您在使用前仔细阅读。
              </p>
              <p className="mt-2">
                我们对第三方网站的隐私做法或内容不承担任何责任。您与第三方之间的互动受其各自政策的约束。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                10. 国际数据传输
              </h2>
              <p>
                您的信息可能会在我们拥有设施或聘请服务提供商的任何国家/地区进行存储和处理。通过使用我们的服务，您理解您的信息可能会被传输到您所在司法管辖区以外的地区。
              </p>
              <p className="mt-2">
                我们确保所有数据传输都符合适用法律要求，并采取适当措施保护您的信息安全。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                11. 隐私政策的变更
              </h2>
              <p>
                我们可能会不时更新本隐私政策，以反映服务变化、法律要求更新或用户反馈。变更将在本页面发布，并可能通过其他适当方式通知。
              </p>
              <p className="mt-2">
                重大变更将在生效前提供合理的通知期。继续使用我们的服务即表示您接受更新后的政策。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                12. 免责声明
              </h2>
              <p>
                我们致力于保护您的隐私，但请您理解，互联网环境下的信息传输和存储存在固有风险。尽管我们已尽最大努力，但无法保证绝对的数据安全。
              </p>
              <p className="mt-2">
                您理解并同意，使用我们的服务即表示您接受这些风险。我们建议您定期查看本政策，了解我们如何保护您的信息。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                13. 联系我们
              </h2>
              <p>
                如果您对本隐私政策有任何疑问、建议或关切，或希望行使您的权利，请通过以下方式联系我们：
              </p>
              <div className="mt-2 space-y-1">
                <p><strong>邮箱：</strong>privacy@qinyining.cn</p>
              </div>
              <p className="mt-2">
                我们将在收到您的请求后合理的期限内内给予回复。
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/register"
              className="text-primary hover:text-primary/90 font-medium"
            >
              ← 返回注册页面
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;