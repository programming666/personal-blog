// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { FaFileContract, FaArrowLeft } from 'react-icons/fa';

const section = 'text-xl font-semibold text-neutral-900 dark:text-white mb-3';
const body = 'text-neutral-700 dark:text-neutral-300 leading-relaxed';
const list = 'list-disc pl-6 mt-2 space-y-1 text-neutral-700 dark:text-neutral-300';

const TermsPage = () => {
  return (
    <div>
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
            <FaFileContract className="text-2xl text-neutral-900 dark:text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            服务条款
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-neutral-500 dark:text-neutral-400">
            最后更新日期：2025年8月
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card p-6 sm:p-10 space-y-10">
          <section>
            <h2 className={section}>1. 接受条款</h2>
            <p className={body}>
              欢迎您访问并使用本网站（域名 qinyining.cn，下称「本站」）。本站由 qinyining.cn 域名的个人运营者以个人技术博客的形式运营。通过访问或使用本站，即表示您已阅读、理解并同意受本服务条款的约束。这些条款构成您与我们之间具有法律约束力的协议。
            </p>
            <p className={body + ' mt-2'}>
              如果您不同意本条款的任何部分，我们建议您谨慎使用本服务或选择不使用。
            </p>
          </section>

          <section>
            <h2 className={section}>2. 服务描述</h2>
            <p className={body}>
              本站是一个个人技术博客，向访客提供以下功能：浏览站方发布的文章、发表评论、回复评论、为文章与评论点赞，以及了解站方发布的公告。文章内容的发布由站方主导，普通访客不提供内容发布功能。
            </p>
            <p className={body + ' mt-2'}>
              我们保留随时修改、暂停或终止部分或全部服务的权利，而无需事先通知。
            </p>
          </section>

          <section>
            <h2 className={section}>3. 用户责任</h2>
            <p className={body}>
              作为用户，您理解并同意对您发布的内容（包括评论与回复）负全部责任。您应确保所发布内容不违反任何适用的法律法规，不侵犯任何第三方的权利。
            </p>
            <p className={body + ' mt-2'}>
              我们鼓励用户以负责任的态度使用本平台，尊重他人的观点和权利。如发现任何不当内容，我们可能会采取相应措施，包括但不限于内容删除、账户限制等。
            </p>
            <p className={body + ' mt-2'}>
              如您希望删除自己发布的评论或相关数据，请通过文末邮箱联系我们，我们将按《个人信息保护法》的规定处理（详见《隐私政策》）。
            </p>
          </section>

          <section>
            <h2 className={section}>4. 内容政策与 AI 审核</h2>
            <p className={body}>
              本平台上的所有内容，包括用户生成的评论，均按「现状」提供。我们尊重用户的表达自由，但不保证内容的准确性、完整性或适用性。
            </p>
            <p className={body + ' mt-2'}>
              为维护社区氛围，评论在公开显示前可能经过自动化审核（由第三方 AI 服务执行）。审核可能：拒绝与文章无关、含攻击辱骂或广告性质的内容；对观点成立但语气不友善（如阴阳怪气、明褒暗贬）的评论，在保留您原意的前提下由 AI 改写为友善表述后展示，并在评论区予以标注。您可通过标注后的提示展开查看原始文本。该处理不影响您对原始评论内容享有的权利。
            </p>
            <p className={body + ' mt-2'}>
              用户应自行判断内容的价值和可信度。我们不对用户因依赖平台内容而做出的任何决定或采取的任何行动承担责任。
            </p>
          </section>

          <section>
            <h2 className={section}>5. 知识产权</h2>
            <p className={body}>
              用户保留对其发布内容的知识产权。通过发布内容，您授予我们在全球范围内、非独占性、免版税的许可，用于展示、分发和推广您的内容。
            </p>
            <p className={body + ' mt-2'}>
              我们尊重知识产权，如果您认为您的权利受到侵犯，请及时与我们联系。
            </p>
          </section>

          <section>
            <h2 className={section}>6. 服务可用性</h2>
            <p className={body}>
              我们努力保持服务的稳定性和连续性，但无法保证服务不会中断或出现技术故障。由于技术维护、网络问题、不可抗力或其他原因，服务可能会暂时不可用。
            </p>
            <p className={body + ' mt-2'}>
              我们不对因服务中断、延迟或故障导致的任何损失承担责任，包括但不限于数据丢失、业务中断或其他间接损失。
            </p>
          </section>

          <section>
            <h2 className={section}>7. 第三方服务</h2>
            <p className={body}>
              本站依赖 GitHub（账号授权登录）、Cloudflare（CDN 与安全防护、人机验证）及第三方 AI 审核服务（评论自动审核）等第三方提供的功能。您与第三方之间的互动受其各自条款的约束，我们建议您查看其相应政策。
            </p>
            <p className={body + ' mt-2'}>
              本站可能包含指向第三方网站或服务的链接。这些链接仅为方便用户提供，我们不对第三方网站的内容、隐私政策或做法负责。
            </p>
          </section>

          <section>
            <h2 className={section}>8. 责任限制</h2>
            <p className={body}>
              在适用法律允许的最大范围内，我们不对因使用或无法使用本站服务而导致的任何直接、间接、偶然、特殊或后果性损害承担责任。这包括但不限于利润损失、数据丢失、业务中断或其他商业损害。
            </p>
            <p className={body + ' mt-2'}>
              您理解并同意，使用本服务的风险由您自行承担。我们提供的服务仅供参考和信息分享之用，不构成任何形式的保证或承诺。
            </p>
          </section>

          <section>
            <h2 className={section}>9. 赔偿</h2>
            <p className={body}>
              您同意赔偿并使我们免受因您违反本服务条款或使用本服务而引起的任何索赔、损失、责任、费用和支出（包括合理的律师费）。
            </p>
          </section>

          <section>
            <h2 className={section}>10. 条款变更</h2>
            <p className={body}>
              我们保留随时修改本服务条款的权利。变更将在本页面发布，并可能通过站内公告等方式通知用户。重大变更将在生效前提供合理的通知期。
            </p>
            <p className={body + ' mt-2'}>
              继续使用本服务即表示您接受修改后的条款。建议您定期查看本页面以了解最新条款。
            </p>
          </section>

          <section>
            <h2 className={section}>11. 终止</h2>
            <p className={body}>
              我们保留在任何时候、以任何理由暂停或终止您的账户或访问本站服务的权利，无需事先通知。终止后，您的权利将立即终止。
            </p>
          </section>

          <section>
            <h2 className={section}>12. 适用法律</h2>
            <p className={body}>
              本服务条款受中华人民共和国法律管辖，不考虑其法律冲突原则。任何因本条款引起的争议应通过友好协商解决，协商不成的，提交有管辖权的人民法院处理。
            </p>
          </section>

          <section>
            <h2 className={section}>13. 未成年人保护</h2>
            <p className={body}>
              不建议未成年人使用本站的登录、评论及互动功能。不满 14 周岁的未成年人如需浏览本站，应在监护人陪同下进行；其个人信息受《个人信息保护法》特别保护，处理须取得监护人同意。
            </p>
            <p className={body + ' mt-2'}>
              如果我们发现无意中收集了不满 14 周岁未成年人的个人信息，将立即删除或匿名化处理。如有相关情况，请通过文末邮箱告知我们。
            </p>
          </section>

          <section>
            <h2 className={section}>14. 联系我们</h2>
            <p className={body}>
              如果您对本服务条款或《隐私政策》有任何疑问、建议或关切，请通过以下方式联系我们：
            </p>
            <p className={body + ' mt-2'}>
              <strong>邮箱：</strong>ack550w101@gmail.com
            </p>
          </section>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-medium text-neutral-900 dark:text-white hover:opacity-70 transition-opacity"
          >
            <FaArrowLeft className="text-xs" /> 返回首页
          </Link>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">qinyining.cn · 服务条款</span>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;