import React from 'react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              服务条款
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              最后更新日期：2025年8月
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                1. 接受条款
              </h2>
              <p>
                欢迎您访问并使用我们的服务。通过访问或使用本网站，即表示您已阅读、理解并同意受本服务条款的约束。这些条款构成您与我们之间具有法律约束力的协议。
              </p>
              <p className="mt-2">
                如果您不同意本条款的任何部分，我们建议您谨慎使用本服务或选择不使用。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                2. 服务描述
              </h2>
              <p>
                我们致力于为用户提供一个分享知识、经验和见解的平台。本服务包括但不限于内容发布、评论互动、个人资料管理等功能。我们保留随时修改、暂停或终止部分或全部服务的权利，而无需事先通知。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                3. 用户责任
              </h2>
              <p>
                作为用户，您理解并同意对您发布的内容负全部责任。您应确保所发布内容不违反任何适用的法律法规，不侵犯任何第三方的权利。
              </p>
              <p className="mt-2">
                我们鼓励用户以负责任的态度使用本平台，尊重他人的观点和权利。如发现任何不当内容，我们可能会采取相应措施，包括但不限于内容删除、账户限制等。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                4. 内容政策
              </h2>
              <p>
                本平台上的所有内容，包括用户生成的内容，均按"现状"提供。我们尊重用户的表达自由，但不保证内容的准确性、完整性或适用性。
              </p>
              <p className="mt-2">
                用户应自行判断内容的价值和可信度。我们不对用户因依赖平台内容而做出的任何决定或采取的任何行动承担责任。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                5. 知识产权
              </h2>
              <p>
                用户保留对其发布内容的知识产权。通过发布内容，您授予我们在全球范围内、非独占性、免版税的许可，用于展示、分发和推广您的内容。
              </p>
              <p className="mt-2">
                我们尊重知识产权，如果您认为您的权利受到侵犯，请及时与我们联系。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                6. 服务可用性
              </h2>
              <p>
                我们努力保持服务的稳定性和连续性，但无法保证服务不会中断或出现技术故障。由于技术维护、网络问题、不可抗力或其他原因，服务可能会暂时不可用。
              </p>
              <p className="mt-2">
                我们不对因服务中断、延迟或故障导致的任何损失承担责任，包括但不限于数据丢失、业务中断或其他间接损失。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                7. 第三方链接
              </h2>
              <p>
                本服务可能包含指向第三方网站或服务的链接。这些链接仅为方便用户提供，我们不对第三方网站的内容、隐私政策或做法负责。
              </p>
              <p className="mt-2">
                访问第三方网站时，建议您仔细阅读其服务条款和隐私政策。您与第三方之间的任何互动均受该第三方的条款约束。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                8. 责任限制
              </h2>
              <p>
                在适用法律允许的最大范围内，我们不对因使用或无法使用本服务而导致的任何直接、间接、偶然、特殊或后果性损害承担责任。这包括但不限于利润损失、数据丢失、业务中断或其他商业损害。
              </p>
              <p className="mt-2">
                您理解并同意，使用本服务的风险由您自行承担。我们提供的服务仅供参考和信息分享之用，不构成任何形式的保证或承诺。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                9. 赔偿
              </h2>
              <p>
                您同意赔偿并使我们免受因您违反本服务条款或使用本服务而引起的任何索赔、损失、责任、费用和支出（包括合理的律师费）。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                10. 条款变更
              </h2>
              <p>
                我们保留随时修改本服务条款的权利。变更将在本页面发布，并可能通过其他适当方式通知用户。重大变更将在生效前提供合理的通知期。
              </p>
              <p className="mt-2">
                继续使用本服务即表示您接受修改后的条款。建议您定期查看本页面以了解最新条款。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                11. 终止
              </h2>
              <p>
                我们保留在任何时候、以任何理由暂停或终止您的账户或访问本服务的权利，无需事先通知。终止后，您的权利将立即终止。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                12. 适用法律
              </h2>
              <p>
                本服务条款受中华人民共和国法律管辖，不考虑其法律冲突原则。任何因本条款引起的争议应通过友好协商解决，协商不成的，提交有管辖权的人民法院处理。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                13. 联系我们
              </h2>
              <p>
                如果您对本服务条款有任何疑问、建议或关切，请通过以下方式联系我们：
              </p>
              <p className="mt-2">
                邮箱：contact@qinyining.cn
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

export default TermsPage;