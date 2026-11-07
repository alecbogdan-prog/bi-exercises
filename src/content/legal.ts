// Text of the Terms of Use and Privacy Policy, shared by the page and the static HTML written at build time.
import { BRAND } from '../lib/base';

export type Section = { h: string; p: string[] };

export const UPDATED = 'November 7, 2026';

export const TERMS: Section[] = [
  {
    h: 'Using the site',
    p: [
      `${BRAND} offers interactive Power BI and DAX practice exercises, projects and practice tests. By using the site you agree to these terms. If you do not agree, please do not use the site.`,
      'You may use the site for your own learning, and inside your company for training. Do not copy, resell or republish the exercises, explanations or practice questions without our written permission.',
    ],
  },
  {
    h: 'Accounts and paid plans',
    p: [
      'Some features, such as the full exercise library, all projects and all practice tests, are part of paid plans. Prices and what each plan includes are shown on the Pricing page.',
      'You are responsible for keeping your login details safe and for all activity on your account. Payments are processed by Stripe, which acts as the seller (merchant of record) for your purchase.',
    ],
  },
  {
    h: 'Cancellation and refunds',
    p: [
      'Pro subscriptions renew automatically, monthly or yearly, until you cancel. You can cancel at any time from your account page; you keep access until the end of the period you already paid for, and you are not charged again. To avoid the next charge, cancel before the renewal date.',
      'All payments are final and non-refundable, including subscription renewals, unused time and PL-300 Prep purchases. We do not give partial or prorated refunds.',
      'Paid content is digital and becomes available immediately after payment. By completing your purchase you ask for access to start straight away, and you acknowledge that you therefore lose the 14-day right of withdrawal that consumers in the EU and UK otherwise have for online purchases.',
      'This does not affect any rights you have under the law that cannot be waived, for example if you were charged by mistake or the service does not work as described. If you think a charge is wrong, write to us and we will look into it.',
    ],
  },
  {
    h: 'Practice tests and certificates',
    p: [
      'Our PL-300 practice tests are written by us to help you prepare. They are not real exam questions and passing them does not guarantee a result in any official exam. Certificates from this site show you completed our course; they are not Microsoft certifications.',
    ],
  },
  {
    h: 'No warranty',
    p: [
      'We work hard to keep the content accurate, but the site is provided "as is". We are not liable for decisions you make based on what you learn here, or for any indirect loss, to the extent the law allows.',
    ],
  },
  {
    h: 'Trademarks',
    p: [
      `${BRAND} is an independent learning site and is not affiliated with, sponsored or endorsed by Microsoft. Power BI, DAX and Excel are trademarks of Microsoft Corporation and are used only to describe the skills taught.`,
    ],
  },
  {
    h: 'Changes',
    p: ['We may update these terms. The date at the top shows the latest version. Continuing to use the site after a change means you accept the new terms.'],
  },
];

export const PRIVACY: Section[] = [
  {
    h: 'What we store',
    p: [
      'Your progress (solved exercises, practice test scores and your work in the editor) is saved in your own browser, on your device. It is not sent to our servers, and clearing your browser data removes it.',
      'If you create an account or join a waitlist, we store your email address and, if you give it, your name, so we can run your account and contact you about it.',
    ],
  },
  {
    h: 'Payments',
    p: ['Payments are handled by Stripe. We never see or store your full card number; we only keep your plan, its status and renewal date.'],
  },
  {
    h: 'Services we use',
    p: [
      'The site is hosted on Vercel, which processes standard request data such as your IP address to serve pages and keep the site secure. Accounts are stored with Supabase, sign-in and account emails are sent through Resend, and payments go through Stripe. Fonts are loaded from Google Fonts, which receives your IP address when the fonts load.',
      'If you accept analytics cookies, we use Google Analytics to count visits and see which pages are used, so we can improve them. Google receives your IP address and details about your browser and the pages you view. We do not use it for advertising.',
      'We also use Ahrefs Web Analytics to count visits and see where visitors come from. It does not set cookies or track you across sites; Ahrefs receives your IP address, browser details and the pages you view, and reports them to us only as totals.',
    ],
  },
  {
    h: 'Cookies',
    p: [
      'We do not use advertising cookies and we do not sell your data. Browser storage remembers your progress, your preferences and your cookie choice.',
      'Google Analytics cookies (_ga and _ga_*) are set only after you click Accept on the cookie banner. You can change your choice at any time with "Cookie settings" at the bottom of every page; if you withdraw consent, we delete those cookies.',
    ],
  },
  {
    h: 'Your rights',
    p: [
      'You can ask us to show, correct or delete the personal data we hold about you, such as your account email. If you are in the EU or UK you also have the rights given by the GDPR, including the right to complain to your local data protection authority.',
    ],
  },
  {
    h: 'Changes',
    p: ['We may update this policy. The date at the top shows the latest version.'],
  },
];

