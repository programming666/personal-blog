// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaArrowLeft } from 'react-icons/fa';

const section = 'text-xl font-semibold text-neutral-900 dark:text-white mb-3';
const body = 'text-neutral-700 dark:text-neutral-300 leading-relaxed';
const list = 'list-disc pl-6 mt-2 space-y-1 text-neutral-700 dark:text-neutral-300';

const PrivacyPage = () => {
  return (
    <div>
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
            <FaShieldAlt className="text-2xl text-neutral-900 dark:text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            隐私政策
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-neutral-500 dark:text-neutral-400">
            最后更新日期：2025年8月
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card p-6 sm:p-10 space-y-10">
          <section>
            <h2 className={section}>1. 引言</h2>
            <p className={body}>
              我们高度重视您的隐私和个人信息安全。本隐私政策旨在透明地向您说明我们如何收集、使用、存储和保护您的个人信息。我们承诺以负责任的态度处理您的数据，并为您提供清晰的选择。
            </p>
            <p className={body + ' mt-2'}>
              本博客由 qinyining.cn 域名的个人运营者（下称「我们」）以个人技术博客的形式运营。使用我们的服务即表示您同意本隐私政策的条款。我们建议您仔细阅读并理解这些内容，如有疑问，请随时通过文末联系方式与我们联系。
            </p>
          </section>

          <section>
            <h2 className={section}>2. 信息收集</h2>
            <p className={body}>
              为了提供优质的服务体验，我们可能会通过以下途径收集以下类型的信息：
            </p>
            <ul className={list}>
              <li><strong>账号信息（通过 GitHub 授权登录）：</strong>当您使用 GitHub 账号授权登录时，我们会获取您的 GitHub 用户名、公开头像及邮箱地址（具体授权范围以 GitHub 授权页面展示为准）。我们不会收集您的 GitHub 密码或其他私有资料。</li>
              <li><strong>评论内容：</strong>您在文章下方发表的评论及其回复。评论在发布前会经过本章第 5 条所述的自动化审核流程。</li>
              <li><strong>点赞与互动记录：</strong>您对文章、评论的点赞行为。</li>
              <li><strong>访问与使用数据：</strong>访问时间、浏览页面、IP 地址、浏览器与设备类型等技术数据。此类数据主要由我们接入的 CDN / 安全服务（如 Cloudflare，含 Turnstile 人机验证）在处理请求时自然产生并留存。</li>
            </ul>
            <p className={body + ' mt-2'}>
              我们仅在必要范围内收集信息，并始终遵循最小化原则。您有权选择是否提供某些信息，但这可能影响您使用部分功能的完整性（例如不登录将无法发表评论或点赞）。
            </p>
          </section>

          <section>
            <h2 className={section}>3. 信息使用</h2>
            <p className={body}>
              我们收集的信息主要用于以下目的：
            </p>
            <ul className={list}>
              <li>提供、维护和改进我们的服务</li>
              <li>创建和维护您的登录身份</li>
              <li>展示您的评论、头像与昵称</li>
              <li>对评论进行内容审核与垃圾信息防治（详见第 5 条）</li>
              <li>向您发送与服务相关的重要通知</li>
              <li>防止欺诈、恶意攻击和保障安全</li>
              <li>遵守法律法规要求</li>
            </ul>
            <p className={body + ' mt-2'}>
              我们承诺不会将您的个人信息用于与服务无关的目的。任何超出上述范围的使用，我们都会事先征得您的明确同意。
            </p>
          </section>

          <section>
            <h2 className={section}>4. 信息共享与委托处理</h2>
            <p className={body}>
              我们深知个人信息的重要性，因此严格限制信息共享范围：
            </p>
            <ul className={list}>
              <li><strong>不出售承诺：</strong>我们郑重承诺不会向任何第三方出售您的个人信息。</li>
              <li><strong>委托处理：</strong>以下场景将把必要的数据交由可信的第三方处理，且均以最低必要为限：评论内容会发送至第三方 AI 内容审核服务（见第 5 条）；网站流量与安全防护由 Cloudflare 提供（含人机验证服务 Turnstile）；登录身份由 GitHub OAuth 提供服务。上述第三方均受其自身隐私条款约束，我们仅向其传输完成服务所必需的数据。</li>
              <li><strong>法律要求：</strong>在法律法规要求或法院传票等法律程序下，可能需要披露相关信息。</li>
            </ul>
            <p className={body + ' mt-2'}>
              任何信息共享都将在合法、正当、必要的原则下进行，并尽可能进行去标识化处理。
            </p>
          </section>

          <section>
            <h2 className={section}>5. AI 审核与内容处理</h2>
            <p className={body}>
              为维护社区氛围并防治垃圾信息，您的评论在公开显示前，其文本内容可能会被发送至第三方 AI 内容审核服务（当前为 MiniMax，服务地址可配置）进行自动审核。审核服务可能作出以下处理：
            </p>
            <ul className={list}>
              <li><strong>正常放行：</strong>评论内容与文章相关且语气友善，直接展示。</li>
              <li><strong>离题或违规：</strong>与文章无关、含攻击辱骂、广告垃圾等内容的评论将被拒绝展示。</li>
              <li><strong>语气改写：</strong>评论观点有实质内容但语气不友善（如阴阳怪气、明褒暗贬）时，AI 会保留您的原意改写为友善表述后展示，并在评论区标注「已由 AI 润色」，您可通过提示展开查看原始文本。</li>
            </ul>
            <p className={body + ' mt-2'}>
              原始评论文本会被保留，仅用于审核复核与原文展示，不会被用于训练模型或二次开发利用。启用 AI 审核时，未通过审核（含审核服务暂时不可用）的评论将进入待审队列，不会公开展示。
            </p>
          </section>

          <section>
            <h2 className={section}>6. 数据安全</h2>
            <p className={body}>
              我们采取业界标准的安全措施保护您的个人信息，包括但不限于：
            </p>
            <ul className={list}>
              <li>使用加密技术传输敏感信息（HTTPS 全站加密）</li>
              <li>实施访问控制和权限管理</li>
              <li>对 AI 审核接口使用密钥鉴权并做频率限制</li>
              <li>定期进行安全审计和漏洞扫描</li>
            </ul>
            <p className={body + ' mt-2'}>
              尽管我们已尽最大努力保障数据安全，但请您理解，没有任何互联网传输或电子存储方式是绝对安全的。我们建议您也采取适当措施保护您的账户安全，如使用强密码并定期更新。
            </p>
            <p className={body + ' mt-2'}>
              如发生个人信息泄露等安全事件，我们将依照《个人信息保护法》的规定，及时通过站内公告或邮件等方式通知您，并采取补救措施。
            </p>
          </section>

          <section>
            <h2 className={section}>7. 数据保留</h2>
            <p className={body}>
              我们仅在实现收集目的所必需的期限内保留您的个人信息。具体保留期限根据以下因素确定：
            </p>
            <ul className={list}>
              <li>实现服务目的所需的时间</li>
              <li>法律法规要求的保留期限</li>
              <li>解决争议和执行协议的需要</li>
            </ul>
            <p className={body + ' mt-2'}>
              当信息不再需要时，我们将采取合理措施安全删除或匿名化处理。如需删除您的评论、账号或相关数据，请通过文末邮箱联系我们，我们将在收到请求后的合理期限内（通常不超过 15 个工作日）处理，法律法规另有规定的除外。
            </p>
          </section>

          <section>
            <h2 className={section}>8. 您的权利</h2>
            <p className={body}>
              根据相关法律法规，并在适用法律允许的范围内，您享有以下权利：
            </p>
            <ul className={list}>
              <li><strong>访问权：</strong>查询我们持有的关于您的个人信息</li>
              <li><strong>更正权：</strong>更新或更正不准确的个人信息</li>
              <li><strong>删除权：</strong>在特定情况下要求删除您的个人信息（如不再使用本服务）</li>
              <li><strong>撤回同意权：</strong>撤回您对信息处理的授权，撤回不影响撤回前已进行的处理</li>
              <li><strong>数据可携权：</strong>获取您个人信息的副本</li>
              <li><strong>注销权：</strong>要求注销本网站的登录身份并清除相关数据</li>
            </ul>
            <p className={body + ' mt-2'}>
              您可以通过文末邮箱联系我们直接行使上述权利。我们将在合理时间内响应您的请求。
            </p>
          </section>

          <section>
            <h2 className={section}>9. Cookie 与本地存储</h2>
            <p className={body}>
              我们与所接入的第三方服务使用 Cookie、LocalStorage 等存储技术，用途如下：
            </p>
            <ul className={list}>
              <li><strong>登录凭证：</strong>保存于浏览器本地存储（LocalStorage）的访问令牌，用于保持登录状态；管理端额外使用 HttpOnly Cookie 以提升安全性</li>
              <li><strong>人机验证：</strong>Cloudflare Turnstile 可能写入的安全校验标识（如 cf_clearance 类 Cookie）</li>
              <li><strong>偏好设置：</strong>您的明暗主题等界面偏好</li>
            </ul>
            <p className={body + ' mt-2'}>
              大多数浏览器允许您管理 Cookie 与站点数据设置。您可以选择清除或拒绝，但这可能导致部分功能（如保持登录）无法正常使用。
            </p>
          </section>

          <section>
            <h2 className={section}>10. 第三方服务</h2>
            <p className={body}>
              我们的服务依赖以下第三方，它们各有独立的隐私政策，我们建议您在使用前自行了解：
            </p>
            <ul className={list}>
              <li><strong>GitHub：</strong>提供账号授权登录（OAuth）</li>
              <li><strong>Cloudflare：</strong>提供 CDN 加速、DDoS 防护与 Turnstile 人机验证</li>
              <li><strong>AI 内容审核服务：</strong>对评论进行自动审核（第三方名称与服务地址以站内配置为准）</li>
            </ul>
            <p className={body + ' mt-2'}>
              我们对第三方就您数据的处理行为不承担超出法律要求的责任。您与第三方之间的互动受其各自条款的约束。
            </p>
          </section>

          <section>
            <h2 className={section}>11. 国际数据传输</h2>
            <p className={body}>
              您的信息可能会在我们拥有设施或聘请服务提供商的任何国家或地区进行存储和处理（例如，AI 审核服务与 CDN 服务的节点可能位于境外）。通过使用我们的服务，您理解您的信息可能会被传输到您所在司法管辖区以外的地区。
            </p>
            <p className={body + ' mt-2'}>
              我们确保所有数据传输都符合适用法律要求（如《个人信息保护法》中关于个人信息跨境提供的规定），并采取适当措施保护您的信息安全。
            </p>
          </section>

          <section>
            <h2 className={section}>12. 未成年人保护</h2>
            <p className={body}>
              本网站不向未成年人提供专项服务，但我们理解未成年人可能浏览本站。依照《个人信息保护法》：
            </p>
            <ul className={list}>
              <li>不满 14 周岁的未成年人的个人信息被视为敏感个人信息，其处理须取得父母或其他监护人的明确同意。</li>
              <li>如果您是不满 14 周岁的未成年人，请在监护人陪同下使用本站，并仅在获得监护人同意后发表评论或使用登录功能。</li>
              <li>我们不会有意收集不满 14 周岁未成年人的个人信息。如果您认为我们无意中收集了此类信息，请立即通过文末邮箱联系我们删除。</li>
            </ul>
            <p className={body + ' mt-2'}>
              我们建议监护人关注未成年人的网络使用行为，并在必要时与我们联系。
            </p>
          </section>

          <section>
            <h2 className={section}>13. 隐私政策的变更</h2>
            <p className={body}>
              我们可能会不时更新本隐私政策，以反映服务变化、法律要求更新或用户反馈。变更将在本页面发布，并可能通过站内公告等方式通知您。
            </p>
            <p className={body + ' mt-2'}>
              重大变更（如新增高影响的数据处理活动）将在生效前提供合理的通知期。继续使用我们的服务即表示您接受更新后的政策。
            </p>
          </section>

          <section>
            <h2 className={section}>14. 联系与反馈</h2>
            <p className={body}>
              如果您对本隐私政策有任何疑问、建议或关切，或希望行使您的权利，请通过以下方式联系我们：
            </p>
            <p className={body + ' mt-2'}>
              <strong>邮箱：</strong>ack550w101@gmail.com
            </p>
            <p className={body + ' mt-2'}>
              我们将在收到您的请求后的合理期限内给予回复。
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
          <span className="text-xs text-neutral-400 dark:text-neutral-500">qinyining.cn · 隐私政策</span>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPage;