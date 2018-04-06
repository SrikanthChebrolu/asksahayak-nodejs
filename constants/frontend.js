const FRONTEND_DEV_URLS = [ 'http://localhost:4100' ];

const FRONTEND_PROD_URLS = [
  'https://asksahayak.me',
  'https://www.asksahayak.me'
];

module.exports = process.env.NODE_ENV === 'production'
  ? FRONTEND_PROD_URLS
  : FRONTEND_DEV_URLS;
