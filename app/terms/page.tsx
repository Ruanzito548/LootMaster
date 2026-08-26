import Link from "next/link";

const sections = [
  {
    title: "1. About Loot Master",
    paragraphs: [
      "Loot Master is a gaming marketplace that provides users with access to digital gaming products, virtual goods, gaming-related services, rewards, and other digital content.",
      "Some products or services available through Loot Master may be supplied or fulfilled by third-party sellers, agents, partners, or service providers.",
      "Loot Master may modify, add, suspend, or remove products, services, features, or games at any time.",
    ],
  },
  {
    title: "2. Eligibility",
    paragraphs: [
      "You must be legally capable of entering into a binding agreement in your jurisdiction to use Loot Master.",
      "By using the Service, you represent that:",
    ],
    bullets: [
      "The information you provide is accurate and current.",
      "You are responsible for maintaining the security of your account.",
      "You will comply with all applicable laws and regulations.",
      "You will not use Loot Master for fraudulent, illegal, or abusive activities.",
    ],
    footer: "If you are under the minimum legal age required in your jurisdiction, you may only use the Service with the involvement and authorization of a parent or legal guardian where required by law.",
  },
  {
    title: "3. Account and Authentication",
    paragraphs: [
      "Loot Master may allow authentication through third-party providers such as Discord.",
      "You are responsible for maintaining access to the account associated with your authentication provider.",
      "You must not:",
    ],
    bullets: [
      "Attempt to access another user's account.",
      "Share or sell access to your Loot Master account.",
      "Circumvent authentication or security mechanisms.",
      "Use another person's identity or credentials.",
    ],
    footer: "Loot Master reserves the right to restrict or suspend accounts involved in suspicious, fraudulent, abusive, or unauthorized activity.",
  },
  {
    title: "4. Marketplace Products and Services",
    paragraphs: [
      "Products and services available on Loot Master may vary by game, region, server, platform, and availability.",
      "Before completing a purchase, you are responsible for reviewing:",
    ],
    bullets: ["The selected game.", "Server or region.", "Product or service description.", "Quantity.", "Delivery method.", "Price.", "Any applicable restrictions."],
    footer: "Some digital products may be delivered directly in-game, through an account, through a marketplace, or through another method specified during checkout. Loot Master is not responsible for incorrect information provided by the customer when placing an order.",
  },
  {
    title: "5. Digital Goods and Virtual Items",
    paragraphs: [
      "Digital goods, virtual currencies, game currencies, items, accounts, services, and other digital products have no cash value outside the applicable game or service unless explicitly stated otherwise.",
      "Virtual items and balances may be subject to restrictions imposed by the applicable game publisher.",
      "Loot Master does not claim ownership of third-party games, trademarks, characters, virtual currencies, or intellectual property belonging to their respective owners.",
    ],
  },
  {
    title: "6. Game Publishers and Third Parties",
    paragraphs: [
      "Loot Master may offer products or services related to games operated by third parties.",
      "Unless explicitly stated otherwise, Loot Master is not affiliated with, endorsed by, sponsored by, or officially associated with the publishers or developers of those games.",
      "Game publishers may change their rules, servers, economies, APIs, account policies, or terms at any time. Such changes may affect the availability or delivery of certain products or services.",
    ],
  },
  {
    title: "7. Orders and Payments",
    paragraphs: [
      "An order is considered submitted when the customer completes the checkout process.",
      "An order may remain pending until payment has been successfully confirmed.",
      "Loot Master may cancel or refuse an order when:",
    ],
    bullets: ["Payment cannot be verified.", "Fraud or abuse is suspected.", "The requested product is unavailable.", "Incorrect pricing or technical errors occurred.", "The transaction violates these Terms.", "Fulfillment is impossible due to circumstances outside Loot Master's reasonable control."],
    footer: "Prices displayed on the platform may change at any time. Price changes will not affect completed transactions unless otherwise required by applicable law.",
  },
  {
    title: "8. Order Delivery",
    paragraphs: [
      "Loot Master will attempt to fulfill valid orders within the estimated delivery time displayed during purchase.",
      "Delivery times may vary depending on:",
    ],
    bullets: ["Game servers.", "Server maintenance.", "Seller availability.", "Payment confirmation.", "Game restrictions.", "Technical issues.", "Information provided by the customer."],
    footer: "Estimated delivery times are not guaranteed unless explicitly stated otherwise. Customers must provide accurate information necessary to complete an order.",
  },
  {
    title: "9. Refunds and Cancellations",
    paragraphs: [
      "Refund eligibility depends on the nature and status of the purchased product or service.",
      "Because many Loot Master products are digital or may be delivered immediately, certain orders may not be eligible for cancellation or refund after fulfillment has begun or been completed, subject to applicable consumer protection laws.",
      "A refund may be considered when:",
    ],
    bullets: ["The order cannot be fulfilled.", "The wrong product was delivered by Loot Master.", "A technical issue prevents delivery.", "The order qualifies under applicable refund or consumer protection rules."],
    footer: "Refund requests may require information necessary to verify the transaction. Loot Master reserves the right to investigate suspicious refund activity, chargebacks, or fraudulent claims.",
  },
  {
    title: "10. Chargebacks and Payment Disputes",
    paragraphs: [
      "Customers should contact Loot Master support before initiating a payment dispute whenever possible.",
      "Unauthorized chargebacks, fraudulent payment disputes, or intentionally misleading claims may result in account restrictions or suspension.",
      "Nothing in this section limits rights granted to consumers under applicable law.",
    ],
  },
  {
    title: "11. Rewards, Loot Coins and Promotions",
    paragraphs: [
      "Loot Master may offer rewards, loyalty systems, Loot Coins, cashback, chests, coupons, promotional campaigns, or other benefits.",
      "Promotional rewards:",
    ],
    bullets: ["May have expiration dates.", "May have usage restrictions.", "May not be transferable.", "May not be redeemable for cash unless explicitly stated.", "May be modified or discontinued where permitted by law."],
    footer: "Loot Coins and similar virtual balances are platform credits and are not equivalent to bank deposits, currency, or guaranteed monetary value unless explicitly stated otherwise. Loot Master may correct balances affected by technical errors, fraud, or abuse.",
  },
  {
    title: "12. Prohibited Activities",
    paragraphs: ["You may not use Loot Master to:"],
    bullets: ["Commit fraud.", "Launder money or facilitate illegal transactions.", "Use stolen payment methods.", "Exploit bugs or vulnerabilities.", "Manipulate rewards or promotional systems.", "Create accounts for fraudulent purposes.", "Attempt unauthorized access to systems.", "Interfere with the operation of the platform.", "Use bots or automated systems to abuse the Service.", "Resell services in violation of applicable restrictions.", "Engage in harassment, threats, or abusive behavior.", "Conduct activities that violate applicable law."],
  },
  {
    title: "13. Account Suspension and Termination",
    paragraphs: ["Loot Master may suspend, restrict, or terminate an account when there is reasonable evidence of:"],
    bullets: ["Fraud.", "Abuse.", "Unauthorized activity.", "Payment manipulation.", "Exploitation of the platform.", "Violation of these Terms.", "Violation of applicable law."],
    footer: "Where appropriate, Loot Master may provide the user with an opportunity to resolve the issue. Termination does not automatically eliminate obligations that arose before termination.",
  },
  {
    title: "14. Intellectual Property",
    paragraphs: [
      "The Loot Master name, logo, website design, interface, graphics, text, software, branding, and original content are owned by or licensed to Loot Master unless otherwise stated.",
      "You may not reproduce, modify, distribute, sell, or commercially exploit Loot Master content without prior authorization.",
      "Third-party trademarks, game names, logos, and other intellectual property remain the property of their respective owners.",
    ],
  },
  {
    title: "15. Third-Party Services",
    paragraphs: ["Loot Master may integrate with third-party services such as:"],
    bullets: ["Discord", "Firebase", "Payment processors", "Game platforms", "Analytics and communication services"],
    footer: "Your use of those services may also be subject to their respective terms and privacy policies. Loot Master is not responsible for the availability, security, or policies of third-party services outside its reasonable control.",
  },
  {
    title: "16. Privacy",
    paragraphs: ["Your use of Loot Master is also governed by our Privacy Policy.", "The Privacy Policy explains how information may be collected, used, stored, and processed when you use the Service."],
  },
  {
    title: "17. Security",
    paragraphs: ["Loot Master takes reasonable measures to protect its platform and user information.", "However, no online service can guarantee absolute security.", "You acknowledge that internet transmissions and digital systems may involve risks beyond the reasonable control of Loot Master."],
  },
  {
    title: "18. Disclaimer",
    paragraphs: ["To the maximum extent permitted by applicable law, Loot Master provides the Service on an as available basis.", "Loot Master does not guarantee that:"],
    bullets: ["The Service will always be available.", "Every product will remain available indefinitely.", "Game servers will remain operational.", "Third-party services will remain available.", "Delivery will always occur within a specific estimated time.", "The platform will be completely free of errors or interruptions."],
    footer: "Nothing in these Terms excludes or limits rights that cannot legally be excluded under applicable law.",
  },
  {
    title: "19. Limitation of Liability",
    paragraphs: ["To the maximum extent permitted by applicable law, Loot Master will not be responsible for indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.", "This may include losses resulting from:"],
    bullets: ["Third-party game downtime.", "Changes to game rules.", "Account restrictions imposed by game publishers.", "Third-party service failures.", "Internet or server outages.", "Unauthorized access resulting from compromised third-party accounts."],
    footer: "Nothing in these Terms limits liability where such limitation is prohibited by applicable law.",
  },
  {
    title: "20. Changes to These Terms",
    paragraphs: ["Loot Master may update these Terms from time to time.", "When material changes are made, Loot Master may provide notice through the website or other appropriate means.", "Your continued use of the Service after updated Terms become effective constitutes acceptance of the revised Terms, to the extent permitted by applicable law."],
  },
  {
    title: "21. Governing Law",
    paragraphs: ["These Terms shall be interpreted in accordance with the laws applicable to Loot Master and its users, subject to mandatory consumer protection and other applicable legal requirements.", "Where applicable, consumers retain any rights granted by the laws of their jurisdiction."],
  },
  {
    title: "22. Contact",
    paragraphs: ["If you have questions regarding these Terms, orders, payments, refunds, or your account, please contact Loot Master through the official support channels available on the platform."],
  },
] as const;

export default function TermsPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="loot-panel rounded-[1.75rem] p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[color:var(--accent)]">Loot Master</p>
              <h1 className="loot-title mt-4 text-4xl font-black sm:text-6xl">Terms of Service</h1>
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">Last Updated: August 26, 2026</p>
            </div>
            <Link href="/" className="loot-secondary-button rounded-full px-4 py-2 text-sm font-semibold">Back to home</Link>
          </div>
          <p className="mt-8 max-w-3xl text-base leading-8 text-[color:var(--text-muted)]">Welcome to Loot Master. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Loot Master website, platform, marketplace, and related services (collectively, the &quot;Service&quot;).</p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[color:var(--text-muted)]">By accessing or using Loot Master, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not use the Service.</p>
        </header>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="loot-panel rounded-[1.25rem] p-6 sm:p-8">
              <h2 className="loot-title text-2xl font-black sm:text-3xl">{section.title}</h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets ? <ul className="list-disc space-y-2 pl-6">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
                {section.footer ? <p>{section.footer}</p> : null}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-6 text-center text-sm leading-7 text-[color:var(--text-muted)]">
          <p className="font-semibold text-[color:var(--text-main)]">Loot Master</p>
          <p>Gaming Market</p>
          <p>Your adventure starts here.</p>
          <p className="mt-4">Last Updated: August 26, 2026</p>
        </footer>
      </main>
    </div>
  );
}
