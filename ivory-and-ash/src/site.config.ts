// Everything a non-developer is likely to change lives here.
export const site = {
  name: 'Ivory & Ash',
  fullName: 'Ivory & Ash Painting',
  tagline: 'Fine residential & commercial painting',
  city: 'Calgary',
  region: 'Alberta',
  url: 'https://ivoryandashpainting.com',

  // Leave blank to hide. Add them when the phone line and mailbox exist.
  phone: '',
  email: 'hello@ivoryandashpainting.com',
  instagram: '',

  // How quickly the team replies to a consultation request.
  replyWindow: 'one business day',

  // The voice concierge (Grok Voice). Needs XAI_API_KEY set on the host.
  concierge: {
    enabled: true,
    model: 'grok-voice-3.0',
    voice: 'eve',
    maxMinutes: 6,
  },

  neighbourhoods: [
    'Mount Royal', 'Elbow Park', 'Britannia', 'Bel-Aire', 'Roxboro', 'Rideau Park',
    'Altadore', 'Marda Loop', 'Aspen Woods', 'Springbank Hill', 'West Springs',
    'Varsity Estates', 'Lake Bonavista', 'Springbank', 'Elbow Valley', 'Bearspaw',
  ],
};
