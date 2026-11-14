// One place for everything you will change after launch.
export const site = {
  name: 'The Biological Edge',
  tagline: 'Energy, strength and a calm mind — rebuilt after 40.',
  description:
    'Straight-talking health for men 40 to 60. What actually moved the needle on energy, strength, stress and sleep — from a 51-year-old who fixed his own.',
  founder: 'Todd Funk',
  email: 'hello@thebiologicaledge.com',

  // EMAIL LIST
  // Leave empty to save sign-ups on your own hosting (public/subscribe.php writes them
  // to tbe-private/subscribers.csv, one folder above public_html).
  // Or paste the form "action" URL from your email provider (Kit, MailerLite, Beehiiv...).
  emailFormAction: '',

  // SOCIAL — fill in as each channel goes live; empty ones are hidden.
  social: {
    YouTube: '',
    Instagram: '',
    TikTok: '',
    Facebook: '',
  } as Record<string, string>,
};
