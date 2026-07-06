import type { Lang } from '../i18n/translations'

/**
 * Maps an exact substring, as it appears on a line of pretty-printed
 * (`JSON.stringify(config, null, 2)`) output, to an explanatory comment
 * appended at the end of that line. Only covers sections/tags this app
 * itself always injects or controls (structural rules, DNS servers, region
 * rule sets, outbound/inbound types) — arbitrary pasted config content that
 * passes through untouched is left uncommented.
 *
 * For reading only: the annotated text is not valid JSON, so it must never
 * be what Copy/Download hand to sing-box.
 */
const LINE_COMMENTS: [pattern: string, comment: Record<Lang, string>][] = [
  [
    '"outbounds": [',
    {
      en: 'where traffic can be sent: your VLESS/Reality proxy, plus direct/block',
      ua: 'куди може йти трафік: ваш проксі VLESS/Reality, а також direct/block',
      ru: 'куда может уходить трафик: ваш прокси VLESS/Reality, а также direct/block',
    },
  ],
  [
    '"inbounds": [',
    {
      en: 'where local traffic enters sing-box',
      ua: 'звідки локальний трафік потрапляє у sing-box',
      ru: 'откуда локальный трафик попадает в sing-box',
    },
  ],
  [
    '"dns": {',
    {
      en: 'DNS resolution — servers and rules for which domains resolve where',
      ua: 'резолвінг DNS — сервери та правила щодо того, які домени де резолвляться',
      ru: 'резолвинг DNS — серверы и правила того, какие домены где резолвятся',
    },
  ],
  [
    '"route": {',
    {
      en: 'routing — which outbound (direct/proxy) each connection uses',
      ua: 'маршрутизація — який outbound (direct/proxy) використовує кожне з’єднання',
      ru: 'маршрутизация — какой outbound (direct/proxy) использует каждое соединение',
    },
  ],

  [
    '"type": "vless"',
    {
      en: 'your VLESS/Reality proxy — server/uuid/keys come from your logged-in client',
      ua: 'ваш проксі VLESS/Reality — server/uuid/ключі беруться з вашого клієнта, під яким ви увійшли',
      ru: 'ваш прокси VLESS/Reality — server/uuid/ключи берутся из вашего клиента, под которым вы вошли',
    },
  ],
  [
    '"multiplex": {',
    {
      en: 'bundles this proxy connection over fewer physical TLS sessions — useful against ISP limits on concurrent TLS connections',
      ua: 'об’єднує це проксі-з’єднання в меншу кількість фізичних TLS-сесій — корисно проти обмежень провайдера на кількість одночасних TLS-з’єднань',
      ru: 'объединяет это прокси-соединение в меньшее число физических TLS-сессий — полезно против ограничений провайдера на число одновременных TLS-соединений',
    },
  ],
  [
    '"type": "direct"',
    {
      en: 'sends traffic straight out, no proxy',
      ua: 'надсилає трафік напряму, без проксі',
      ru: 'отправляет трафик напрямую, без прокси',
    },
  ],
  [
    '"type": "block"',
    { en: 'drops traffic silently', ua: 'мовчки відкидає трафік', ru: 'молча отбрасывает трафик' },
  ],
  [
    '"type": "tun"',
    {
      en: 'virtual network interface — captures all system traffic transparently',
      ua: 'віртуальний мережевий інтерфейс — прозоро перехоплює весь системний трафік',
      ru: 'виртуальный сетевой интерфейс — прозрачно перехватывает весь системный трафик',
    },
  ],
  [
    '"type": "mixed"',
    {
      en: "SOCKS5 + HTTP proxy — for apps/browsers that don't support TUN",
      ua: 'проксі SOCKS5 + HTTP — для застосунків/браузерів, які не підтримують TUN',
      ru: 'прокси SOCKS5 + HTTP — для приложений/браузеров, которые не поддерживают TUN',
    },
  ],

  [
    '"tag": "dns-local"',
    {
      en: 'resolves via the system/ISP DNS, no tunnel',
      ua: 'резолвить через системний/ISP DNS, без тунелю',
      ru: 'резолвит через системный/ISP DNS, без туннеля',
    },
  ],
  [
    '"tag": "dns-remote"',
    {
      en: 'resolves through the VLESS tunnel',
      ua: 'резолвить через тунель VLESS',
      ru: 'резолвит через туннель VLESS',
    },
  ],
  [
    '"tag": "dns-direct"',
    {
      en: 'resolves directly (no tunnel) — Ukraine profile only',
      ua: 'резолвить напряму (без тунелю) — лише для профілю «Україна»',
      ru: 'резолвит напрямую (без туннеля) — только для профиля «Украина»',
    },
  ],

  [
    '"action": "sniff"',
    {
      en: 'detects the real protocol/domain of a connection — required for domain-based rules to see anything',
      ua: 'визначає реальний протокол/домен з’єднання — потрібно, щоб правила за доменом взагалі щось бачили',
      ru: 'определяет реальный протокол/домен соединения — необходимо, чтобы правила по домену вообще что-то видели',
    },
  ],
  [
    '"action": "hijack-dns"',
    {
      en: "intercepts DNS queries so they're answered by the servers above, instead of leaking to the OS's own DNS",
      ua: 'перехоплює DNS-запити, щоб на них відповідали сервери вище, а не вбудований DNS ОС',
      ru: 'перехватывает DNS-запросы, чтобы на них отвечали серверы выше, а не встроенный DNS ОС',
    },
  ],
  [
    '"action": "resolve"',
    {
      en: 'pre-resolves the destination IP — required before IP-based (geoip) rules can match',
      ua: 'заздалегідь резолвить IP призначення — потрібно перед тим, як спрацюють правила за IP (geoip)',
      ru: 'заранее резолвит IP назначения — нужно перед тем, как сработают правила по IP (geoip)',
    },
  ],
  [
    '"action": "evaluate"',
    {
      en: 'resolves via this server first; the rules below can then re-route based on the result',
      ua: 'спершу резолвить через цей сервер; правила нижче потім можуть перенаправити на основі результату',
      ru: 'сначала резолвит через этот сервер; правила ниже могут затем перенаправить на основе результата',
    },
  ],
  [
    '"match_response": true',
    {
      en: 'applies only if the resolved IP matches the referenced rule_set',
      ua: 'застосовується, лише якщо резолвлений IP збігається із зазначеним rule_set',
      ru: 'применяется, только если резолвленный IP совпадает с указанным rule_set',
    },
  ],
  [
    '"ip_is_private": true',
    {
      en: 'RFC1918/link-local destinations — always direct, never worth tunneling',
      ua: 'призначення RFC1918/link-local — завжди напряму, тунелювати їх немає сенсу',
      ru: 'адресаты RFC1918/link-local — всегда напрямую, туннелировать их не имеет смысла',
    },
  ],
  [
    '"query_type"',
    {
      en: 'blocks HTTPS/SVCB record lookups — sing-box would otherwise resolve them redundantly',
      ua: 'блокує запити записів HTTPS/SVCB — інакше sing-box резолвив би їх надлишково',
      ru: 'блокирует запросы записей HTTPS/SVCB — иначе sing-box резолвил бы их избыточно',
    },
  ],
  [
    '".lan"',
    {
      en: 'local network domains never need a real DNS answer',
      ua: 'домени локальної мережі ніколи не потребують справжньої DNS-відповіді',
      ru: 'домены локальной сети никогда не нуждаются в настоящем DNS-ответе',
    },
  ],

  [
    '"tag": "geoip-ua"',
    {
      en: 'Ukraine IP ranges (SagerNet/sing-geoip)',
      ua: 'діапазони IP України (SagerNet/sing-geoip)',
      ru: 'диапазоны IP Украины (SagerNet/sing-geoip)',
    },
  ],
  [
    '"tag": "geoip-ru"',
    {
      en: 'Russia IP ranges (SagerNet/sing-geoip)',
      ua: 'діапазони IP Росії (SagerNet/sing-geoip)',
      ru: 'диапазоны IP России (SagerNet/sing-geoip)',
    },
  ],
  [
    '"tag": "geoip-ru-blocked"',
    {
      en: 'IPs Roskomnadzor blocks (runetfreedom/russia-v2ray-rules-dat)',
      ua: 'IP-адреси, які блокує Роскомнагляд (runetfreedom/russia-v2ray-rules-dat)',
      ru: 'IP-адреса, которые блокирует Роскомнадзор (runetfreedom/russia-v2ray-rules-dat)',
    },
  ],
  [
    '"tag": "geosite-ru-blocked"',
    {
      en: 'domains Roskomnadzor blocks by name (runetfreedom/russia-v2ray-rules-dat)',
      ua: 'домени, які Роскомнагляд блокує за назвою (runetfreedom/russia-v2ray-rules-dat)',
      ru: 'домены, которые Роскомнадзор блокирует по имени (runetfreedom/russia-v2ray-rules-dat)',
    },
  ],
  [
    '"tag": "cdn-cloudflare"',
    {
      en: "Cloudflare's IP ranges (Loyalsoldier/geoip) — routed direct so CDN traffic skips the tunnel",
      ua: 'діапазони IP Cloudflare (Loyalsoldier/geoip) — спрямовується напряму, щоб трафік CDN оминав тунель',
      ru: 'диапазоны IP Cloudflare (Loyalsoldier/geoip) — направляется напрямую, чтобы трафик CDN обходил туннель',
    },
  ],
  [
    '"tag": "cdn-google"',
    {
      en: 'Google IP ranges (Loyalsoldier/geoip) — routed direct',
      ua: 'діапазони IP Google (Loyalsoldier/geoip) — напряму',
      ru: 'диапазоны IP Google (Loyalsoldier/geoip) — напрямую',
    },
  ],
  [
    '"tag": "cdn-fastly"',
    {
      en: 'Fastly IP ranges (Loyalsoldier/geoip) — routed direct',
      ua: 'діапазони IP Fastly (Loyalsoldier/geoip) — напряму',
      ru: 'диапазоны IP Fastly (Loyalsoldier/geoip) — напрямую',
    },
  ],
  [
    '"tag": "cdn-cloudfront"',
    {
      en: 'AWS CloudFront IP ranges (Loyalsoldier/geoip) — routed direct',
      ua: 'діапазони IP AWS CloudFront (Loyalsoldier/geoip) — напряму',
      ru: 'диапазоны IP AWS CloudFront (Loyalsoldier/geoip) — напрямую',
    },
  ],

  [
    '"default_domain_resolver"',
    {
      en: 'fallback DNS server for route-level resolution — must match a tag defined in dns.servers',
      ua: 'резервний DNS-сервер для резолвінгу на рівні route — має збігатися з тегом, визначеним у dns.servers',
      ru: 'резервный DNS-сервер для резолвинга на уровне route — должен совпадать с тегом, определённым в dns.servers',
    },
  ],
  [
    '"final":',
    {
      en: 'fallback if nothing above matches',
      ua: 'резервний варіант, якщо нічого вище не збіглося',
      ru: 'запасной вариант, если ничего выше не совпало',
    },
  ],
]

/** Appends a trailing `// comment` (in the given language) to lines matching a known
 * pattern. Operates on already-pretty-printed JSON text; the result is for display
 * only, not valid JSON. */
export function annotateConfigJson(json: string, lang: Lang): string {
  return json
    .split('\n')
    .map((line) => {
      const match = LINE_COMMENTS.find(([pattern]) => line.includes(pattern))
      return match ? `${line}  // ${match[1][lang]}` : line
    })
    .join('\n')
}
