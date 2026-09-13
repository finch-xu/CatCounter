const BOT_RE =
  /bot|spider|crawl|slurp|headless|lighthouse|pagespeed|python-requests|curl\/|wget\/|go-http-client|java\/|okhttp|facebookexternalhit|preview|monitor|scrapy|phantomjs/i;

export function isBot(ua: string): boolean {
  if (!ua || ua.trim() === '') return true;
  return BOT_RE.test(ua);
}

export function deviceOf(ua: string): 'desktop' | 'mobile' | 'tablet' {
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) return 'tablet';
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|phone|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}
