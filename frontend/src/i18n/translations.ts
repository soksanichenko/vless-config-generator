export type Lang = 'en' | 'ua' | 'ru'

export const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: 'en', label: 'EN', flag: '🇬🇧' },
  { value: 'ua', label: 'UA', flag: '🇺🇦' },
  { value: 'ru', label: 'RU', flag: '🇷🇺' },
]

const DICT = {
  'app.title': {
    en: 'VLESS Config Generator',
    ua: 'Генератор конфігурацій VLESS',
    ru: 'Генератор конфигураций VLESS',
  },
  'app.subtitle': {
    en: 'Build sing-box routing rules for your VLESS/Reality client config.',
    ua: 'Створюйте правила маршрутизації sing-box для вашого клієнтського конфігу VLESS/Reality.',
    ru: 'Создавайте правила маршрутизации sing-box для вашего клиентского конфига VLESS/Reality.',
  },

  'client.heading': { en: '1. Client', ua: '1. Клієнт', ru: '1. Клиент' },
  'client.loadError': {
    en: "Could not load your client credentials ({error}). You can still build a config, but the proxy outbound's credentials won't be filled in automatically.",
    ua: 'Не вдалося завантажити ваші дані клієнта ({error}). Ви можете продовжити збірку конфігу, але дані проксі-outbound не будуть підставлені автоматично.',
    ru: 'Не удалось загрузить ваши данные клиента ({error}). Вы можете продолжить сборку конфига, но данные proxy-outbound не будут подставлены автоматически.',
  },
  'client.loggedInAsPrefix': { en: 'Logged in as ', ua: 'Ви увійшли як ', ru: 'Вы вошли как ' },
  'client.loggedInAsSuffix': {
    en: ' — these credentials will be filled into the proxy outbound.',
    ua: ' — ці дані будуть підставлені у проксі-outbound.',
    ru: ' — эти данные будут подставлены в proxy-outbound.',
  },
  'client.logout': { en: 'Log out', ua: 'Вийти', ru: 'Выйти' },
  'client.pickerLabel': {
    en: 'Credential',
    ua: 'Обліковий запис',
    ru: 'Учётные данные',
  },
  'client.pickerNoFlow': { en: 'empty flow', ua: 'без flow', ru: 'без flow' },

  'region.heading': { en: '2. Region', ua: '2. Регіон', ru: '2. Регион' },
  'region.help': {
    en: 'Picks a routing profile, affecting both the generated `dns` section and (for Ukraine) structural `route` rules ahead of your own. Ukraine resolves domains locally by default, routes lookups whose resolved IP is Russian through the proxy, and routes known CDN ranges direct; Russia resolves locally by default and routes only RKN-blocked domains through the proxy via DNS (matching `route` rules for those aren\'t added automatically — add them above). Default is plain Cloudflare DoH with no region-specific routing.',
    ua: 'Обирає профіль маршрутизації, впливаючи як на згенеровану секцію `dns`, так і (для України) на структурні правила `route` попереду ваших власних. Україна за замовчуванням резолвить домени локально, спрямовує через проксі запити, чия IP-адреса виявляється російською, і напряму спрямовує відомі діапазони CDN; Росія за замовчуванням резолвить локально і спрямовує через проксі лише домени, заблоковані РКН, через DNS (відповідні правила `route` автоматично не додаються — додайте їх вище). Default — це звичайний Cloudflare DoH без маршрутизації по регіону.',
    ru: 'Выбирает профиль маршрутизации, влияя как на сгенерированную секцию `dns`, так и (для Украины) на структурные правила `route` перед вашими собственными. Украина по умолчанию резолвит домены локально, направляет через прокси запросы, чей IP оказывается российским, и направляет известные диапазоны CDN напрямую; Россия по умолчанию резолвит локально и направляет через прокси только домены, заблокированные РКН, через DNS (соответствующие правила `route` автоматически не добавляются — добавьте их выше). Default — это обычный Cloudflare DoH без маршрутизации по региону.',
  },
  'region.label': { en: 'Region', ua: 'Регіон', ru: 'Регион' },
  'region.optionDefault': { en: 'Default (Cloudflare)', ua: 'Default (Cloudflare)', ru: 'Default (Cloudflare)' },
  'region.optionUa': { en: 'Ukraine', ua: 'Україна', ru: 'Украина' },
  'region.optionRu': { en: 'Russia', ua: 'Росія', ru: 'Россия' },

  'multiplex.heading': { en: '3. Multiplexing (mux)', ua: '3. Мультиплексування (mux)', ru: '3. Мультиплексирование (mux)' },
  'multiplex.help': {
    en: "Bundles proxy connections over fewer physical TLS sessions — useful if your ISP caps concurrent TLS connections to one host. Enabling it removes the proxy outbound's flow (xtls-rprx-vision), since Vision and mux can't be combined.",
    ua: 'Об’єднує проксі-з’єднання в меншу кількість фізичних TLS-сесій — корисно, якщо провайдер обмежує кількість одночасних TLS-з’єднань до одного хоста. Вмикання прибирає flow (xtls-rprx-vision) з проксі-outbound, оскільки Vision і mux не можна поєднувати.',
    ru: 'Объединяет прокси-соединения в меньшее число физических TLS-сессий — полезно, если провайдер ограничивает количество одновременных TLS-соединений к одному хосту. Включение убирает flow (xtls-rprx-vision) с proxy-outbound, поскольку Vision и mux нельзя сочетать.',
  },
  'multiplex.enable': { en: 'Enable multiplexing', ua: 'Увімкнути мультиплексування', ru: 'Включить мультиплексирование' },
  'multiplex.protocol': { en: 'Protocol', ua: 'Протокол', ru: 'Протокол' },
  'multiplex.maxConnections': { en: 'Max connections', ua: 'Макс. з’єднань', ru: 'Макс. соединений' },
  'multiplex.minStreams': { en: 'Min streams', ua: 'Мін. потоків', ru: 'Мин. потоков' },
  'multiplex.padding': { en: 'Padding', ua: 'Padding', ru: 'Padding' },

  'configPaste.heading': { en: '4. Base config.json', ua: '4. Базовий config.json', ru: '4. Базовый config.json' },
  'configPaste.helpPart1': {
    en: 'Paste your existing sing-box client config, or start from the default template below and edit it directly. Only the ',
    ua: 'Вставте наявний клієнтський конфіг sing-box або почніть із шаблону за замовчуванням нижче та редагуйте його напряму. Змінюється лише секція ',
    ru: 'Вставьте существующий клиентский конфиг sing-box или начните с шаблона по умолчанию ниже и редактируйте его напрямую. Меняется только секция ',
  },
  'configPaste.helpPart2': {
    en: " section (and the selected proxy outbound's credentials, if a client is picked above) will be changed — everything else passes through untouched. A ",
    ua: " (і дані обраного проксі-outbound, якщо клієнта вибрано вище) — все інше залишається без змін. Правило ",
    ru: " (и данные выбранного proxy-outbound, если клиент выбран выше) — всё остальное остаётся без изменений. Правило ",
  },
  'configPaste.helpPart3': {
    en: ' rule and a DNS-hijack rule are always added ahead of your rules, since domain-based matching needs them to see anything at all.',
    ua: ' та правило перехоплення DNS завжди додаються перед вашими правилами, оскільки без них зіставлення за доменом взагалі нічого не бачить.',
    ru: ' и правило перехвата DNS всегда добавляются перед вашими правилами, поскольку без них сопоставление по домену вообще ничего не видит.',
  },
  'configPaste.placeholder': {
    en: '{ ... paste your sing-box config.json here ... }',
    ua: '{ ... вставте сюди ваш sing-box config.json ... }',
    ru: '{ ... вставьте сюда ваш sing-box config.json ... }',
  },
  'configPaste.reset': { en: 'Reset to default template', ua: 'Скинути до шаблону за замовчуванням', ru: 'Сбросить к шаблону по умолчанию' },

  'ruleSets.heading': { en: 'Rule sets (geosite / geoip)', ua: 'Набори правил (geosite / geoip)', ru: 'Наборы правил (geosite / geoip)' },
  'ruleSets.help': {
    en: 'Reusable remote rule sets, sourced from the sing-geosite/sing-geoip .srs releases. Rules below can match against any rule set defined here.',
    ua: 'Багаторазові віддалені набори правил із релізів .srs sing-geosite/sing-geoip. Правила нижче можуть посилатися на будь-який набір, визначений тут.',
    ru: 'Многоразовые удалённые наборы правил из релизов .srs sing-geosite/sing-geoip. Правила ниже могут ссылаться на любой набор, определённый здесь.',
  },
  'ruleSets.categorySource': { en: 'Category source', ua: 'Джерело категорії', ru: 'Источник категории' },
  'ruleSets.categoryName': { en: 'Category name', ua: 'Назва категорії', ru: 'Название категории' },
  'ruleSets.categoryPlaceholder': { en: 'netflix, cn, private, ...', ua: 'netflix, cn, private, ...', ru: 'netflix, cn, private, ...' },
  'ruleSets.add': { en: 'Add', ua: 'Додати', ru: 'Добавить' },
  'ruleSets.advanced': { en: 'Advanced: custom rule set URL', ua: 'Додатково: власний URL набору правил', ru: 'Дополнительно: собственный URL набора правил' },
  'ruleSets.tag': { en: 'Tag', ua: 'Тег', ru: 'Тег' },
  'ruleSets.tagPlaceholder': { en: 'my-custom-set', ua: 'my-custom-set', ru: 'my-custom-set' },
  'ruleSets.kind': { en: 'Kind', ua: 'Тип', ru: 'Тип' },
  'ruleSets.kindGeosite': { en: 'geosite (domain-based)', ua: 'geosite (за доменами)', ru: 'geosite (по доменам)' },
  'ruleSets.kindGeoip': { en: 'geoip (IP-based)', ua: 'geoip (за IP)', ru: 'geoip (по IP)' },
  'ruleSets.format': { en: 'Format', ua: 'Формат', ru: 'Формат' },
  'ruleSets.url': { en: 'URL', ua: 'URL', ru: 'URL' },
  'ruleSets.urlPlaceholder': { en: 'https://.../custom.srs', ua: 'https://.../custom.srs', ru: 'https://.../custom.srs' },
  'ruleSets.removeAria': { en: 'Remove {tag}', ua: 'Видалити {tag}', ru: 'Удалить {tag}' },

  'ruleList.heading': { en: '5. Routing rules', ua: '5. Правила маршрутизації', ru: '5. Правила маршрутизации' },
  'ruleList.help': {
    en: 'Matched top to bottom — the first matching rule wins. Drag the handle to reorder.',
    ua: 'Перевіряються згори вниз — перемагає перше правило, що збіглося. Перетягніть маркер, щоб змінити порядок.',
    ru: 'Проверяются сверху вниз — побеждает первое совпавшее правило. Перетащите маркер, чтобы изменить порядок.',
  },
  'ruleList.empty': { en: 'No rules yet.', ua: 'Правил ще немає.', ru: 'Правил пока нет.' },
  'ruleList.addRule': { en: '+ Add rule', ua: '+ Додати правило', ru: '+ Добавить правило' },

  'ruleCard.deleteRule': { en: 'Delete rule', ua: 'Видалити правило', ru: 'Удалить правило' },
  'ruleCard.noConditions': {
    en: "No conditions yet — this rule won't be included in the output.",
    ua: 'Умов ще немає — це правило не потрапить у результат.',
    ru: 'Условий ещё нет — это правило не попадёт в результат.',
  },
  'ruleCard.addCondition': { en: '+ Add condition', ua: '+ Додати умову', ru: '+ Добавить условие' },
  'ruleCard.modeSimple': { en: 'Simple', ua: 'Простий', ru: 'Простое' },
  'ruleCard.modeLogical': { en: 'Logical (AND/OR)', ua: 'Логічний (AND/OR)', ru: 'Логическое (AND/OR)' },
  'ruleCard.logicalAnd': { en: 'AND', ua: 'AND', ru: 'AND' },
  'ruleCard.logicalOr': { en: 'OR', ua: 'OR', ru: 'OR' },
  'ruleCard.invert': { en: 'Invert', ua: 'Інвертувати', ru: 'Инвертировать' },
  'ruleCard.noBranches': {
    en: "No branches yet — this rule won't be included in the output.",
    ua: 'Гілок ще немає — це правило не потрапить у результат.',
    ru: 'Ветвей ещё нет — это правило не попадёт в результат.',
  },
  'ruleCard.addBranch': { en: '+ Add branch', ua: '+ Додати гілку', ru: '+ Добавить ветку' },
  'ruleCard.branchLabel': { en: 'Branch {index}', ua: 'Гілка {index}', ru: 'Ветка {index}' },
  'ruleCard.removeBranchAria': { en: 'Remove branch', ua: 'Видалити гілку', ru: 'Удалить ветку' },

  'condition.removeAria': { en: 'Remove condition', ua: 'Видалити умову', ru: 'Удалить условие' },
  'condition.matchesAutomatically': { en: 'Matches automatically.', ua: 'Збігається автоматично.', ru: 'Совпадает автоматически.' },
  'condition.noRuleSets': {
    en: 'No rule sets defined yet — add one below.',
    ua: 'Наборів правил ще немає — додайте нижче.',
    ru: 'Наборов правил ещё нет — добавьте ниже.',
  },
  'condition.commaSeparated': { en: '(comma-separated)', ua: '(через кому)', ru: '(через запятую)' },

  'defaultOutbound.heading': { en: '6. Default outbound', ua: '6. Outbound за замовчуванням', ru: '6. Outbound по умолчанию' },
  'defaultOutbound.help': {
    en: "Where traffic goes when no rule above matches. Pick one — there's no implicit default.",
    ua: 'Куди йде трафік, якщо жодне правило вище не збіглося. Оберіть одне — неявного значення за замовчуванням немає.',
    ru: 'Куда идёт трафик, если ни одно правило выше не совпало. Выберите один — неявного значения по умолчанию нет.',
  },

  'common.direct': { en: 'Direct', ua: 'Напряму', ru: 'Напрямую' },
  'common.proxy': { en: 'Proxy', ua: 'Проксі', ru: 'Прокси' },
  'common.reject': { en: 'Reject', ua: 'Відхилити', ru: 'Отклонить' },

  'output.heading': { en: '7. Output', ua: '7. Результат', ru: '7. Результат' },
  'output.emptyState': {
    en: 'Paste a valid config above to see the output.',
    ua: 'Вставте коректний конфіг вище, щоб побачити результат.',
    ru: 'Вставьте корректный конфиг выше, чтобы увидеть результат.',
  },
  'output.download': { en: 'Download config.json', ua: 'Завантажити config.json', ru: 'Скачать config.json' },
  'output.copy': { en: 'Copy to clipboard', ua: 'Скопіювати', ru: 'Скопировать' },
  'output.copied': { en: 'Copied!', ua: 'Скопійовано!', ru: 'Скопировано!' },
  'output.showComments': {
    en: 'Show comments (display only — Copy/Download stay comment-free)',
    ua: 'Показати коментарі (лише для перегляду — Копіювання/Завантаження без коментарів)',
    ru: 'Показать комментарии (только для просмотра — Копирование/Скачивание без комментариев)',
  },

  'warnings.noDirect': {
    en: 'No direct outbound selected — rules using "Direct" will reference an empty tag.',
    ua: 'Не вибрано direct-outbound — правила з дією "Напряму" посилатимуться на порожній тег.',
    ru: 'Не выбран direct-outbound — правила с действием "Напрямую" будут ссылаться на пустой тег.',
  },
  'warnings.noProxy': {
    en: 'No proxy outbound selected — rules using "Proxy" will reference an empty tag.',
    ua: 'Не вибрано proxy-outbound — правила з дією "Проксі" посилатимуться на порожній тег.',
    ru: 'Не выбран proxy-outbound — правила с действием "Прокси" будут ссылаться на пустой тег.',
  },
  'warnings.emptyRules': {
    en: 'One or more rules have no conditions and will be dropped from the output.',
    ua: 'Одне або кілька правил не мають умов і будуть відкинуті з результату.',
    ru: 'Одно или несколько правил не имеют условий и будут отброшены из результата.',
  },

  'importWarnings.heading': {
    en: 'Not imported from pasted config',
    ua: 'Не імпортовано з вставленого конфігу',
    ru: 'Не импортировано из вставленного конфига',
  },
  'importWarnings.help': {
    en: "These route.rule_set / route.rules entries from your pasted config don't map onto the rule builder below and will be dropped from the generated output unless you recreate them manually.",
    ua: 'Ці записи route.rule_set / route.rules із вашого вставленого конфігу не вкладаються в конструктор правил нижче і будуть відкинуті зі згенерованого результату, якщо ви не відтворите їх вручну.',
    ru: 'Эти записи route.rule_set / route.rules из вставленного вами конфига не укладываются в конструктор правил ниже и будут отброшены из сгенерированного результата, если вы не воссоздадите их вручную.',
  },
  'importWarnings.ruleSetsLabel': { en: 'Rule sets:', ua: 'Набори правил:', ru: 'Наборы правил:' },
  'importWarnings.rulesLabel': { en: 'Rules:', ua: 'Правила:', ru: 'Правила:' },

  'condition.domain.label': { en: 'Domain (exact)', ua: 'Домен (точний)', ru: 'Домен (точный)' },
  'condition.domain_suffix.label': { en: 'Domain suffix', ua: 'Суфікс домену', ru: 'Суффикс домена' },
  'condition.domain_keyword.label': { en: 'Domain keyword', ua: 'Ключове слово в домені', ru: 'Ключевое слово в домене' },
  'condition.domain_regex.label': { en: 'Domain regex', ua: 'Regex домену', ru: 'Regex домена' },
  'condition.rule_set.label': { en: 'Rule set (geosite/geoip)', ua: 'Набір правил (geosite/geoip)', ru: 'Набор правил (geosite/geoip)' },
  'condition.rule_set.help': {
    en: 'References a rule set defined below, fetched by sing-box from a remote .srs file.',
    ua: 'Посилається на набір правил, визначений нижче, який sing-box завантажує з віддаленого .srs-файлу.',
    ru: 'Ссылается на набор правил, определённый ниже, который sing-box загружает из удалённого .srs-файла.',
  },
  'condition.ip_cidr.label': { en: 'IP CIDR', ua: 'IP CIDR', ru: 'IP CIDR' },
  'condition.ip_is_private.label': { en: 'Private IP (LAN)', ua: 'Приватний IP (LAN)', ru: 'Приватный IP (LAN)' },
  'condition.ip_is_private.help': {
    en: 'Matches RFC1918/link-local destinations — no values needed, just pick an action.',
    ua: 'Збігається з призначеннями RFC1918/link-local — значення не потрібні, просто оберіть дію.',
    ru: 'Совпадает с адресатами RFC1918/link-local — значения не нужны, просто выберите действие.',
  },
  'condition.port.label': { en: 'Port', ua: 'Порт', ru: 'Порт' },
  'condition.port_range.label': { en: 'Port range', ua: 'Діапазон портів', ru: 'Диапазон портов' },
  'condition.network.label': { en: 'Network', ua: 'Мережа', ru: 'Сеть' },
  'condition.protocol.label': { en: 'Protocol', ua: 'Протокол', ru: 'Протокол' },
  'condition.process_name.label': { en: 'Process name', ua: "Ім'я процесу", ru: 'Имя процесса' },
  'condition.process_name.help': {
    en: 'Only works when sing-box runs as a full local client with OS process-list access. Target platforms: Windows and Linux. On Linux this needs root/CAP_NET_ADMIN — not available on a router or restricted environment.',
    ua: "Працює, лише якщо sing-box запущено як повноцінний локальний клієнт із доступом до списку процесів ОС. Цільові платформи: Windows та Linux. У Linux потрібен root/CAP_NET_ADMIN — недоступно на роутері чи в обмеженому середовищі.",
    ru: 'Работает, только если sing-box запущен как полноценный локальный клиент с доступом к списку процессов ОС. Целевые платформы: Windows и Linux. В Linux нужен root/CAP_NET_ADMIN — недоступно на роутере или в ограниченной среде.',
  },
  'condition.process_path.label': { en: 'Process path', ua: 'Шлях до процесу', ru: 'Путь к процессу' },
  'condition.process_path.help': {
    en: 'Same platform/permission caveat as process name.',
    ua: "Те саме застереження щодо платформи/прав, що й для імені процесу.",
    ru: 'То же предостережение по платформе/правам, что и для имени процесса.',
  },
} as const

export type TranslationKey = keyof typeof DICT

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function t(key: TranslationKey, lang: Lang, vars?: Record<string, string | number>): string {
  let text: string = DICT[key][lang]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(escapeRegExp(`{${name}}`), 'g'), String(value))
    }
  }
  return text
}
