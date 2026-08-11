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
  'client.loggedInAsPrefix': { en: 'Logged in as ', ua: 'Ви увійшли як ', ru: 'Вы вошли как ' },
  'client.loggedInAsSuffix': {
    en: ' — these credentials will be filled into the proxy outbound.',
    ua: ' — ці дані будуть підставлені у проксі-outbound.',
    ru: ' — эти данные будут подставлены в proxy-outbound.',
  },
  'client.logout': { en: 'Log out', ua: 'Вийти', ru: 'Выйти' },
  'client.loginHint': {
    en: "Want your own server address and credentials filled in automatically? Log in with your VLESS client's email:uuid. Not required — you can also just paste a config with credentials typed in by hand below.",
    ua: 'Хочете, щоб адресу сервера й дані автоматично підставились? Увійдіть за email:uuid вашого VLESS-клієнта. Це не обов’язково — можна просто вставити конфіг із даними, вписаними вручну, нижче.',
    ru: 'Хотите, чтобы адрес сервера и данные подставились автоматически? Войдите по email:uuid вашего VLESS-клиента. Это не обязательно — можно просто вставить конфиг с данными, вписанными вручную, ниже.',
  },
  'client.login': { en: 'Log in', ua: 'Увійти', ru: 'Войти' },
  'client.generateHint': {
    en: "Don't have credentials yet?",
    ua: 'Ще немає власних даних?',
    ru: 'Ещё нет своих данных?',
  },
  'client.generateButton': {
    en: 'Generate my credentials',
    ua: 'Згенерувати свої дані',
    ru: 'Сгенерировать свои данные',
  },
  'client.generating': {
    en: 'Generating your credentials…',
    ua: 'Генеруємо ваші дані…',
    ru: 'Генерируем ваши данные…',
  },
  'client.provisioning': {
    en: 'Credentials created — waiting for the server to pick them up. This can take up to a minute; the page will update automatically.',
    ua: 'Дані створено — очікуємо, поки сервер їх підхопить. Це може зайняти до хвилини, сторінка оновиться сама.',
    ru: 'Данные созданы — ждём, пока сервер их подхватит. Это может занять до минуты, страница обновится сама.',
  },
  'client.generateError': {
    en: 'Could not generate credentials — please try again in a moment.',
    ua: 'Не вдалося згенерувати дані — спробуйте ще раз за хвилину.',
    ru: 'Не удалось сгенерировать данные — попробуйте ещё раз через минуту.',
  },
  'client.pickerLabel': {
    en: 'Credential',
    ua: 'Обліковий запис',
    ru: 'Учётные данные',
  },
  'client.pickerNoFlow': { en: 'empty flow', ua: 'без flow', ru: 'без flow' },

  'userMenu.admin': { en: 'Admin panel', ua: 'Адмінка', ru: 'Админка' },

  'header.portal': { en: 'Portal', ua: 'Портал', ru: 'Портал' },

  'region.heading': { en: '2. Region', ua: '2. Регіон', ru: '2. Регион' },
  'region.help': {
    en: 'Picks a routing profile, affecting both the generated `dns` section and (for Ukraine) structural `route` rules ahead of your own. Ukraine resolves domains locally by default, routes lookups whose resolved IP is Russian through the proxy, and routes known CDN ranges direct; Russia resolves locally by default and routes only RKN-blocked domains through the proxy via DNS (matching `route` rules for those aren\'t added automatically — add them above). Default is plain Cloudflare DoH with no region-specific routing. Auto-picked from your interface language until you change it here yourself — after that, language and region no longer follow each other.',
    ua: 'Обирає профіль маршрутизації, впливаючи як на згенеровану секцію `dns`, так і (для України) на структурні правила `route` попереду ваших власних. Україна за замовчуванням резолвить домени локально, спрямовує через проксі запити, чия IP-адреса виявляється російською, і напряму спрямовує відомі діапазони CDN; Росія за замовчуванням резолвить локально і спрямовує через проксі лише домени, заблоковані РКН, через DNS (відповідні правила `route` автоматично не додаються — додайте їх вище). Default — це звичайний Cloudflare DoH без маршрутизації по регіону. Спочатку підбирається автоматично за мовою інтерфейсу, поки ви не зміните його тут самі — після цього мова й регіон більше не пов’язані.',
    ru: 'Выбирает профиль маршрутизации, влияя как на сгенерированную секцию `dns`, так и (для Украины) на структурные правила `route` перед вашими собственными. Украина по умолчанию резолвит домены локально, направляет через прокси запросы, чей IP оказывается российским, и направляет известные диапазоны CDN напрямую; Россия по умолчанию резолвит локально и направляет через прокси только домены, заблокированные РКН, через DNS (соответствующие правила `route` автоматически не добавляются — добавьте их выше). Default — это обычный Cloudflare DoH без маршрутизации по региону. Сначала подбирается автоматически по языку интерфейса, пока вы не смените его здесь сами — после этого язык и регион больше не связаны.',
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

  'configPaste.heading': { en: 'Base config.json', ua: 'Базовий config.json', ru: 'Базовый config.json' },
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

  // Labelled "Basic", not "Simple", to avoid colliding with the unrelated
  // per-rule Simple/Logical toggle (ruleCard.modeSimple) inside Advanced mode.
  'builderMode.simple': { en: 'Basic', ua: 'Базовий', ru: 'Базовый' },
  'builderMode.advanced': { en: 'Advanced', ua: 'Розширено', ru: 'Расширенно' },

  'simpleMode.help': {
    en: 'Search for any service you want to reach through the proxy — results are pulled from SagerNet\'s geosite rule sets, runetfreedom\'s independently maintained mirror of the same categories, and the vernette/rulesets collection (extra AI services, plus Discord/Telegram variants that also cover voice-chat IP ranges). The source is shown next to each result — pick whichever mirror you trust more for a given category, or add both. Picking a service with its own desktop app (Discord, Telegram, ...) also routes that app\'s executable through the proxy automatically. Need finer control (domains, ports, process names, ...)? Switch to Advanced above.',
    ua: 'Знайдіть будь-який сервіс, який потрібно відкрити через проксі, — результати беруться з наборів правил geosite SagerNet, незалежно підтримуваного дзеркала тих самих категорій від runetfreedom і колекції vernette/rulesets (додаткові AI-сервіси, а також варіанти Discord/Telegram, що покривають ще й діапазони IP голосових чатів). Джерело показано біля кожного результату — оберіть дзеркало, якому довіряєте більше для конкретної категорії, або додайте обидва. Вибір сервісу з власним десктопним застосунком (Discord, Telegram тощо) також автоматично спрямовує виконуваний файл цього застосунку через проксі. Потрібен тонший контроль (домени, порти, назви процесів тощо)? Перемкніться на "Розширено" вище.',
    ru: 'Найдите любой сервис, который нужно открыть через прокси, — результаты берутся из наборов правил geosite SagerNet, независимо поддерживаемого зеркала тех же категорий от runetfreedom и коллекции vernette/rulesets (дополнительные AI-сервисы, а также варианты Discord/Telegram, покрывающие ещё и диапазоны IP голосовых чатов). Источник показан рядом с каждым результатом — выберите зеркало, которому больше доверяете для конкретной категории, или добавьте оба. Выбор сервиса с собственным десктопным приложением (Discord, Telegram и т.д.) также автоматически направляет исполняемый файл этого приложения через прокси. Нужен более тонкий контроль (домены, порты, имена процессов и т.д.)? Переключитесь на "Расширенно" выше.',
  },
  'simpleMode.searchPlaceholder': {
    en: 'Search any service (e.g. netflix, claude, whatsapp)…',
    ua: 'Знайдіть будь-який сервіс (напр. netflix, claude, whatsapp)…',
    ru: 'Найдите любой сервис (напр. netflix, claude, whatsapp)…',
  },
  'simpleMode.extraRulesHint': {
    en: '{count} additional rule(s) from your pasted config or Advanced mode also apply, but aren’t shown here — switch to Advanced to review them.',
    ua: '{count} додаткові правила з вашого вставленого конфігу або режиму "Розширено" також діють, але не показані тут — перемкніться на "Розширено", щоб їх переглянути.',
    ru: '{count} дополнительных правил из вашего вставленного конфига или режима "Расширенно" тоже действуют, но не показаны здесь — переключитесь на "Расширенно", чтобы их посмотреть.',
  },

  'ruleList.heading': { en: 'Routing rules', ua: 'Правила маршрутизації', ru: 'Правила маршрутизации' },
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
  'ruleCard.modeHelp': {
    en: 'Simple: all conditions below must match together. Logical: combine independent branches with AND/OR instead.',
    ua: 'Простий: усі умови нижче мають збігтися одночасно. Логічний: замість цього комбінує незалежні гілки через AND/OR.',
    ru: 'Простое: все условия ниже должны совпасть одновременно. Логическое: вместо этого комбинирует независимые ветки через AND/OR.',
  },
  'ruleCard.logicalAnd': { en: 'AND', ua: 'AND', ru: 'AND' },
  'ruleCard.logicalOr': { en: 'OR', ua: 'OR', ru: 'OR' },
  'ruleCard.logicalModeHelp': {
    en: 'AND: every branch must match. OR: matching any one branch is enough.',
    ua: 'AND: кожна гілка має збігтися. OR: достатньо збігу лише однієї гілки.',
    ru: 'AND: должна совпасть каждая ветка. OR: достаточно совпадения хотя бы одной ветки.',
  },
  'ruleCard.invert': { en: 'Invert', ua: 'Інвертувати', ru: 'Инвертировать' },
  'ruleCard.invertHelp': {
    en: "Matches when this rule's conditions do NOT match, instead of when they do.",
    ua: 'Збігається, коли умови цього правила НЕ виконуються, замість того, коли вони виконуються.',
    ru: 'Совпадает, когда условия этого правила НЕ выполняются, вместо того когда выполняются.',
  },
  'ruleCard.actionHelp': {
    en: 'Direct/Proxy route matched traffic through that outbound. Reject immediately drops the connection instead, without using any outbound.',
    ua: 'Напряму/Проксі спрямовують збіглий трафік через цей outbound. Відхилити натомість одразу розриває з’єднання, не використовуючи жодного outbound.',
    ru: 'Напрямую/Прокси направляют совпавший трафик через этот outbound. Отклонить вместо этого сразу разрывает соединение, не используя никакой outbound.',
  },
  'ruleCard.noBranches': {
    en: "No branches yet — this rule won't be included in the output.",
    ua: 'Гілок ще немає — це правило не потрапить у результат.',
    ru: 'Ветвей ещё нет — это правило не попадёт в результат.',
  },
  'ruleCard.addBranch': { en: '+ Add branch', ua: '+ Додати гілку', ru: '+ Добавить ветку' },
  'ruleCard.branchLabel': { en: 'Branch {index}', ua: 'Гілка {index}', ru: 'Ветка {index}' },
  'ruleCard.branchInvertHelp': {
    en: "Negates only this branch's own match, not the whole rule.",
    ua: 'Заперечує лише збіг цієї конкретної гілки, а не всього правила.',
    ru: 'Отрицает только совпадение этой конкретной ветки, а не всего правила.',
  },
  'ruleCard.removeBranchAria': { en: 'Remove branch', ua: 'Видалити гілку', ru: 'Удалить ветку' },

  'condition.removeAria': { en: 'Remove condition', ua: 'Видалити умову', ru: 'Удалить условие' },
  'condition.matchesAutomatically': { en: 'Matches automatically.', ua: 'Збігається автоматично.', ru: 'Совпадает автоматически.' },
  'condition.noRuleSets': {
    en: 'No rule sets defined yet — add one below.',
    ua: 'Наборів правил ще немає — додайте нижче.',
    ru: 'Наборов правил ещё нет — добавьте ниже.',
  },
  'condition.commaSeparated': { en: '(comma-separated)', ua: '(через кому)', ru: '(через запятую)' },

  'defaultOutbound.heading': { en: 'Default outbound', ua: 'Outbound за замовчуванням', ru: 'Outbound по умолчанию' },
  'defaultOutbound.help': {
    en: "Where traffic goes when no rule above matches. Pick one — there's no implicit default.",
    ua: 'Куди йде трафік, якщо жодне правило вище не збіглося. Оберіть одне — неявного значення за замовчуванням немає.',
    ru: 'Куда идёт трафик, если ни одно правило выше не совпало. Выберите один — неявного значения по умолчанию нет.',
  },

  'common.direct': { en: 'Direct', ua: 'Напряму', ru: 'Напрямую' },
  'common.proxy': { en: 'Proxy', ua: 'Проксі', ru: 'Прокси' },
  'common.reject': { en: 'Reject', ua: 'Відхилити', ru: 'Отклонить' },

  'output.heading': { en: 'Output', ua: 'Результат', ru: 'Результат' },
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
  'output.trayRunnerHint': {
    en: 'Recommended way to run this config:',
    ua: 'Рекомендований спосіб запустити цей конфіг:',
    ru: 'Рекомендуемый способ запустить этот конфиг:',
  },

  'savedConfigs.heading': { en: 'Saved configs', ua: 'Збережені конфіги', ru: 'Сохранённые конфиги' },
  'savedConfigs.help': {
    en: 'Save the current output to your account (up to {max} — saving past the limit removes the oldest one).',
    ua: 'Збережіть поточний результат у свій акаунт (до {max} — після ліміту найстаріший видаляється).',
    ru: 'Сохраните текущий результат в свой аккаунт (до {max} — после лимита старейший удаляется).',
  },
  'savedConfigs.loginHint': {
    en: 'Log in to save generated configs to your account and download them later.',
    ua: 'Увійдіть, щоб зберігати згенеровані конфіги у свій акаунт і завантажувати їх пізніше.',
    ru: 'Войдите, чтобы сохранять сгенерированные конфиги в свой аккаунт и скачивать их позже.',
  },
  'savedConfigs.saveButton': { en: 'Save current config', ua: 'Зберегти поточний конфіг', ru: 'Сохранить текущий конфиг' },
  'savedConfigs.saving': { en: 'Saving…', ua: 'Зберігаємо…', ru: 'Сохраняем…' },
  'savedConfigs.empty': {
    en: 'No saved configs yet.',
    ua: 'Ще немає збережених конфігів.',
    ru: 'Пока нет сохранённых конфигов.',
  },
  // "Load" (not "Завантажити"/"Загрузить") for loading into the base-config
  // box below — those words already mean "Download" in this same row.
  'savedConfigs.load': { en: 'Load', ua: 'Відкрити', ru: 'Открыть' },
  'savedConfigs.download': { en: 'Download', ua: 'Завантажити', ru: 'Скачать' },
  'savedConfigs.delete': { en: 'Delete', ua: 'Видалити', ru: 'Удалить' },

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
  'condition.domain.help': {
    en: 'Exact match only — does not include subdomains (use domain suffix for that).',
    ua: 'Лише точний збіг — не включає піддомени (для цього використайте суфікс домену).',
    ru: 'Только точное совпадение — не включает поддомены (для этого используйте суффикс домена).',
  },
  'condition.domain_suffix.label': { en: 'Domain suffix', ua: 'Суфікс домену', ru: 'Суффикс домена' },
  'condition.domain_suffix.help': {
    en: 'Matches the domain itself and any of its subdomains, e.g. example.com also matches sub.example.com.',
    ua: 'Збігається із самим доменом і будь-якими його піддоменами, напр. example.com також збігається з sub.example.com.',
    ru: 'Совпадает с самим доменом и любыми его поддоменами, напр. example.com совпадает и с sub.example.com.',
  },
  'condition.domain_keyword.label': { en: 'Domain keyword', ua: 'Ключове слово в домені', ru: 'Ключевое слово в домене' },
  'condition.domain_keyword.help': {
    en: 'Matches if this text appears anywhere in the domain name.',
    ua: 'Збігається, якщо цей текст трапляється будь-де в імені домену.',
    ru: 'Совпадает, если этот текст встречается где-либо в имени домена.',
  },
  'condition.domain_regex.label': { en: 'Domain regex', ua: 'Regex домену', ru: 'Regex домена' },
  'condition.domain_regex.help': {
    en: "Matched against the full domain name using Go's RE2 regex syntax.",
    ua: 'Зіставляється з повним іменем домену за синтаксисом регулярних виразів Go (RE2).',
    ru: 'Сопоставляется с полным именем домена по синтаксису регулярных выражений Go (RE2).',
  },
  'condition.rule_set.label': { en: 'Rule set (geosite/geoip)', ua: 'Набір правил (geosite/geoip)', ru: 'Набор правил (geosite/geoip)' },
  'condition.rule_set.help': {
    en: 'References a rule set defined below, fetched by sing-box from a remote .srs file.',
    ua: 'Посилається на набір правил, визначений нижче, який sing-box завантажує з віддаленого .srs-файлу.',
    ru: 'Ссылается на набор правил, определённый ниже, который sing-box загружает из удалённого .srs-файла.',
  },
  'condition.ip_cidr.label': { en: 'IP CIDR', ua: 'IP CIDR', ru: 'IP CIDR' },
  'condition.ip_cidr.help': {
    en: 'Matches destination IPs in this range (e.g. 10.0.0.0/24) or an exact single IP.',
    ua: 'Збігається з IP призначення в цьому діапазоні (напр. 10.0.0.0/24) або з окремою IP-адресою.',
    ru: 'Совпадает с IP назначения в этом диапазоне (напр. 10.0.0.0/24) или с отдельным IP-адресом.',
  },
  'condition.ip_is_private.label': { en: 'Private IP (LAN)', ua: 'Приватний IP (LAN)', ru: 'Приватный IP (LAN)' },
  'condition.ip_is_private.help': {
    en: 'Matches RFC1918/link-local destinations — no values needed, just pick an action.',
    ua: 'Збігається з призначеннями RFC1918/link-local — значення не потрібні, просто оберіть дію.',
    ru: 'Совпадает с адресатами RFC1918/link-local — значения не нужны, просто выберите действие.',
  },
  'condition.port.label': { en: 'Port', ua: 'Порт', ru: 'Порт' },
  'condition.port.help': {
    en: 'Matches an exact destination port, e.g. 443.',
    ua: 'Збігається з точним портом призначення, напр. 443.',
    ru: 'Совпадает с точным портом назначения, напр. 443.',
  },
  'condition.port_range.label': { en: 'Port range', ua: 'Діапазон портів', ru: 'Диапазон портов' },
  'condition.port_range.help': {
    en: 'Matches a destination port range, e.g. 1000:2000 — open-ended ranges like :3000 or 4000: also work.',
    ua: 'Збігається з діапазоном портів призначення, напр. 1000:2000 — відкриті діапазони на кшталт :3000 чи 4000: теж працюють.',
    ru: 'Совпадает с диапазоном портов назначения, напр. 1000:2000 — открытые диапазоны вроде :3000 или 4000: тоже работают.',
  },
  'condition.network.label': { en: 'Network', ua: 'Мережа', ru: 'Сеть' },
  'condition.network.help': {
    en: "Matches the connection's transport protocol.",
    ua: "Збігається з транспортним протоколом з'єднання.",
    ru: 'Совпадает с транспортным протоколом соединения.',
  },
  'condition.protocol.label': { en: 'Protocol', ua: 'Протокол', ru: 'Протокол' },
  'condition.protocol.help': {
    en: 'Matches the application-layer protocol detected by the sniff rule ahead of your own rules.',
    ua: "Збігається з протоколом прикладного рівня, який визначає правило sniff перед вашими правилами.",
    ru: 'Совпадает с протоколом прикладного уровня, который определяет правило sniff перед вашими правилами.',
  },
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
  'condition.process_path_regex.label': {
    en: 'Process path (regex)',
    ua: 'Шлях до процесу (regex)',
    ru: 'Путь к процессу (regex)',
  },
  'condition.process_path_regex.help': {
    en: 'Matches the process path using a regular expression instead of an exact match. Same platform/permission caveat as process name.',
    ua: 'Збігається зі шляхом до процесу за регулярним виразом замість точного збігу. Те саме застереження щодо платформи/прав, що й для імені процесу.',
    ru: 'Совпадает с путём к процессу по регулярному выражению вместо точного совпадения. То же предостережение по платформе/правам, что и для имени процесса.',
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
