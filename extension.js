/* ───────── 테마 스튜디오 v3.13.4 ─────────
   마리나라 색상·타이포그래피를 눈으로 보면서 실시간 수정 → 테마 JSON으로 내보내기.

   동작 원리
   - 현재 적용 중인 테마 CSS(<style id="marinara-custom-theme">)와 엔진 기본
     스타일시트에서 CSS 변수 값을 읽어와 편집기의 시작값으로 쓴다.
   - 사용자가 값을 바꾸면 오버라이드 CSS를 <style id="mts-live-style">로
     head 맨 끝에 꽂는다 → 테마보다 뒤에 있으므로 즉시 화면에 반영.
   - 내보내기 = (현재 테마 CSS 원본 그대로) + (오버라이드 블록) 을 합쳐
     marinara.theme-folder JSON으로 다운로드. 가져와 적용하면 확장 없이 동작.

   v2에서 추가된 것
   - 테마 옵션 자동 감지: 테마가 만든 비(非)색상 변수(--minimal-content-width,
     --translation-line-height 등)를 자동으로 찾아 "테마 옵션" 그룹으로 표시.
     모드(다크/라이트) 공통으로 적용된다.
   - 스타일 포인트(STYLE_GROUPS): CSS 변수가 아니라 특정 요소에 직접 규칙을
     쓰는 컨트롤. 코드블럭 색(엔진에 하드코딩돼 있어 변수로는 못 바꿈)과
     본문 자간·행간·굵기가 여기 해당.
   - 숫자 값 행에는 −/＋ 버튼으로 한 단계씩 조절 가능.

   ★ 마리나라 업데이트로 색상 포인트가 늘어나면 ★
   - CSS 변수라면 GROUPS 배열에 { v: "--변수명", l: "표시 이름" } 한 줄 추가.
   - 특정 요소에 직접 스타일을 써야 하면 STYLE_GROUPS 배열에
     { id, l, selector, prop, type, scope } 한 줄 추가.
   - 임시로는 앱 안의 '변수 직접 추가'로도 대응 가능. */
(() => {
  "use strict";

  const VERSION = "3.13.4";
  const STORAGE_KEY = "mts-state-v1"; // v1 작업 내용을 이어받기 위해 키 유지
  const LIVE_STYLE_ID = "mts-live-style";
  const THEME_STYLE_ID = "marinara-custom-theme";
  // 다크 오버라이드가 라이트 모드를 침범하지 않도록 :not()으로 잠근다.
  const DARK_SEL = ':root:not([data-theme="light"]),\n[data-theme="dark"]';
  const LIGHT_SEL = '[data-theme="light"]';

  /* ═══════════ ① 색상 포인트 (CSS 변수) — 여기에 추가 ═══════════
     v: CSS 변수명 / l: 표시 이름 / h: 짧은 설명(마우스 올리면 표시) */
  const GROUPS = [
    {
      id: "main",
      label: "메인",
      defaultCollapsed: true,
      points: [
        { v: "--background", l: "앱 배경", h: "화면 전체의 기본 배경색" },
        { v: "--foreground", l: "기본 글자", h: "가장 많이 쓰이는 텍스트 색" },
        { v: "--primary", l: "메인 강조", h: "확인 버튼·활성 요소 등 주요 강조색" },
        { v: "--primary-foreground", l: "강조 위 글자", h: "메인 강조색 버튼 안의 글자색" },
        { v: "--marinara-app-accent-solid", l: "앱 포인트", h: "마리나라 곳곳의 포인트 색" },
        { v: "--marinara-app-background-paint", l: "앱 배경 페인트", h: "색을 고르면 단색이 됩니다. 입력칸에 linear-gradient(...) 값을 직접 쓰면 그라디언트도 가능" },
      ],
    },
    // (액센트 펄스 항목은 v3.13.1에서 제거 — 엔진이 '적용된 테마'의 CSS 원문을
    //  텍스트로 읽는 훅이라 미리보기가 불가능해서 이 확장의 컨셉과 맞지 않았다.
    //  원하면 테마 CSS에 직접 "--marinara-theme-accent-pulse: enabled;"를 쓰면 된다.
    //  이때 !important를 붙이면 엔진 파싱이 실패하니 붙이지 말 것)
    {
      id: "surface",
      label: "표면 (카드·팝업)",
      defaultCollapsed: true,
      points: [
        { v: "--card", l: "카드 배경", h: "설정 항목·목록 카드 등의 배경" },
        { v: "--card-foreground", l: "카드 글자" },
        { v: "--popover", l: "팝업 배경", h: "떠오르는 창·메뉴의 배경" },
        { v: "--popover-foreground", l: "팝업 글자" },
        { v: "--secondary", l: "보조 배경", h: "보조 버튼·태그의 배경" },
        { v: "--secondary-foreground", l: "보조 글자" },
        { v: "--muted", l: "흐린 배경", h: "비활성·덜 중요한 영역의 배경" },
        { v: "--muted-foreground", l: "흐린 글자", h: "날짜·설명 등 옅게 보이는 글자" },
        { v: "--accent", l: "호버 배경", h: "마우스를 올렸을 때 배경" },
        { v: "--accent-foreground", l: "호버 글자" },
      ],
    },
    {
      id: "control",
      label: "테두리·입력",
      points: [
        { v: "--border", l: "테두리", h: "카드·구분선 등 일반 테두리" },
        { v: "--input", l: "입력창 배경" },
        { v: "--ring", l: "포커스 링", h: "선택했을 때 생기는 테두리" },
        { v: "--destructive", l: "삭제·경고", h: "삭제 버튼·경고 표시 색" },
        { v: "--destructive-foreground", l: "경고 위 글자" },
        { v: "--marinara-chat-chrome-text", l: "채팅 UI 텍스트 색", h: "입력창·패널·버튼 등 채팅 주변 UI의 글자색 — '설정>모양>채팅 UI 텍스트 색상'과 같은 부분입니다" },
        { v: "--marinara-chat-chrome-accent", l: "채팅 UI 포인트 색", h: "채팅 주변 UI(툴바 버튼·패널 강조)의 포인트 색 — 기본은 '앱 포인트'를 따르고, 여기서 지정하면 채팅 UI만 분리됩니다 (2.4.6 공식 훅)" },
        { v: "--marinara-chat-chrome-surface-bg", l: "채팅 UI 표면색", h: "채팅 주변 패널·버튼의 바탕 표면색 — 기본은 '카드 배경'을 따르고, 호버·버튼 색은 여기서 자동 계산됩니다 (2.4.6 공식 훅)" },
        { v: "--marinara-shell-edge-border", l: "화면 가장자리 테두리", h: "앱 화면 프레임(셸) 가장자리의 테두리 색 (2.4.6 공식 훅)" },
      ],
    },
    {
      id: "sidebar",
      label: "사이드바",
      defaultCollapsed: true,
      points: [
        { v: "--sidebar", l: "사이드바 배경" },
        { v: "--sidebar-foreground", l: "사이드바 글자" },
        { v: "--sidebar-primary", l: "사이드바 강조", h: "사이드바 선택 항목" },
        { v: "--sidebar-primary-foreground", l: "강조 위 글자" },
        { v: "--sidebar-accent", l: "사이드바 호버" },
        { v: "--sidebar-accent-foreground", l: "호버 글자" },
        { v: "--sidebar-border", l: "사이드바 테두리" },
        { v: "--sidebar-ring", l: "사이드바 포커스 링" },
      ],
    },
    {
      id: "logo",
      label: "로고·홈",
      defaultCollapsed: true,
      points: [
        { v: "--mari-logo-cyan", l: "로고 시안", h: "왼쪽 위 로고의 색 ①" },
        { v: "--mari-logo-cyan-deep", l: "로고 시안 (진함)" },
        { v: "--mari-logo-orange", l: "로고 오렌지", h: "왼쪽 위 로고의 색 ②" },
        { v: "--mari-logo-orange-deep", l: "로고 오렌지 (진함)" },
        { v: "--mari-logo-pink", l: "로고 핑크", h: "왼쪽 위 로고의 색 ③" },
        { v: "--mari-logo-pink-deep", l: "로고 핑크 (진함)" },
        { v: "--mari-logo-title-cyan", l: "로고 타이틀 시안", h: "글자 로고(워드마크)에 쓰이는 색 ① (2.4.6 신규)" },
        { v: "--mari-logo-title-orange", l: "로고 타이틀 오렌지", h: "글자 로고(워드마크)에 쓰이는 색 ② (2.4.6 신규)" },
        { v: "--mari-logo-title-pink", l: "로고 타이틀 핑크", h: "글자 로고(워드마크)에 쓰이는 색 ③ (2.4.6 신규)" },
        {
          id: "home-widget-accent",
          l: "홈 위젯 포인트 색",
          h: "홈 화면 카드·바로가기·최근 채팅에 개별로 박힌 포인트 색을 한 색으로 통일합니다",
          type: "color",
          scope: "mode",
          template: [
            {
              selector: '[style*="--home-module-accent"], [style*="--recent-chat-accent"], [style*="--home-chat-mode-accent"], [style*="--shortcut-tone"]',
              decls: { "--home-module-accent": "$C", "--recent-chat-accent": "$C", "--home-chat-mode-accent": "$C", "--shortcut-tone": "$C" },
            },
          ],
        },
      ],
    },
  ];
  // ('슬럽 강조색'은 v3.10.0부터 아래 STYLE_GROUPS의 "누들·슬럽" 그룹으로 이동 —
  //  변수만 바꾸던 예전 방식은 오트밀 계열 테마에서만 동작했기 때문)
  // (KNOWN_VARS 등 파생 목록은 STYLE_GROUPS 아래에서 두 배열을 합쳐 계산)

  /* ═══════════ ② 스타일 포인트 (요소 직접 지정) — 여기에 추가 ═══════════
     엔진에 색이 하드코딩되어 있어 CSS 변수로는 못 바꾸는 것들.
     id: 고유 이름(저장 키) / selector: 대상 요소 / prop: CSS 속성
     type: "color"(색 견본) | "length"(−/＋ 버튼) | "text"(자유 입력)
     scope: "mode"(다크/라이트 별도) | "shared"(모드 공통)
     step/suggest: length 타입의 조절 단위와 첫 클릭 시 시작값 */

  /* ── 슬럽 강조색 템플릿 ──
     슬럽 화면의 강조색은 ① CSS 변수(--noodle-accent)와 ② 클래스 이름에 그대로
     박힌 핑크(#ff7ec1) 두 가지가 섞여 있어서, 둘 다 함께 바꿔야 전부 물든다.
     ②는 투명도 변형(bg-[#ff7ec1]/10 등)이 많아 아래에서 목록으로 생성한다.
     (오트밀 계열 테마의 "슬럽: 클래스에 박제된 hex → 테마 색" 블록과 같은 원리) */
  const SLURP_HEX = "#ff7ec1";
  const slurpMix = (n) => (n == null ? "$C" : `color-mix(in srgb, $C ${n}%, transparent)`);
  const SLURP_TEMPLATE = (() => {
    const rules = [
      // 슬럽 화면 안 공통 변수 + body로 포털되는 슬럽 모달·마법사
      { selector: "marinara-capability-slurp .mari-chrome-token-scope, body > .mari-chrome-token-scope.noodle-icon-scope", decls: { "--noodle-accent": "$C" } },
      { selector: "body > .mari-chrome-token-scope.noodle-icon-scope", decls: { "--primary": "$C", "--accent": "color-mix(in srgb, $C 14%, transparent)" } },
      // 오트밀 계열 테마가 쓰는 훅 변수 — 그런 테마 위에서는 이 한 줄로도 대부분 적용된다
      { selector: ":root", decls: { "--slurp-accent": "$C" } },
    ];
    const add = (cls, prop, n, hover) => rules.push({ selector: `[class~="${cls}"]${hover ? ":hover" : ""}`, decls: { [prop]: slurpMix(n) } });
    // 테두리
    for (const n of [null, 25, 30, 35, 40, 45, 60]) add(`border-[${SLURP_HEX}]${n ? "/" + n : ""}`, "border-color", n);
    add(`hover:border-[${SLURP_HEX}]/40`, "border-color", 40, true);
    rules.push({ selector: `[class~="divide-[${SLURP_HEX}]/20"] > :not(:last-child)`, decls: { "border-color": slurpMix(20) } });
    // 배경
    for (const n of [null, 8, 10, 12, 15, 45]) add(`bg-[${SLURP_HEX}]${n ? "/" + n : ""}`, "background-color", n);
    add(`bg-[${SLURP_HEX}]/[0.06]`, "background-color", 6);
    for (const n of [8, 10, 12]) add(`hover:bg-[${SLURP_HEX}]/${n}`, "background-color", n, true);
    add(`hover:bg-[${SLURP_HEX}]/[0.06]`, "background-color", 6, true);
    // 글자·체크박스
    add(`text-[${SLURP_HEX}]`, "color", null);
    add(`accent-[${SLURP_HEX}]`, "accent-color", null);
    // 그라디언트
    add(`from-[${SLURP_HEX}]`, "--tw-gradient-from", null);
    for (const n of [20, 22]) add(`from-[${SLURP_HEX}]/${n}`, "--tw-gradient-from", n);
    add(`via-[${SLURP_HEX}]/8`, "--tw-gradient-via", 8);
    for (const n of [5, 6, 70]) add(`to-[${SLURP_HEX}]/${n}`, "--tw-gradient-to", n);
    // 그림자·포커스 링
    for (const n of [15, 20, 25, 30]) add(`shadow-[${SLURP_HEX}]/${n}`, "--tw-shadow-color", n);
    add(`hover:shadow-[${SLURP_HEX}]/25`, "--tw-shadow-color", 25, true);
    for (const n of [20, 35, 45]) add(`ring-[${SLURP_HEX}]/${n}`, "--tw-ring-color", n);
    return rules;
  })();

  /* ── 누들·슬럽 "테마 따라가기" 템플릿 ──
     앱이 누들·슬럽 화면(marinara-capability-noodle/slurp) 안에서 --background 등
     기본 변수를 강제로 자기 값으로 리셋한다 → :root 오버라이드·테마가 안 먹는 이유.
     (미니멀 테마에서 누들·슬럽 배경이 안 바뀌던 원인이 바로 이것)
     오트밀 계열은 자기 팔레트 변수(--base 등)를 화면 안에서 !important로 다시
     씌워서 해결하는데, 우리는 어떤 테마 위에서든 동작해야 하므로 2단계로 간다:
     ① :root에서 테마의 최종 값을 거울 변수(--mts-nb-*)로 복사
     ② 화면 안에서 그 거울 변수를 !important로 다시 씌움
     (화면 안에서 var(--background)를 바로 쓰면 자기 자신을 가리켜 무효가 되므로
      반드시 이름이 다른 거울 변수를 거쳐야 한다) */
  const NB_VARS = ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "border", "input", "ring"];
  const NB_SCOPE = "marinara-capability-noodle, marinara-capability-slurp";
  const NB_PORTAL = "body > .mari-chrome-token-scope.noodle-icon-scope"; // body로 포털되는 슬럽 모달·마법사
  const nb = (name) => `var(--mts-nb-${name})`;
  const nbMix = (name, n) => `color-mix(in srgb, ${nb(name)} ${n}%, transparent)`;
  const NB_FOLLOW_RULES = (() => {
    const mirror = {};
    const reset = {};
    for (const v of NB_VARS) {
      mirror[`--mts-nb-${v}`] = `var(--${v})`;
      reset[`--${v}`] = nb(v);
    }
    return [
      { selector: ":root", decls: mirror },
      { selector: NB_SCOPE, decls: reset },
      // 슬럽 모달 포털 — 하드코딩된 다크 색을 테마 값으로 (오트밀의 '슬럽 모달·마법사' 블록과 같은 배치)
      { selector: NB_PORTAL, decls: { "--background": nb("popover"), "--foreground": nb("foreground"), "--muted-foreground": nb("muted-foreground"), "--border": nb("border"), "--card": nb("card"), "--card-foreground": nb("card-foreground"), "--popover": nb("card"), "--popover-foreground": nb("foreground"), "--noodle-divider": nb("border") } },
      // 슬럽 화면의 클래스에 박힌 다크 색들 → 테마 값 (오트밀의 '나머지 하드코딩 어두운 색' 블록)
      { selector: '[class~="border-[#5b3a52]"]', decls: { "border-color": nb("border") } },
      { selector: '[class~="bg-[#5b3a52]"]', decls: { "background-color": nb("accent") } },
      { selector: '[class~="ring-[#5b3a52]"]', decls: { "--tw-ring-color": nb("border") } },
      { selector: '[class~="bg-[#3a2335]/30"]', decls: { "background-color": nbMix("popover", 30) } },
      { selector: '[class~="bg-[#3a2335]/40"]', decls: { "background-color": nbMix("popover", 40) } },
      { selector: '[class~="hover:bg-[#3a2335]"]:hover', decls: { "background-color": nb("popover") } },
      { selector: '[class~="bg-[#17121b]"]', decls: { "background-color": nb("background") } },
      { selector: '[class~="text-[#17121b]"]', decls: { color: nb("foreground") } },
      { selector: '[class~="text-[#d8c9d4]"]', decls: { color: nb("muted-foreground") } },
      { selector: '[class~="text-[#fff7fc]"]', decls: { color: nb("foreground") } },
      { selector: '[class~="hover:text-[#fff7fc]"]:hover', decls: { color: nb("foreground") } },
      // svg 아이콘 색은 !important 유틸리티 클래스라 같은 @layer로 들어가야 이긴다
      { selector: '[class~="[&_svg]:!text-[#17121b]"][class~="[&_svg]:!text-[#17121b]"] svg', decls: { color: nb("foreground") }, layer: "utilities" },
    ];
  })();

  const STYLE_GROUPS = [
    {
      id: "typo",
      label: "타이포그래피·본문 폭",
      // 표시 순서 (항목을 추가하면 여기에도 id를 넣어줄 것 — 없으면 맨 뒤로 감)
      order: ["app-font", "app-font-size", "msg-font-size", "rp-msg-color", "text-stroke-width", "text-stroke-color", "msg-word-break", "msg-letter-spacing", "msg-line-height", "msg-font-weight", "rp-col-width", "rp-input-width", "chat-col-width", "msg-gap", "chat-bottom-space"],
      points: [
        {
          id: "app-font",
          l: "전체 폰트",
          h: "'설정 > 모양 > 폰트'와 같은 부분 — 마리나라 전체의 글꼴을 테마로 강제합니다. 마리나라에 설치된 글꼴, 기기에 설치된 글꼴명을 정확하게 입력해주세요.",
          type: "text",
          scope: "shared",
          template: [{ selector: ":root", decls: { "--font-user": "$C" } }],
        },
        {
          id: "app-font-size",
          l: "전체 글자 크기",
          h: "'설정 > 모양 > 디스플레이 사이즈'와 같은 부분 — 마리나라 전체 글자 크기를 테마로 강제합니다. 엔진 기본 14px",
          selector: ":root",
          prop: "font-size",
          type: "length",
          scope: "shared",
          step: 1,
          suggest: "14px",
          unit: "px",
        },
        {
          id: "msg-font-size",
          l: "본문 글자 크기",
          h: "채팅 본문(.mari-message-content)만의 글자 크기 — UI는 그대로 두고 본문만 조절합니다",
          selector: ".mari-message-content",
          prop: "font-size",
          type: "length",
          scope: "shared",
          step: 1,
          suggest: "15px",
          unit: "px",
        },
        { id: "rp-col-width", l: "RP 본문 폭", h: "RP 글 열의 너비(엔진 기본 58rem). 입력창도 기본적으로 이 값을 따르고, 아래 'RP 입력창 폭'을 지정하면 입력창만 분리됩니다", selector: '[data-chat-mode="roleplay"]', prop: "--mari-roleplay-message-column-width", type: "length", scope: "shared", step: 2, suggest: "58rem", unit: "rem" },
        {
          id: "rp-input-width",
          l: "RP 입력창 폭",
          h: "비워두면 'RP 본문 폭'을 따릅니다",
          type: "length",
          scope: "shared",
          step: 2,
          suggest: "58rem",
          unit: "rem",
          template: [{ selector: '[data-chat-mode="roleplay"] .mari-roleplay-input-column', decls: { width: "min(100%, $C)" } }],
        },
        {
          id: "chat-col-width",
          l: "CONVO 본문·입력창 폭",
          h: "CONVO 내용 구역과 입력창의 너비를 함께 조절합니다. 값을 지우면 초기화",
          type: "length",
          scope: "shared",
          step: 2,
          suggest: "44rem",
          unit: "rem",
          template: [
            // 미니멀 테마와 같은 방식: max-width 대신 width를 직접 min(100%, X)로 고정 — 양방향으로 확실히 움직인다
            { selector: '[data-chat-mode="conversation"] .mari-messages-scroll > *', decls: { width: "min(100%, $C)", "max-width": "none", "margin-inline": "auto" } },
            { selector: '[data-chat-mode="conversation"] .mari-chat-input.chat-input-container', decls: { width: "min(100%, $C)", "max-width": "none", "margin-inline": "auto" } },
            { selector: ":root", decls: { "--minimal-content-width": "$C", "--minimal-message-max-width": "$C" } },
          ],
        },
        { id: "msg-gap", l: "메시지 사이 간격", h: "RP 메시지 사이의 세로 간격", selector: '.mari-messages-scroll > .mari-message, .mari-messages-scroll > [data-component="ConversationMessage.Grouped"], [data-chat-mode="roleplay"] .mari-roleplay-message-row', prop: "margin-bottom", type: "length", scope: "shared", step: 0.25, suggest: "1rem", unit: "rem" },
        {
          id: "chat-bottom-space",
          l: "본문·입력창 사이 여백",
          h: "채팅 내용과 입력창 사이의 여유 공간",
          type: "length",
          scope: "shared",
          step: 0.25,
          suggest: "1rem",
          unit: "rem",
          template: [
            { selector: '[data-chat-mode="conversation"] .mari-chat-input.chat-input-container', decls: { "margin-top": "$C" } },
            { selector: '[data-chat-mode="roleplay"] .mari-messages-scroll', decls: { "padding-bottom": "calc(var(--mari-roleplay-content-padding-bottom, 16px) + $C)" } },
          ],
        },
        { id: "msg-letter-spacing", l: "본문 자간", h: "글자 사이 간격. 예: 0.02em (넓게), -0.01em (좁게)", selector: ".mari-message-content", prop: "letter-spacing", type: "length", scope: "shared", step: 0.01, suggest: "0.01em", unit: "em" },
        { id: "msg-line-height", l: "본문 행간", h: "줄 사이 간격. 예: 1.6em (기본 느낌), 1.8em (넉넉하게)", selector: ".mari-message-content", prop: "line-height", type: "length", scope: "shared", step: 0.05, suggest: "1.6em", unit: "em" },
        { id: "msg-font-weight", l: "본문 굵기", h: "550 같은 중간값은 가변(Variable) 폰트에서만 적용 가능", selector: ".mari-message-content", prop: "font-weight", type: "length", scope: "shared", step: 100, suggest: "400", unit: "" },
        { id: "rp-msg-color", l: "RP 글자색 (강제)", h: "RP 본문 중 일반 글자색을 강제합니다.\n\"대사\" 색상은 '설정 > 일반 > 텍스트 규칙 > 기본 대사 색상'에서 설정 가능.\nCONVO 말풍선 글자색은 확장의 '말풍선 > CONVO 상세 설정'에서 조정 가능", selector: '[data-chat-mode="roleplay"] .mari-message-content', prop: "color", type: "color", scope: "mode" },
        { id: "msg-word-break", l: "본문 줄바꿈 방식", selector: ".mari-message-content", prop: "word-break", type: "select", scope: "shared", choices: [{ v: "keep-all", l: "단어 단위" }, { v: "break-all", l: "글자 단위" }] },
        { id: "text-stroke-width", l: "글자 외곽선 굵기", h: "'설정>모양>외곽선'과 같은 부분입니다. 0px 혹은 '글자 외곽선 색'을 투명으로 지정해서 제외 가능", selector: ".mari-message-content", prop: "-webkit-text-stroke-width", type: "length", scope: "shared", step: 0.1, suggest: "0.5px", unit: "px", extra: { "paint-order": "stroke fill" } },
        { id: "text-stroke-color", l: "글자 외곽선 색", h: "외곽선 굵기가 1px일 때부터 적용됩니다", selector: ".mari-message-content", prop: "-webkit-text-stroke-color", type: "color", scope: "mode" },
      ],
    },
    {
      id: "bubble",
      label: "말풍선",
      defaultCollapsed: true, // 요즘 테마들이 말풍선을 잘 안 쓰는 추세라 기본 접힘
      points: [
        {
          id: "rp-bubble-mode",
          l: "RP 말풍선 표시",
          h: "테마와 상관없이 RP 말풍선을 강제로 켜거나 끕니다",
          type: "choice",
          scope: "shared",
          statusSelector: '[data-chat-mode="roleplay"] .glimmer-bubble-char, [data-chat-mode="roleplay"] .glimmer-bubble, [data-chat-mode="roleplay"] .mari-message-bubble',
          options: [
            {
              value: "on",
              l: "있음",
              rules: [
                { selector: '[data-chat-mode="roleplay"] .glimmer-bubble, [data-chat-mode="roleplay"] .mari-message-bubble, [data-chat-mode="roleplay"] .mari-rp-bubble', decls: { "border-radius": "0.9rem", padding: "0.6rem 0.9rem", "backdrop-filter": "none" } },
                { selector: '[data-chat-mode="roleplay"] .glimmer-bubble-char, [data-chat-mode="roleplay"] .mari-message-bubble', decls: { background: "var(--rp-bubble-char-bg, var(--card))", "background-image": "none", border: "1px solid var(--rp-bubble-border, var(--border))", "box-shadow": "none" } },
                { selector: '[data-chat-mode="roleplay"] .glimmer-bubble-user', decls: { background: "var(--rp-bubble-user-bg, var(--secondary))", "background-image": "none", border: "1px solid var(--rp-bubble-border, var(--border))", "box-shadow": "none" } },
              ],
            },
            {
              value: "off",
              l: "없음",
              rules: [
                { selector: '[data-chat-mode="roleplay"] .mari-message-bubble, [data-chat-mode="roleplay"] .mari-rp-bubble, [data-chat-mode="roleplay"] .glimmer-bubble, [data-chat-mode="roleplay"] .glimmer-bubble-char, [data-chat-mode="roleplay"] .glimmer-bubble-user', decls: { background: "transparent", "background-image": "none", border: "none", "box-shadow": "none", "border-radius": "0", "backdrop-filter": "none", padding: "0.25rem 0.7rem" } },
                { selector: '[data-chat-mode="roleplay"] .glimmer-bubble::before', decls: { display: "none" } },
              ],
            },
          ],
        },
        {
          id: "convo-bubble-mode",
          l: "CONVO 말풍선 표시",
          h: "테마가 지운 CONVO 말풍선을 되살리거나 끕니다. 말풍선 구조 자체는 '설정 > 모양 > 대화 표시 > 채팅 레이아웃'이 '말풍선(버블)'일 때만 생깁니다",
          type: "choice",
          scope: "shared",
          statusSelector: '[data-chat-mode="conversation"] .texting-bubble-other, [data-chat-mode="conversation"] .texting-bubble-user',
          statusNone: "CONVO 화면이 아닙니다",
          screenSelector: '[data-chat-mode="conversation"]',
          statusPrereq: "채팅 레이아웃이 '말풍선(버블)'형이 아닙니다 — '설정 > 모양 > 대화 표시'에서 변경",
          options: [
            {
              value: "on",
              l: "있음",
              rules: [
                { selector: '[data-chat-mode="conversation"] .texting-bubble-user, [data-chat-mode="conversation"] .texting-bubble-other', decls: { "border-radius": "1.1rem", padding: "0.55rem 0.85rem", "box-shadow": "none" } },
                { selector: '[data-chat-mode="conversation"] .texting-bubble-user', decls: { background: "var(--primary)", "background-image": "none", color: "var(--primary-foreground)", border: "none" } },
                { selector: '[data-chat-mode="conversation"] .texting-bubble-other', decls: { background: "var(--card)", "background-image": "none", color: "var(--card-foreground)", border: "1px solid var(--border)" } },
              ],
            },
            {
              value: "off",
              l: "없음",
              rules: [
                { selector: '[data-chat-mode="conversation"] .texting-bubble-user, [data-chat-mode="conversation"] .texting-bubble-other', decls: { background: "transparent", "background-image": "none", border: "none", "box-shadow": "none", "border-radius": "0", padding: "0", "max-width": "none", width: "100%", color: "inherit" } },
              ],
            },
          ],
        },
        { detail: "RP 상세 설정", v: "--rp-bubble-user-bg", l: "내 말풍선 (변수)", h: "테마가 해당 변수를 쓸 때만 적용됩니다. 적용되지 않으면 아래의 '(직접)' 항목에서 조정해 주세요" },
        { detail: "RP 상세 설정", v: "--rp-bubble-char-bg", l: "상대 말풍선 (변수)", h: "테마가 해당 변수를 쓸 때만 적용됩니다" },
        { detail: "RP 상세 설정", v: "--rp-bubble-border", l: "말풍선 테두리 (변수)", h: "테마가 해당 변수를 쓸 때만 적용됩니다" },
        { detail: "RP 상세 설정", id: "bubble-user-bg", l: "내 말풍선 배경 (직접)", h: "테마와 상관없이 항상 우선", selector: '[data-chat-mode="roleplay"] .glimmer-bubble-user', prop: "background", type: "color", scope: "mode", extra: { "background-image": "none" } },
        { detail: "RP 상세 설정", id: "bubble-char-bg", l: "상대 말풍선 배경 (직접)", selector: '[data-chat-mode="roleplay"] .glimmer-bubble-char, [data-chat-mode="roleplay"] .mari-message-bubble', prop: "background", type: "color", scope: "mode", extra: { "background-image": "none" } },
        { detail: "RP 상세 설정", id: "bubble-border-color", l: "말풍선 테두리 (직접)", selector: '[data-chat-mode="roleplay"] .glimmer-bubble-user, [data-chat-mode="roleplay"] .glimmer-bubble-char, [data-chat-mode="roleplay"] .mari-message-bubble', prop: "border-color", type: "color", scope: "mode", extra: { "border-style": "solid", "border-width": "1px" } },
        { detail: "RP 상세 설정", id: "bubble-radius", l: "말풍선 모서리", h: "말풍선 모서리 둥글기", selector: '[data-chat-mode="roleplay"] .glimmer-bubble, [data-chat-mode="roleplay"] .mari-message-bubble, [data-chat-mode="roleplay"] .mari-rp-bubble', prop: "border-radius", type: "length", scope: "shared", step: 0.15, suggest: "0.9rem", unit: "rem" },
        { detail: "RP 상세 설정", v: "--rp-accent-glow", l: "말풍선 글로우", h: "그림자 값이라 색 견본 없이 글자로 수정 (예: 0 0 20px #aabbcc)" },
        {
          detail: "CONVO 상세 설정",
          id: "convo-bubble-spacing",
          l: "CONVO 말풍선 문장 간격",
          h: "'붙이기'는 말풍선 안 문장 사이의 빈 줄을 없애고 한 흐름으로 붙입니다",
          type: "choice",
          scope: "shared",
          statusSelector: '[data-chat-mode="conversation"] .texting-bubble-other, [data-chat-mode="conversation"] .texting-bubble-user',
          statusNone: "CONVO 화면이 아닙니다",
          screenSelector: '[data-chat-mode="conversation"]',
          statusPrereq: "채팅 레이아웃이 '말풍선(버블)'형이 아닙니다",
          statusOn: "말풍선 표시 중",
          statusOff: "말풍선 없음",
          options: [
            {
              value: "tight",
              l: "붙이기",
              rules: [
                { selector: '[data-chat-mode="conversation"] .texting-bubble, [data-chat-mode="conversation"] .texting-bubble .mari-message-content', decls: { "white-space": "normal" } },
              ],
            },
          ],
        },
        { detail: "CONVO 상세 설정", id: "texting-border-color", l: "CONVO 말풍선 테두리", h: "테마가 테두리를 지웠어도 다시 그려집니다", selector: '[data-chat-mode="conversation"] .texting-bubble-user, [data-chat-mode="conversation"] .texting-bubble-other', prop: "border-color", type: "color", scope: "mode", extra: { "border-style": "solid", "border-width": "1px" } },
        { detail: "CONVO 상세 설정", id: "texting-user-fg", l: "CONVO 내 말풍선 글자", h: "내 말풍선 안 글자 전체에 적용됩니다(대사 포함)", selector: '[data-chat-mode="conversation"] .texting-bubble-user, [data-chat-mode="conversation"] .texting-bubble-user *', prop: "color", type: "color", scope: "mode" },
        { detail: "CONVO 상세 설정", id: "texting-other-fg", l: "CONVO 상대 말풍선 글자", h: "상대 말풍선 안 글자 전체에 적용됩니다(대사 포함)", selector: '[data-chat-mode="conversation"] .texting-bubble-other, [data-chat-mode="conversation"] .texting-bubble-other *', prop: "color", type: "color", scope: "mode" },
        { detail: "CONVO 상세 설정", id: "texting-user-bg", l: "CONVO 내 말풍선", selector: '[data-chat-mode="conversation"] .texting-bubble-user', prop: "background", type: "color", scope: "mode", extra: { "background-image": "none" } },
        { detail: "CONVO 상세 설정", id: "texting-other-bg", l: "CONVO 상대 말풍선", selector: '[data-chat-mode="conversation"] .texting-bubble-other', prop: "background", type: "color", scope: "mode", extra: { "background-image": "none" } },
        {
          detail: "RP 상세 설정",
          id: "rp-avatar-mode",
          l: "RP 아바타 표시",
          h: "오트밀 계열 테마는 RP 아바타를 강제로 숨깁니다. 테마와 상관없이 켜거나 끌 수 있어요",
          type: "choice",
          scope: "shared",
          statusSelector: '[data-chat-mode="roleplay"] .mari-message-avatar, [data-chat-mode="roleplay"] .mari-scrollable-roleplay-avatar',
          statusKind: "visible",
          statusOn: "아바타 표시 중",
          statusOff: "아바타 숨김",
          options: [
            {
              value: "on",
              l: "표시",
              rules: [
                { selector: '[data-chat-mode="roleplay"] .mari-message-avatar, [data-chat-mode="roleplay"] .mari-roleplay-avatar-spacer, [data-chat-mode="roleplay"] .mari-scrollable-roleplay-avatar', decls: { display: "flex" } },
                { selector: '[data-chat-mode="roleplay"] .mari-roleplay-message-row, [data-chat-mode="roleplay"] .mari-roleplay-message-row--rect-avatar, [data-chat-mode="roleplay"] .mari-roleplay-message-row--wide', decls: { "--mari-roleplay-avatar-slot": "calc(2.5rem * var(--roleplay-avatar-scale, 1))", "--mari-roleplay-avatar-gap": "0.75rem", "--mari-roleplay-avatar-space": "calc(var(--mari-roleplay-avatar-slot) + var(--mari-roleplay-avatar-gap))" } },
              ],
            },
            {
              value: "off",
              l: "숨김",
              rules: [
                { selector: '[data-chat-mode="roleplay"] .mari-message-avatar, [data-chat-mode="roleplay"] .mari-roleplay-avatar-spacer, [data-chat-mode="roleplay"] .mari-scrollable-roleplay-avatar', decls: { display: "none" } },
                { selector: '[data-chat-mode="roleplay"] .mari-roleplay-message-row, [data-chat-mode="roleplay"] .mari-roleplay-message-row--rect-avatar, [data-chat-mode="roleplay"] .mari-roleplay-message-row--wide', decls: { "--mari-roleplay-avatar-slot": "0rem", "--mari-roleplay-avatar-gap": "0rem", "--mari-roleplay-avatar-space": "0rem", "--mari-roleplay-mobile-avatar-space": "0rem" } },
              ],
            },
          ],
        },
        { detail: "RP 상세 설정", v: "--rp-message-user-bg", l: "내 말풍선 (구버전 변수)", h: "예전 버전 호환용" },
        { detail: "RP 상세 설정", v: "--rp-message-char-bg", l: "상대 말풍선 (구버전 변수)", h: "예전 버전 호환용" },
      ],
    },
    {
      id: "rpbg",
      label: "채팅 배경",
      points: [
        { detail: "RP 상세 설정", v: "--rp-background", l: "RP 채팅 배경색" },
        {
          detail: "RP 상세 설정",
          id: "rp-overlay-mode",
          l: "배경 그라디언트",
          h: "배경 위에 얹히는 그라디언트 오버레이·비네트입니다. RP 채팅에서 미리볼 수 있습니다",
          type: "choice",
          scope: "shared",
          statusSelector: '[data-chat-mode="roleplay"] .rpg-overlay, [data-component="ChatArea.Roleplay"] .rpg-overlay',
          statusOn: "그라디언트 있음",
          statusOff: "그라디언트 없음",
          options: [
            {
              value: "off",
              l: "제거",
              rules: [
                { selector: '[data-chat-mode="roleplay"] .rpg-overlay, [data-component="ChatArea.Roleplay"] .rpg-overlay', decls: { background: "transparent" } },
                { selector: '[data-chat-mode="roleplay"] .rpg-vignette, [data-component="ChatArea.Roleplay"] .rpg-vignette', decls: { background: "transparent" } },
              ],
            },
          ],
        },
        {
          detail: "RP 상세 설정",
          id: "rp-overlay-tint",
          l: "배경 오버레이 색",
          h: "'배경 그라디언트'에 적용되는 색상입니다.",
          type: "color",
          scope: "mode",
          template: [
            {
              selector: '[data-chat-mode="roleplay"] .rpg-overlay, [data-component="ChatArea.Roleplay"] .rpg-overlay',
              decls: {
                background:
                  "linear-gradient(180deg, color-mix(in srgb, $C 55%, transparent) 0%, color-mix(in srgb, $C 40%, transparent) 30%, color-mix(in srgb, $C 45%, transparent) 70%, color-mix(in srgb, $C 60%, transparent) 100%)",
              },
            },
            {
              selector: '[data-chat-mode="roleplay"] .rpg-vignette, [data-component="ChatArea.Roleplay"] .rpg-vignette',
              decls: {
                background: "radial-gradient(ellipse at center, transparent 55%, color-mix(in srgb, $C 30%, transparent) 100%)",
              },
            },
          ],
        },
        {
          detail: "RP 상세 설정",
          id: "rp-bgimage-mode",
          l: "배경 이미지",
          h: "배경 이미지를 숨기고 채팅 배경색만 남깁니다. 그라디언트 제거와 함께 쓰면 완전 단색이 됩니다. RP 채팅에서 미리볼 수 있습니다",
          type: "choice",
          scope: "shared",
          statusSelector: '[data-chat-mode="roleplay"] img.mari-background, [data-component="ChatArea.Roleplay"] img.mari-background',
          statusKind: "image",
          statusOn: "배경 이미지 있음",
          statusOff: "배경 이미지 없음",
          options: [
            {
              value: "off",
              l: "제거",
              rules: [
                { selector: '[data-chat-mode="roleplay"] img.mari-background, [data-component="ChatArea.Roleplay"] img.mari-background', decls: { display: "none" } },
                { selector: '[data-chat-mode="roleplay"] .rpg-chat-area, [data-chat-mode="roleplay"] .mari-chat-area, [data-component="ChatArea.Roleplay"] .mari-chat-area', decls: { background: "var(--rp-background, var(--background))" } },
              ],
            },
          ],
        },
        { detail: "CONVO 상세 설정", v: "--marinara-conversation-gradient-from", l: "CONVO 배경 시작색", h: "CONVO 배경은 두 색이 대각선으로 이어지는 그라디언트입니다(시작→끝). '설정>모양'의 CONVO 그라디언트가 기본값일 때 적용돼요" },
        { detail: "CONVO 상세 설정", v: "--marinara-conversation-gradient-to", l: "CONVO 배경 끝색" },
        { detail: "CONVO 상세 설정", id: "convo-bg-solid", l: "CONVO 배경 단색 (직접)", h: "그라디언트를 없애고 한 가지 색으로 강제합니다. 설정에서 그라디언트를 바꿨어도 항상 우선", selector: '[data-chat-mode="conversation"].mari-chat-area', prop: "background", type: "color", scope: "mode", extra: { "background-image": "none" } },
      ],
    },
    {
      id: "code",
      label: "코드블럭",
      points: [
        { id: "code-bg", l: "코드블럭 배경", selector: ".mari-message-content .mari-md-codeblock", prop: "background", type: "color", scope: "mode" },
        { id: "code-fg", l: "코드블럭 글자", selector: ".mari-message-content .mari-md-codeblock", prop: "color", type: "color", scope: "mode" },
        { id: "code-border", l: "코드블럭 테두리", selector: ".mari-message-content .mari-md-codeblock", prop: "border-color", type: "color", scope: "mode" },
        { id: "code-lang", l: "언어 라벨 글자", h: "코드블럭 오른쪽 위의 언어 이름", selector: ".mari-message-content .mari-md-codeblock-lang", prop: "color", type: "color", scope: "mode" },
        { id: "inline-code-bg", l: "인라인 코드 배경", h: "문장 안 `이런 코드`의 배경", selector: ".mari-message-content .mari-md-inline-code", prop: "background", type: "color", scope: "mode" },
        { id: "inline-code-fg", l: "인라인 코드 글자", selector: ".mari-message-content .mari-md-inline-code", prop: "color", type: "color", scope: "mode" },
        { id: "inline-code-border", l: "인라인 코드 테두리", selector: ".mari-message-content .mari-md-inline-code", prop: "border-color", type: "color", scope: "mode" },
        { id: "code-font-size", l: "코드 글자 크기", h: "본문 대비 비율. 엔진 기본 0.85em", selector: ".mari-message-content .mari-md-codeblock", prop: "font-size", type: "length", scope: "shared", step: 0.05, suggest: "0.85em", unit: "em" },
        { id: "code-line-height", l: "코드 행간", h: "코드블럭 줄 사이 간격. 엔진 기본 1.45em", selector: ".mari-message-content .mari-md-codeblock", prop: "line-height", type: "length", scope: "shared", step: 0.05, suggest: "1.45em", unit: "em" },
        { id: "code-radius", l: "코드블럭 모서리", h: "둥근 정도. 엔진 기본 8px", selector: ".mari-message-content .mari-md-codeblock", prop: "border-radius", type: "length", scope: "shared", step: 1, suggest: "8px", unit: "px" },
        { id: "code-font", l: "코드 글꼴", h: "예: Consolas, monospace — 기기에 설치되어 있거나 마리나라가 로드한 글꼴만 적용됩니다(없는 글꼴은 조용히 무시됨)", selector: ".mari-message-content .mari-md-codeblock, .mari-message-content .mari-md-codeblock *, .mari-message-content .mari-md-inline-code", prop: "font-family", type: "text", scope: "shared" },
        {
          id: "code-wrap-mode",
          l: "코드블럭 줄바꿈",
          h: "긴 코드를 '자동 줄바꿈'으로 접을지, '가로 스크롤'로 한 줄 유지할지 테마와 상관없이 강제합니다",
          type: "choice",
          scope: "shared",
          statusSelector: ".mari-message-content .mari-md-codeblock",
          statusKind: "wrap",
          statusOn: "자동 줄바꿈 중",
          statusOff: "가로 스크롤 중",
          statusNone: "화면에 코드블럭이 없습니다",
          options: [
            {
              value: "wrap",
              l: "자동 줄바꿈",
              rules: [
                { selector: ".mari-message-content .mari-md-codeblock", decls: { "white-space": "pre-wrap", "overflow-wrap": "anywhere", "overflow-x": "hidden" } },
                { selector: ".mari-message-content .mari-md-codeblock code", decls: { "white-space": "inherit" } },
              ],
            },
            {
              value: "scroll",
              l: "가로 스크롤",
              rules: [
                { selector: ".mari-message-content .mari-md-codeblock", decls: { "white-space": "pre", "overflow-wrap": "normal", "overflow-x": "auto" } },
                { selector: ".mari-message-content .mari-md-codeblock code", decls: { "white-space": "inherit" } },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "rpdoc",
      label: "RP 문서",
      defaultCollapsed: true,
      note: "2.4.6부터 추가된 기능 — RP에서 캐릭터가 만드는 쪽지·편지·일지·보고서·포스터('인월드 문서')의 색입니다. 엔진 고정색이라 테마를 따라가지 않을 경우 이곳에서 조정할 수 있습니다. 터미널 스타일 문서는 자체 색(녹색 단말기 느낌)을 그대로 유지합니다.",
      points: [
        {
          id: "rpdoc-paper",
          l: "문서 종이색",
          h: "인월드 문서의 배경(종이) 색",
          type: "color",
          scope: "mode",
          template: [{ selector: ".mari-roleplay-document:not(.mari-roleplay-document--terminal)", decls: { "--mari-document-paper": "$C" } }],
        },
        {
          id: "rpdoc-ink",
          l: "문서 잉크색",
          h: "인월드 문서의 글자색. 괘선·테두리는 이 색에서 자동 계산됩니다",
          type: "color",
          scope: "mode",
          template: [{ selector: ".mari-roleplay-document:not(.mari-roleplay-document--terminal)", decls: { "--mari-document-ink": "$C" } }],
        },
      ],
    },
    {
      id: "noodle",
      label: "누들·슬럽",
      defaultCollapsed: true,
      note: "누들·슬럽 화면은 앱이 배경·카드 등 기본 색을 강제로 자기 값으로 되돌리는 특수 구역이라 일반 항목이 닿지 않습니다. 먼저 '테마 따라가기'를 켜 보고, 세부는 아래 항목으로 조정하세요.",
      points: [
        {
          id: "nb-follow-theme",
          l: "누들·슬럽 화면 테마 맞춤",
          h: "'테마 따라가기'를 켜면 누들·슬럽 화면의 배경·카드·글자·테두리가 현재 테마(이 확장에서 바꾼 색 포함)를 그대로 따라갑니다 — 오트밀 계열 테마가 하는 것과 같은 방식입니다. 미니멀 등 다른 테마에서 누들·슬럽 배경이 안 바뀌는 문제를 해결해요",
          type: "choice",
          scope: "shared",
          statusSelector: NB_SCOPE,
          statusKind: "visible",
          statusNone: "누들·슬럽 화면이 아닙니다",
          statusOn: "누들·슬럽 화면입니다",
          statusOff: "누들·슬럽 화면이 아닙니다",
          options: [{ value: "on", l: "테마 따라가기", rules: NB_FOLLOW_RULES }],
        },
        {
          id: "noodle-accent",
          l: "누들 강조색",
          h: "누들 화면 곳곳의 포인트 색(--noodle-accent)을 바꿉니다. 슬럽 화면도 같은 변수를 쓰므로, 슬럽만 다른 색을 원하면 아래 '슬럽 강조색'을 함께 지정하세요",
          type: "color",
          scope: "mode",
          template: [
            // 오트밀 계열과 같은 방식: 채팅 주변 UI 공통 스코프에 변수만 심으면 된다
            { selector: ".mari-chrome-token-scope", decls: { "--noodle-accent": "$C" } },
            // 누들 모달·팝오버는 인라인 스타일로 기본 파랑을 박아둬서 !important로 눌러줘야 한다
            { selector: "marinara-capability-noodle .mari-modal-panel, marinara-capability-noodle .marinara-chat-popover", decls: { "--noodle-accent": "$C" } },
          ],
        },
        {
          id: "noodle-divider",
          l: "누들 구분선",
          h: "누들·슬럽 화면의 구분선 색(--noodle-divider)",
          type: "color",
          scope: "mode",
          template: [{ selector: ".mari-chrome-token-scope", decls: { "--noodle-divider": "$C" } }],
        },
        {
          id: "slurp-accent-color",
          l: "슬럽 강조색",
          h: "슬럽 화면의 분홍 강조색을 바꿉니다. 변수(--noodle-accent·--slurp-accent)와 화면에 박힌 핑크(#ff7ec1)를 한꺼번에 바꿔서 어떤 테마에서도 적용됩니다",
          type: "color",
          scope: "mode",
          template: SLURP_TEMPLATE,
        },
        /* 직접 지정 — '테마 따라가기'와 무관하게 항상 우선(모드 스코프 셀렉터가 더 구체적이라 이김) */
        {
          detail: "직접 지정",
          id: "nb-bg",
          l: "누들·슬럽 배경 (직접)",
          h: "누들·슬럽 화면의 바탕색을 테마와 상관없이 강제합니다",
          type: "color",
          scope: "mode",
          template: [
            { selector: NB_SCOPE, decls: { "--background": "$C" } },
            { selector: '[class~="bg-[#17121b]"]', decls: { "background-color": "$C" } },
          ],
        },
        {
          detail: "직접 지정",
          id: "nb-card",
          l: "카드·팝업 배경 (직접)",
          h: "누들·슬럽 화면의 카드·입력창·팝업(모달 포함) 배경",
          type: "color",
          scope: "mode",
          template: [
            { selector: NB_SCOPE, decls: { "--card": "$C", "--popover": "$C", "--secondary": "$C", "--muted": "$C", "--input": "$C" } },
            { selector: NB_PORTAL, decls: { "--background": "$C", "--card": "$C", "--popover": "$C" } },
            { selector: '[class~="bg-[#3a2335]/30"]', decls: { "background-color": "color-mix(in srgb, $C 30%, transparent)" } },
            { selector: '[class~="bg-[#3a2335]/40"]', decls: { "background-color": "color-mix(in srgb, $C 40%, transparent)" } },
            { selector: '[class~="hover:bg-[#3a2335]"]:hover', decls: { "background-color": "$C" } },
          ],
        },
        {
          detail: "직접 지정",
          id: "nb-fg",
          l: "누들·슬럽 글자 (직접)",
          h: "기본 글자색을 강제합니다. 흐린 보조 글자는 같은 색의 65% 투명도로 자동 계산돼요",
          type: "color",
          scope: "mode",
          template: [
            { selector: `${NB_SCOPE}, ${NB_PORTAL}`, decls: { "--foreground": "$C", "--card-foreground": "$C", "--popover-foreground": "$C", "--accent-foreground": "$C", "--secondary-foreground": "color-mix(in srgb, $C 65%, transparent)", "--muted-foreground": "color-mix(in srgb, $C 65%, transparent)" } },
            { selector: '[class~="text-[#fff7fc]"]', decls: { color: "$C" } },
            { selector: '[class~="hover:text-[#fff7fc]"]:hover', decls: { color: "$C" } },
            { selector: '[class~="text-[#d8c9d4]"]', decls: { color: "color-mix(in srgb, $C 65%, transparent)" } },
          ],
        },
        {
          detail: "직접 지정",
          id: "nb-border",
          l: "누들·슬럽 테두리 (직접)",
          h: "카드·구분선 등 테두리 색을 강제합니다",
          type: "color",
          scope: "mode",
          template: [
            { selector: `${NB_SCOPE}, ${NB_PORTAL}`, decls: { "--border": "$C" } },
            { selector: '[class~="border-[#5b3a52]"]', decls: { "border-color": "$C" } },
            { selector: '[class~="ring-[#5b3a52]"]', decls: { "--tw-ring-color": "$C" } },
            { selector: '[class~="bg-[#5b3a52]"]', decls: { "background-color": "$C" } },
          ],
        },
      ],
    },
  ];
  // 그룹 안에서 변수 항목({v})과 스타일 항목({selector})을 자유롭게 섞을 수 있다
  const ALL_POINTS = [...GROUPS, ...STYLE_GROUPS].flatMap((g) => g.points);
  const KNOWN_VARS = new Set(ALL_POINTS.filter((p) => p.v).map((p) => p.v));
  // 스타일 항목 = selector가 있는 것 + 선택형(choice) + 템플릿형(template)
  // (choice/template은 selector 대신 규칙 묶음을 가지므로 반드시 여기서 함께 판별할 것)
  const isStylePoint = (p) => !!p.id && (!!p.selector || p.type === "choice" || !!p.template);
  const STYLE_POINT_IDS = new Set(ALL_POINTS.filter(isStylePoint).map((p) => p.id));

  // 패널에 보이는 섹션 순서 — 화면에서 가까운 것끼리 붙어 있게
  const SECTION_ORDER = ["palette", "options", "rpbg", "typo", "bubble", "code", "rpdoc", "control", "main", "surface", "sidebar", "logo", "noodle", "guide", "custom"];

  // 확장이 CSS로 못 잡는 앱 설정 안내 (기본 접힘)
  const GUIDE_SECTION = {
    id: "guide",
    label: "마리나라 설정 메뉴에서 조정하는 것들",
    defaultCollapsed: true,
    guide: {
      intro: "아래 항목들은 이 확장에서 조정하지 못하는 항목입니다. 마리나라 설정 메뉴에서 조정해 주세요.",
      blocks: [
        {
          t: "설정 > 일반 > 텍스트 규칙",
          items: ["따옴표 안의 대사를 굵게 표시", "본문 캐릭터 이름에 색상 적용", "따옴표 스타일 자동 변환"],
        },
        {
          t: "설정 > 모양 > 텍스트 및 배율",
          items: ['기본 대사("") 색상 — 폰트·디스플레이 사이즈는 v3.13부터 타이포그래피 그룹에서 조정 가능'],
        },
        {
          t: "설정 > 모양 > 대화 표시",
          items: ["채팅 레이아웃", "아바타 모양"],
        },
        {
          t: "설정 > 모양 > 분위기",
          items: ["동적 날씨 효과(비, 눈, 안개 등)"],
        },
        {
          t: "설정 > 모양 > 대화 테마",
          items: ["대화 모드 배경 그라데이션"],
        },
        {
          t: "설정 > 모양 > 배경",
          items: ["배경 흐림", "배경 이미지(기본 14종) · 채팅 목록 배경"],
        },
      ],
    },
  };

  const SVG_PALETTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 3-3 3h-2.5a2.5 2.5 0 0 0-1.9 4.1c.4.5.6.9.4 1.4-.3.9-1.5 1.5-3 1.5z"/><circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="17.5" cy="11.5" r="1.2" fill="currentColor" stroke="none"/></svg>';
  const SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const SVG_REFRESH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>';
  const SVG_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  const SVG_UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';
  const SVG_DOWNLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M12 3v12M7 10l5 5 5-5"/></svg>';
  const SVG_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const SVG_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  const SVG_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
  const SVG_CLEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="m6.5 6.5 11 11"/></svg>';
  const SVG_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>';
  const SVG_MIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>';

  /* ══════════ 상태 ══════════ */
  const state = {
    mode: "dark", // 지금 편집 중인 모드 탭
    overrides: { dark: {}, light: {}, shared: {} }, // CSS 변수 { "--변수": "값" }
    styles: { dark: {}, light: {}, shared: {} }, // 스타일 포인트 { id: "값" }
    customVars: [], // 사용자가 직접 추가한 변수명 목록
    collapsed: {}, // 그룹 접힘 여부
    exportName: "내 테마",
    panelPos: null, // 드래그로 옮긴 위치 { left, top }
    panelSize: null, // 크기 조절한 값 { w, h }
  };

  const cleanupFns = [];
  let panelEl = null;
  let launcherEl = null;
  let toastEl = null;
  let toastTimer = 0;
  let saveTimer = 0;
  let refreshTimer = 0;
  let headObserver = null;
  let themeAttrObserver = null;
  let probe = null;
  let panelOpen = false;
  let styleRowSyncs = []; // 스타일 포인트 행들의 시작값 재시도용 sync 함수 목록
  let styleSyncTimer = 0;
  let tipEl = null; // 항목 설명 툴팁
  let tipTimer = 0;
  let resizeObs = null; // 패널 크기 조절 기억용

  // 시트에서 읽어온 변수 값: { dark: {--x: 값}, light: {--x: 값} }
  let varMaps = { dark: {}, light: {} };
  let palettePoints = []; // 활성 테마의 자체 팔레트 변수 (색상, 자동 감지)
  let optionPoints = []; // 활성 테마의 비색상 옵션 변수 (너비·행간 등, 자동 감지)
  let themeHints = {}; // 테마 CSS 주석 → 툴팁

  /* ══════════ 저장/복원 (퀵 팔레트와 같은 패턴) ══════════ */
  function parseRecord(raw) {
    if (!raw) return null;
    try {
      const value = typeof raw === "string" ? JSON.parse(raw) : raw;
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  }

  function sanitizeStringMap(raw, keyOk) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    for (const [k, v] of Object.entries(raw)) {
      if (typeof k === "string" && keyOk(k) && typeof v === "string" && v.trim()) out[k] = v;
    }
    return out;
  }

  const isVarKey = (k) => k.startsWith("--");
  const isStyleKey = (k) => STYLE_POINT_IDS.has(k);

  function adoptState(saved) {
    if (!saved) return;
    if (saved.mode === "light" || saved.mode === "dark") state.mode = saved.mode;
    const ov = parseRecord(saved.overrides);
    if (ov) {
      state.overrides.dark = sanitizeStringMap(ov.dark, isVarKey);
      state.overrides.light = sanitizeStringMap(ov.light, isVarKey);
      state.overrides.shared = sanitizeStringMap(ov.shared, isVarKey);
    }
    const st = parseRecord(saved.styles);
    if (st) {
      state.styles.dark = sanitizeStringMap(st.dark, isStyleKey);
      state.styles.light = sanitizeStringMap(st.light, isStyleKey);
      state.styles.shared = sanitizeStringMap(st.shared, isStyleKey);
    }
    // v3.10.0 마이그레이션: 예전 '--slurp-accent' 변수 항목 → '슬럽 강조색' 스타일 항목
    // (변수만 바꾸던 예전 방식은 오트밀 계열 테마에서만 동작해서 새 항목으로 옮긴다)
    for (const m of ["dark", "light"]) {
      const old = state.overrides[m]["--slurp-accent"];
      if (old) {
        delete state.overrides[m]["--slurp-accent"];
        if (!state.styles[m]["slurp-accent-color"]) state.styles[m]["slurp-accent-color"] = old;
      }
    }
    // v3.13.1 정리: 액센트 펄스 항목 제거에 따라 남아 있을 수 있는 저장값 삭제
    for (const m of ["dark", "light", "shared"]) {
      delete state.overrides[m]["--marinara-theme-accent-pulse-source"];
    }
    delete state.styles.shared["accent-pulse-mode"];
    delete state.styles.shared["accent-pulse-source"];
    if (Array.isArray(saved.customVars)) {
      state.customVars = saved.customVars.filter((v) => typeof v === "string" && /^--[A-Za-z0-9_-]+$/.test(v)).slice(0, 80);
    }
    if (parseRecord(saved.collapsed)) state.collapsed = saved.collapsed;
    if (typeof saved.exportName === "string" && saved.exportName.trim()) state.exportName = saved.exportName.slice(0, 60);
    const pos = parseRecord(saved.panelPos);
    if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) state.panelPos = { left: pos.left, top: pos.top };
    const size = parseRecord(saved.panelSize);
    if (size && Number.isFinite(size.w) && Number.isFinite(size.h)) state.panelSize = { w: size.w, h: size.h };
  }

  async function loadState() {
    let saved = null;
    try {
      saved = parseRecord(localStorage.getItem(STORAGE_KEY));
    } catch {}
    try {
      if (typeof marinara !== "undefined" && marinara?.storage?.get) {
        const ext = parseRecord(await marinara.storage.get());
        const inner = ext && parseRecord(ext[STORAGE_KEY]);
        if (inner) saved = inner;
      }
    } catch {}
    adoptState(saved);
  }

  function snapshotState() {
    return {
      mode: state.mode,
      overrides: state.overrides,
      styles: state.styles,
      customVars: state.customVars,
      collapsed: state.collapsed,
      exportName: state.exportName,
      panelPos: state.panelPos,
      panelSize: state.panelSize,
      version: VERSION,
    };
  }

  function persistNow() {
    const snapshot = snapshotState();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
    try {
      if (typeof marinara !== "undefined" && marinara?.storage?.patch) {
        void marinara.storage.patch({ [STORAGE_KEY]: snapshot });
      }
    } catch {}
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 400);
  }

  /* ══════════ CSS 변수 수집 ══════════
     문서의 모든 스타일시트에서 :root / [data-theme=...] 블록의 --변수 정의를
     문서 순서대로 긁어모은다. 뒤에 나온 정의가 앞의 것을 덮으므로
     실제 브라우저 우선순위와 같은 결과가 된다. */
  function extractVars(cssText) {
    const brace = cssText.indexOf("{");
    const body = brace >= 0 ? cssText.slice(brace + 1) : cssText;
    const out = {};
    const re = /(?:^|[;{\s])--([A-Za-z0-9_-]+)\s*:\s*([^;}]+)/g;
    let m;
    while ((m = re.exec(body))) {
      // 우리가 내보낸 오버라이드를 다시 읽을 때 !important가 값에 섞이지 않게 제거
      out["--" + m[1]] = m[2].replace(/\s*!important\s*$/i, "").trim();
    }
    return out;
  }

  function classifyRule(rule, acc) {
    const sel = rule.selectorText || "";
    const notLight = sel.includes(':not([data-theme="light"]') || sel.includes(":not([data-theme='light']");
    const hasLight = !notLight && (sel.includes('[data-theme="light"]') || sel.includes("[data-theme='light']"));
    const hasDark = sel.includes('[data-theme="dark"]') || sel.includes("[data-theme='dark']") || notLight;
    const hasRoot = /(^|,)\s*(:root|html)\b/.test(sel);
    if (!hasLight && !hasDark && !hasRoot) return;
    const vars = extractVars(rule.cssText || "");
    if (!Object.keys(vars).length) return;
    if (hasLight) Object.assign(acc.light, vars);
    else if (hasDark && hasRoot && !notLight) Object.assign(acc.base, vars); // ":root, [data-theme=dark]" 패턴
    else if (hasDark) Object.assign(acc.dark, vars);
    else Object.assign(acc.base, vars);
  }

  function walkRules(rules, acc) {
    for (const rule of rules) {
      try {
        if (rule.type === 1) {
          classifyRule(rule, acc);
        } else if ((rule.type === 4 || rule.type === 12) && rule.cssRules) {
          // @media / @supports — 지금 화면에 적용 중일 때만 반영
          if (rule.type === 4 && rule.conditionText && !window.matchMedia(rule.conditionText).matches) continue;
          walkRules(rule.cssRules, acc);
        }
      } catch {}
    }
  }

  function collectCssVars() {
    const acc = { base: {}, dark: {}, light: {} };
    for (const sheet of document.styleSheets) {
      const owner = sheet.ownerNode;
      if (owner && owner.id === LIVE_STYLE_ID) continue; // 자기 자신은 제외
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // 접근 불가 시트(외부 등)는 건너뜀
      }
      if (rules) walkRules(rules, acc);
    }
    varMaps = {
      dark: { ...acc.base, ...acc.dark },
      light: { ...acc.base, ...acc.light },
    };
  }

  /* 활성 테마가 정의한 자체 변수 자동 감지.
     - 순수 색상 리터럴 → "테마 팔레트" (다크/라이트 별도 편집)
     - 색이 아닌 값(너비·행간·간격 등) → "테마 옵션" (모드 공통 편집) */
  function isPlainColor(v) {
    return typeof v === "string" && /^(#|rgba?\(|hsla?\(|oklch\(|oklab\(|color\()/i.test(v.trim());
  }

  function isThemeOptionValue(v) {
    if (typeof v !== "string") return false;
    const t = v.trim();
    if (!t || t.length > 120) return false; // 글꼴 스택(--minimal-code-font 등)도 들어오게 넉넉히
    if (isPlainColor(t)) return false;
    if (/^var\(--[A-Za-z0-9_-]+\)$/.test(t)) return false; // 단순 매핑 변수는 제외
    if (/gradient\(/i.test(t) || /^url\(/i.test(t)) return false;
    return true;
  }

  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function detectThemeVars() {
    palettePoints = [];
    optionPoints = [];
    themeHints = {};
    const el = document.getElementById(THEME_STYLE_ID);
    if (!el || !el.sheet) return;
    const acc = { base: {}, dark: {}, light: {} };
    try {
      walkRules(el.sheet.cssRules, acc);
    } catch {
      return;
    }
    const seen = new Set();
    const ordered = [...Object.keys(acc.base), ...Object.keys(acc.dark), ...Object.keys(acc.light)];
    for (const v of ordered) {
      if (seen.has(v) || KNOWN_VARS.has(v)) continue;
      seen.add(v);
      const raw = acc.base[v] ?? acc.dark[v] ?? acc.light[v];
      if (isPlainColor(raw) && palettePoints.length < 40) {
        palettePoints.push({ v, l: v.replace(/^--/, "") });
      } else if (isThemeOptionValue(raw) && optionPoints.length < 40) {
        optionPoints.push({ v, l: v.replace(/^--/, ""), type: "text" });
      }
    }
    // 테마 CSS의 "--x: 값; /* 설명 */" 주석을 툴팁으로 보여준다
    const text = el.textContent || "";
    for (const p of [...palettePoints, ...optionPoints]) {
      const m = text.match(new RegExp(escapeReg(p.v) + "\\s*:[^;]*;[ \\t]*/\\*([^*]*)\\*/"));
      if (m) themeHints[p.v] = m[1].trim();
    }
  }

  /* ══════════ 색상 유틸 ══════════ */
  function ensureProbe() {
    if (probe && probe.isConnected) return probe;
    probe = document.createElement("span");
    probe.style.display = "none";
    probe.setAttribute("aria-hidden", "true");
    // documentElement에 붙여야 :root 변수를 상속받아 var() 값도 해석된다
    document.documentElement.appendChild(probe);
    return probe;
  }

  function resolveVarRefs(value, map, depth = 0) {
    if (typeof value !== "string" || depth > 8) return value;
    return value.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (whole, name, fb) => {
      const next = map[name];
      if (next !== undefined) return resolveVarRefs(next, map, depth + 1);
      if (fb !== undefined) return resolveVarRefs(fb.trim(), map, depth + 1);
      return whole;
    });
  }

  let canvasCtx = null;
  function ensureCanvas() {
    if (canvasCtx) return canvasCtx;
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    canvasCtx = c.getContext("2d", { willReadFrequently: true });
    return canvasCtx;
  }

  // CSS 색 표현 → {r,g,b,a}. 색이 아니면 null. (투명 여부를 구분하기 위해 알파까지)
  function cssToRgba(value, map) {
    if (typeof value !== "string" || !value.trim()) return null;
    const resolved = resolveVarRefs(value, map || {});
    const el = ensureProbe();
    el.style.color = "";
    el.style.color = resolved;
    if (!el.style.color) return null;
    const computed = getComputedStyle(el).color;
    const m = computed.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/);
    if (m) {
      let a = 1;
      if (m[4] !== undefined) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { r: +m[1], g: +m[2], b: +m[3], a };
    }
    // oklch()·lab()·color() 등 rgb가 아닌 표기 → 캔버스에 실제로 칠해 픽셀을 읽는다
    try {
      const ctx = ensureCanvas();
      if (!ctx) return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = computed;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    } catch {
      return null;
    }
  }

  function rgbaToHex(c) {
    const to2 = (n) => Math.max(0, Math.min(255, Math.round(+n))).toString(16).padStart(2, "0");
    return "#" + to2(c.r) + to2(c.g) + to2(c.b);
  }

  function cssToHex(value, map) {
    const c = cssToRgba(value, map);
    return c && c.a > 0 ? rgbaToHex(c) : null;
  }

  /* ══════════ 라이브 미리보기 스타일 ══════════ */
  function ensureLiveStyle() {
    let el = document.getElementById(LIVE_STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = LIVE_STYLE_ID;
      document.head.appendChild(el);
    }
    return el;
  }

  function cleanCssValue(value) {
    // 중괄호·세미콜론이 값에 들어오면 CSS 구조가 깨지므로 잘라낸다
    return String(value).replace(/[{}]/g, "").split(";")[0].replace(/\s*!important\s*$/i, "").trim();
  }

  function cleanEntries(map) {
    return Object.entries(map)
      .map(([k, v]) => [k, cleanCssValue(v)])
      .filter(([, v]) => v);
  }

  function varBlock(mode, selector) {
    const entries = cleanEntries(state.overrides[mode]);
    if (!entries.length) return "";
    return selector + " {\n" + entries.map(([k, v]) => `  ${k}: ${v} !important;`).join("\n") + "\n}\n";
  }

  function findStylePoint(id) {
    // 주의: 선택형(choice) 항목은 selector가 없으므로 isStylePoint로 판별해야 한다
    // (v3.1.0에서 p.selector만 확인해 choice CSS가 통째로 안 나가던 버그의 원인)
    for (const p of ALL_POINTS) if (p.id === id && isStylePoint(p)) return p;
    return null;
  }

  // 셀렉터 앞에 모드 스코프를 붙인다 (쉼표로 나뉜 셀렉터도 각각 처리)
  function scopeSelector(selector, mode) {
    const parts = selector.split(",").map((s) => s.trim()).filter(Boolean);
    if (mode === "dark") {
      return parts
        .map((s) => `:root:not([data-theme="light"]) ${s}, [data-theme="dark"] ${s}`)
        .join(",\n");
    }
    if (mode === "light") {
      return parts.map((s) => `[data-theme="light"] ${s}`).join(",\n");
    }
    return parts.join(",\n");
  }

  function styleBlocks(bucket, mode) {
    const lines = [];
    for (const [id, raw] of cleanEntries(state.styles[bucket])) {
      try {
        emitStylePoint(lines, id, raw, mode);
      } catch (error) {
        // 항목 하나가 잘못돼도 나머지 적용은 살린다 + 원인을 화면에 보여준다
        showToast(`'${id}' 항목 적용 오류: ${error && error.message ? error.message : error}`);
      }
    }
    return lines.join("\n");
  }

  function emitStylePoint(lines, id, raw, mode) {
    {
      const point = findStylePoint(id);
      if (!point) return;
      // 규칙 하나를 CSS 블록으로. rule.layer가 있으면 @layer로 감싼다 —
      // 대상 클래스가 !important 유틸리티(@layer utilities)면 레이어 밖의 important는
      // 레이어 안의 important에 지므로, 같은 레이어로 들어가야 명시도 싸움이 된다.
      // rule.plain이면 !important를 뺀다 — 액센트 펄스처럼 엔진이 화면이 아니라
      // 테마 CSS "텍스트"를 정규식으로 읽는 훅은 "enabled !important"로 읽혀
      // 인식에 실패하므로, 캐스케이드용이 아닌 값은 반드시 plain으로 내보낼 것
      const pushRule = (rule, mapVal) => {
        const imp = rule.plain ? "" : " !important";
        const decls = Object.entries(rule.decls).map(([p, v]) => `  ${p}: ${mapVal(v)}${imp};`);
        const block = `${scopeSelector(rule.selector, mode)} {\n${decls.join("\n")}\n}`;
        lines.push(rule.layer ? `@layer ${rule.layer} {\n${block}\n}` : block);
      };
      if (point.type === "choice") {
        // 선택형: 고른 옵션에 딸린 규칙 묶음을 통째로 내보낸다 (말풍선 켜기/끄기 등)
        const opt = (point.options || []).find((o) => o.value === raw);
        if (!opt) return;
        for (const rule of opt.rules) pushRule(rule, (v) => v);
        return;
      }
      if (point.template) {
        // 템플릿형: 고른 색($C)을 규칙 묶음에 끼워 넣어 내보낸다 (오버레이 색 등)
        for (const rule of point.template) pushRule(rule, (v) => v.split("$C").join(raw));
        return;
      }
      const decls = [`  ${point.prop}: ${raw} !important;`];
      // extra: 값이 지정됐을 때 함께 내보내는 고정 선언 (예: 폭 조절 시 가운데 정렬)
      if (point.extra) {
        for (const [p, v] of Object.entries(point.extra)) decls.push(`  ${p}: ${v} !important;`);
      }
      lines.push(`${scopeSelector(point.selector, mode)} {\n${decls.join("\n")}\n}`);
      // extraVars: 테마(미니멀 등)가 쓰는 폭 변수도 같은 값($C)으로 맞춰준다
      if (point.extraVars) {
        const varDecls = Object.entries(point.extraVars).map(([k, v]) => `  ${k}: ${v.split("$C").join(raw)} !important;`);
        lines.push(`${scopeSelector(":root", mode)} {\n${varDecls.join("\n")}\n}`);
      }
    }
    return lines.join("\n");
  }

  function buildOverrideCss() {
    const parts = [];
    const sharedVars = cleanEntries(state.overrides.shared);
    if (sharedVars.length) {
      parts.push(":root {\n" + sharedVars.map(([k, v]) => `  ${k}: ${v} !important;`).join("\n") + "\n}\n");
    }
    const dark = varBlock("dark", DARK_SEL);
    const light = varBlock("light", LIGHT_SEL);
    if (dark) parts.push(dark);
    if (light) parts.push(light);
    const sharedStyles = styleBlocks("shared", "shared");
    const darkStyles = styleBlocks("dark", "dark");
    const lightStyles = styleBlocks("light", "light");
    if (sharedStyles) parts.push(sharedStyles + "\n");
    if (darkStyles) parts.push(darkStyles + "\n");
    if (lightStyles) parts.push(lightStyles + "\n");
    if (!parts.length) return "";
    return OV_START + " (v" + VERSION + ") ═══ */\n" + parts.join("\n") + "\n" + OV_END;
  }

  // 내보내기를 반복해도 오버라이드 블록이 겹겹이 쌓이지 않도록,
  // 테마 원본에 이미 들어 있는 이전 오버라이드 구간은 걷어낸다.
  const OV_START = "/* ═══ 테마 스튜디오 오버라이드";
  const OV_END = "/* ═══ 테마 스튜디오 오버라이드 끝 ═══ */";
  function stripPreviousOverrides(css) {
    let out = css;
    for (let guard = 0; guard < 10; guard++) {
      const i = out.indexOf(OV_START);
      if (i === -1) break;
      const j = out.indexOf(OV_END, i);
      if (j === -1) break;
      out = (out.slice(0, i) + out.slice(j + OV_END.length)).trim();
    }
    return out;
  }

  function applyLive() {
    try {
      ensureLiveStyle().textContent = buildOverrideCss();
    } catch (error) {
      // 조용히 죽으면 "값을 바꿔도 아무 변화가 없는" 증상이 되므로 반드시 드러낸다
      showToast(`적용 중 오류: ${error && error.message ? error.message : error}`);
    }
    updateOverrideBadges();
  }

  /* head 감시: ① 미리보기 스타일을 항상 맨 끝에 유지(테마보다 뒤에)
     ② 테마가 바뀌면 시작값을 다시 읽는다 */
  function startHeadObserver() {
    headObserver = new MutationObserver((mutations) => {
      let themeTouched = false;
      for (const m of mutations) {
        const t = m.target;
        if (t && (t.id === THEME_STYLE_ID || (t.parentNode && t.parentNode.id === THEME_STYLE_ID))) themeTouched = true;
        for (const n of m.addedNodes || []) if (n.id === THEME_STYLE_ID) themeTouched = true;
        for (const n of m.removedNodes || []) if (n.id === THEME_STYLE_ID) themeTouched = true;
      }
      const live = document.getElementById(LIVE_STYLE_ID);
      if (live && document.head.lastElementChild !== live) document.head.appendChild(live);
      if (themeTouched) scheduleVarRefresh();
    });
    headObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
  }

  function scheduleVarRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      collectCssVars();
      detectThemeVars();
      if (panelOpen) renderRows();
      showToast("테마 변경을 감지해서 시작값을 다시 읽었어요");
    }, 500);
  }

  function refreshVars(silent) {
    collectCssVars();
    detectThemeVars();
    if (panelOpen) renderRows();
    if (!silent) showToast("현재 테마에서 시작값을 다시 읽었어요");
  }

  /* ══════════ 내보내기 ══════════ */
  function buildThemeCss() {
    const el = document.getElementById(THEME_STYLE_ID);
    const base = el ? stripPreviousOverrides((el.textContent || "").trim()) : "";
    const ov = buildOverrideCss().trim();
    return [base, ov].filter(Boolean).join("\n\n");
  }

  function downloadText(text, filename, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function exportThemeJson() {
    const name = (state.exportName || "내 테마").trim() || "내 테마";
    const css = buildThemeCss();
    if (!css) {
      showToast("내보낼 내용이 없어요 — 값을 하나 이상 바꿔주세요");
      return;
    }
    const payload = {
      kind: "marinara.theme-folder",
      version: 1,
      exportedAt: new Date().toISOString(),
      folderName: "Themes",
      themes: [
        {
          path: `Themes/${name}/manifest.json`,
          manifest: { kind: "marinara.theme", version: 1, config: { name, css } },
        },
      ],
    };
    const safe = name.replace(/[\\/:*?"<>|]/g, "_");
    downloadText(JSON.stringify(payload, null, 2), `Marinara_테마_${safe}.json`, "application/json");
    showToast("테마 JSON을 내려받았어요 — 설정 > 테마에서 가져오면 적용돼요");
  }

  async function copyThemeCss() {
    const css = buildThemeCss();
    if (!css) {
      showToast("복사할 내용이 없어요 — 값을 하나 이상 바꿔주세요");
      return;
    }
    try {
      await navigator.clipboard.writeText(css);
      showToast("테마 CSS를 클립보드에 복사했어요");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = css;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        showToast("테마 CSS를 클립보드에 복사했어요");
      } catch {
        showToast("복사에 실패했어요");
      }
      ta.remove();
    }
  }

  /* ══════════ 공용 UI 유틸 ══════════ */
  function h(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  function showToast(message) {
    if (!toastEl) {
      toastEl = h("div", "mts-toast");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("mts-toast--show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl && toastEl.classList.remove("mts-toast--show"), 2600);
  }

  function appMode() {
    const t = document.documentElement.getAttribute("data-theme");
    return t === "light" ? "light" : "dark";
  }

  /* 항목 설명 툴팁 — 브라우저 기본 title은 뜨는 데 오래 걸리고 위치가 까다로워
     행 어디에 올려도 바로 보이는 자체 툴팁을 쓴다 */
  function hideTip() {
    clearTimeout(tipTimer);
    if (tipEl) tipEl.style.display = "none";
  }

  /* ── 하이라이트 반짝임 (👁) ──
     변수 항목: 그 변수를 잠깐 핫핑크로 바꿔서 화면 어디가 변하는지 보여준다.
     스타일 항목: 대상 요소에 핫핑크 외곽선을 잠깐 그린다. */
  let flashEl = null;
  let flashTimers = [];
  function clearFlash() {
    for (const t of flashTimers) clearTimeout(t);
    flashTimers = [];
    flashEl?.remove();
    flashEl = null;
  }

  function flashPoint(point, isStyle) {
    clearFlash();
    // 형광끼 없는 차분한 블루 — 깜빡임(움직임)으로 시선을 끌어서 채도가 낮아도 잘 보인다
    const LOUD = "#6e93c8";
    let css;
    if (!isStyle) {
      // :not(#id)로 명시도를 한껏 올려서 테마·우리 오버라이드까지 전부 이긴다
      css = `:root:not(#mts-a):not(#mts-b) { ${point.v}: ${LOUD} !important; }`;
    } else {
      const sel = point.selector || point.statusSelector || (point.template && point.template[0] && point.template[0].selector);
      if (!sel) return;
      css = `${sel} { outline: 3px solid ${LOUD} !important; outline-offset: -2px !important; }`;
    }
    flashEl = document.createElement("style");
    flashEl.id = "mts-flash-style";
    document.head.appendChild(flashEl);
    const on = () => {
      if (flashEl) flashEl.textContent = css;
    };
    const off = () => {
      if (flashEl) flashEl.textContent = "";
    };
    on();
    // 두 번 깜빡
    flashTimers = [setTimeout(off, 450), setTimeout(on, 650), setTimeout(off, 1100), setTimeout(clearFlash, 1200)];
  }

  function attachTip(row, text) {
    row.addEventListener("mouseenter", () => {
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => {
        if (!row.isConnected) return;
        if (!tipEl) {
          tipEl = h("div", "mts-tip");
          document.body.appendChild(tipEl);
        }
        tipEl.textContent = text;
        tipEl.style.display = "block";
        const r = row.getBoundingClientRect();
        const w = tipEl.offsetWidth;
        const th = tipEl.offsetHeight;
        // 기본은 행 왼쪽 바깥, 공간이 없으면 행 위/아래로
        let left = r.left - w - 10;
        let top = r.top + (r.height - th) / 2;
        if (left < 8) {
          left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
          top = r.top - th - 6;
        }
        if (top < 8) top = r.bottom + 6;
        tipEl.style.left = left + "px";
        tipEl.style.top = Math.min(top, window.innerHeight - th - 8) + "px";
      }, 200);
    });
    row.addEventListener("mouseleave", hideTip);
  }

  /* ══════════ 패널 구성 ══════════ */
  function pointList() {
    // 렌더링할 전체 그룹 목록 — SECTION_ORDER 순서로 정렬해서 보여준다
    const sections = [];
    if (palettePoints.length) {
      sections.push({
        id: "palette",
        label: "테마 팔레트 (자동 감지)",
        scope: "mode",
        note: "테마의 원본 팔레트입니다. 해당 그룹에서 변경하면 연결된 곳이 한번에 적용됩니다. 상세 그룹에서 변경할 경우 해당 항목만 변경됩니다.",
        points: palettePoints,
      });
    }
    if (optionPoints.length) {
      sections.push({ id: "options", label: "테마 옵션 (자동 감지 · 공통)", scope: "shared", points: optionPoints });
    }
    for (const g of GROUPS) sections.push({ ...g });
    for (const g of STYLE_GROUPS) sections.push({ ...g });
    sections.push(GUIDE_SECTION);
    sections.push({
      id: "custom",
      label: "변수 직접 추가",
      scope: "mode",
      points: state.customVars.map((v) => ({ v, l: v.replace(/^--/, ""), removable: true })),
      custom: true,
    });
    sections.sort((a, b) => SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id));
    // 섹션에 order 배열이 있으면 그 순서대로 항목을 정렬 (목록에 없는 항목은 뒤로)
    for (const s of sections) {
      if (!s.order || !s.points) continue;
      const rank = (p) => {
        const i = s.order.indexOf(p.id ?? p.v);
        return i === -1 ? 999 : i;
      };
      s.points = [...s.points].sort((a, b) => rank(a) - rank(b));
    }
    return sections;
  }

  function baseValueFor(varName, mode) {
    let raw = varMaps[mode][varName];
    if (raw === undefined && mode === appMode()) {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (computed) raw = computed;
    }
    return raw;
  }

  // 축약(shorthand) 속성은 계산값 조회가 빈 문자열이 될 수 있어 개별 속성으로 바꿔 읽는다
  const COMPUTED_PROP = {
    background: "background-color",
    "border-color": "border-top-color",
    "border-radius": "border-top-left-radius",
    "margin-inline": "margin-left",
    "padding-inline": "padding-left",
  };

  // 스타일 포인트의 현재 화면 값 (요소가 보일 때만 알 수 있다)
  function styleBaseValue(point) {
    if (!point.selector) {
      // 템플릿형: 첫 규칙의 대상 요소에서 그라디언트의 첫 색을 뽑아 시작값으로 쓴다
      if (point.template && point.template[0]) {
        for (const sel of point.template[0].selector.split(",")) {
          let el = null;
          try {
            el = document.querySelector(sel.trim());
          } catch {}
          if (!el) continue;
          const bgi = getComputedStyle(el).backgroundImage || "";
          const m = bgi.match(/rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\)/);
          if (m) return m[0];
        }
      }
      return undefined; // choice 항목은 단일 계산값이 없다
    }
    let el = null;
    for (const sel of point.selector.split(",")) {
      try {
        el = document.querySelector(sel.trim());
      } catch {}
      if (el) break;
    }
    if (!el) return undefined;
    const computedProp = COMPUTED_PROP[point.prop] || point.prop;
    const v = getComputedStyle(el).getPropertyValue(computedProp).trim();
    return v || undefined;
  }

  // length 타입: 현재 값의 숫자 부분을 step만큼 조절
  function stepValue(current, point, dir) {
    const src = (current || "").trim() || (point.suggest || "");
    const m = src.match(/-?\d*\.?\d+/);
    if (!m) return point.suggest || "";
    const num = +(parseFloat(m[0]) + dir * (point.step || 1)).toFixed(3);
    const unit = src.slice(m.index + m[0].length).trim() || point.unit || "";
    return `${num}${unit}`;
  }

  // 선택형 행 (말풍선 켜기/끄기 등): [기본|있음|없음] 버튼 + 현재 화면 상태 표시
  function buildChoiceRow(point) {
    const key = point.id;
    const row = h("div", "mts-row mts-row--choice");
    row.dataset.key = key;
    row.dataset.label = (point.l + " " + key).toLowerCase();

    const top = h("div", "mts-choice-top");
    const label = h("div", "mts-row-label");
    label.textContent = point.l;
    const chip = h("span", "mts-chip-shared");
    chip.textContent = "공통";
    label.appendChild(chip);
    top.appendChild(label);

    const eye = h("button", "mts-icon-btn mts-row-eye", SVG_EYE);
    eye.type = "button";
    eye.title = "화면 어디에 해당하는지 반짝 표시";
    eye.addEventListener("click", () => flashPoint(point, true));
    top.appendChild(eye);

    const seg = h("div", "mts-choice");
    const buttons = [];
    const makeBtn = (text, value) => {
      const b = h("button", "mts-choice-btn");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", () => {
        if (value === null) delete state.styles.shared[key];
        else state.styles.shared[key] = value;
        applyLive();
        scheduleSave();
        sync();
      });
      buttons.push({ b, value });
      seg.appendChild(b);
      return b;
    };
    makeBtn("기본", null);
    for (const opt of point.options || []) makeBtn(opt.l, opt.value);
    top.appendChild(seg);

    const status = h("div", "mts-row-status");

    function sync() {
      const cur = state.styles.shared[key];
      for (const { b, value } of buttons) {
        b.classList.toggle("mts-choice-btn--active", value === null ? cur === undefined : cur === value);
      }
      row.classList.toggle("mts-row--changed", cur !== undefined);
      // 현재 화면 상태 감지 (요소가 보일 때만)
      const matches = [];
      for (const sel of (point.statusSelector || "").split(",")) {
        try {
          matches.push(...document.querySelectorAll(sel.trim()));
        } catch {}
      }
      if (!matches.length) {
        // 화면은 맞는데 대상 요소가 없으면(예: 콘보인데 레이아웃이 클래식) 이유를 알려준다
        let noneText = point.statusNone || "RP 채팅 화면이 아닙니다";
        if (point.screenSelector && point.statusPrereq) {
          for (const sel of point.screenSelector.split(",")) {
            try {
              if (document.querySelector(sel.trim())) {
                noneText = point.statusPrereq;
                break;
              }
            } catch {}
          }
        }
        status.textContent = "지금 화면: " + noneText;
        return;
      }
      let active;
      if (point.statusKind === "wrap") {
        // 코드블럭 등: 지금 줄바꿈이 허용된 상태인가
        const ws = getComputedStyle(matches[0]).whiteSpace;
        active = ws !== "pre" && ws !== "nowrap";
      } else if (point.statusKind === "visible") {
        // 요소가 존재하고 실제로 보이는가 (아바타 표시 여부 등)
        active = matches.some((el) => getComputedStyle(el).display !== "none");
      } else if (point.statusKind === "image") {
        // <img> 계열: src가 있고 실제로 보이는 이미지가 하나라도 있는가
        active = matches.some((el) => {
          if (!el.getAttribute("src")) return false;
          const cs = getComputedStyle(el);
          return cs.display !== "none" && parseFloat(cs.opacity || "1") > 0;
        });
      } else {
        const cs = getComputedStyle(matches[0]);
        const bg = cssToRgba(cs.backgroundColor, {});
        const borderWidth = parseFloat(cs.borderTopWidth) || 0;
        const hasImage = !!cs.backgroundImage && cs.backgroundImage !== "none";
        active = (bg && bg.a > 0) || borderWidth > 0 || hasImage;
      }
      status.textContent = `지금 화면: ${active ? point.statusOn || "말풍선 있음" : point.statusOff || "말풍선 없음"}`;
    }

    attachTip(row, point.l + (point.h ? "\n\n" + point.h : ""));
    row.appendChild(top);
    row.appendChild(status);
    styleRowSyncs.push(sync);
    sync();
    return row;
  }

  function buildRow(point, section) {
    if (point.type === "choice") return buildChoiceRow(point);
    const isStyle = isStylePoint(point); // 스타일 항목(selector/template) 또는 CSS 변수 항목({v})
    const scope = point.scope || section.scope || "mode";
    const shared = scope === "shared";
    const store = isStyle ? state.styles : state.overrides;
    const key = isStyle ? point.id : point.v;
    const bucket = () => (shared ? "shared" : state.mode);
    const map = varMaps[shared ? appMode() : state.mode];

    let base = isStyle ? styleBaseValue(point) : baseValueFor(key, shared ? appMode() : state.mode);

    const row = h("div", "mts-row");
    row.dataset.key = key;
    row.dataset.label = (point.l + " " + key).toLowerCase();

    // 색 견본 (컬러 피커)
    const swatchWrap = h("span", "mts-swatch-wrap");
    const swatch = document.createElement("input");
    swatch.type = "color";
    swatch.className = "mts-swatch";
    swatchWrap.appendChild(swatch);

    const main = h("div", "mts-row-main");
    const label = h("div", "mts-row-label");
    label.textContent = point.l;
    // 행 어디에 올려도 전체 이름·변수명·설명이 툴팁으로 보인다 (긴 이름 잘림 대응)
    const hint = themeHints[key] || point.h;
    attachTip(row, point.l + "\n" + (isStyle ? `${point.prop} · ${point.selector}` : key) + (hint ? "\n\n" + hint : ""));
    if (shared) {
      const chip = h("span", "mts-chip-shared");
      chip.textContent = "공통";
      chip.title = "다크/라이트 구분 없이 함께 적용돼요";
      label.appendChild(chip);
    }
    const subEl = h("div", "mts-row-var");
    subEl.textContent = isStyle ? point.prop : point.v;
    if (isStyle) subEl.title = point.selector;
    main.appendChild(label);
    main.appendChild(subEl);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "mts-row-input";
    input.spellcheck = false;
    input.placeholder = base !== undefined ? String(base).slice(0, 40) : isStyle ? "(화면에 요소 없음)" : "(기본값)";

    // 숫자만 입력해도 단위가 자동으로 붙는다 (입력칸 오른쪽에 단위 안내 표시)
    const normLen = (v) => (point.type === "length" && point.unit && /^-?\d*\.?\d+$/.test(v) ? v + point.unit : v);
    const inputWrap = h("span", "mts-input-wrap");
    inputWrap.appendChild(input);
    if (point.type === "length" && point.unit) {
      const unitEl = h("span", "mts-input-unit");
      unitEl.textContent = point.unit;
      inputWrap.appendChild(unitEl);
      input.classList.add("mts-row-input--unit");
    }

    // 값이 정해진 항목은 드롭다운으로
    let select = null;
    if (point.type === "select") {
      select = document.createElement("select");
      select.className = "mts-row-select";
      const optDefault = document.createElement("option");
      optDefault.value = "";
      optDefault.textContent = "기본";
      select.appendChild(optDefault);
      for (const c of point.choices || []) {
        const o = document.createElement("option");
        o.value = c.v;
        o.textContent = c.l;
        select.appendChild(o);
      }
      select.addEventListener("change", () => {
        if (select.value) store[bucket()][key] = select.value;
        else delete store[bucket()][key];
        applyLive();
        scheduleSave();
        sync();
      });
      row.classList.add("mts-row--select");
    }

    // length 타입엔 −/＋ 조절 버튼
    let stepWrap = null;
    if (point.type === "length") {
      stepWrap = h("span", "mts-steppers");
      const minus = h("button", "mts-step-btn", "−");
      const plus = h("button", "mts-step-btn", "＋");
      minus.type = "button";
      plus.type = "button";
      const doStep = (dir) => {
        // 처음 누르면 권장 시작값(suggest)을 넣고, 그다음부터 한 단계씩 조절
        const cur = store[bucket()][key];
        const next = cur ? stepValue(cur, point, dir) : point.suggest || "";
        if (!next) return;
        store[bucket()][key] = next;
        input.value = next;
        row.classList.add("mts-row--changed");
        applyLive();
        scheduleSave();
      };
      minus.addEventListener("click", () => doStep(-1));
      plus.addEventListener("click", () => doStep(1));
      stepWrap.appendChild(minus);
      stepWrap.appendChild(plus);
    }

    // 👁 하이라이트: 이 항목이 화면 어디에 쓰이는지 반짝 표시
    const eyeBtn = h("button", "mts-icon-btn mts-row-eye", SVG_EYE);
    eyeBtn.type = "button";
    eyeBtn.title = "화면 어디에 쓰이는지 반짝 표시";
    eyeBtn.addEventListener("click", () => flashPoint(point, isStyle));

    // 색 항목엔 '투명' 버튼 (말풍선·배경을 투명하게 만들 때)
    let clearBtn = null;
    if (!point.type || point.type === "color") {
      clearBtn = h("button", "mts-icon-btn mts-row-clear", SVG_CLEAR);
      clearBtn.type = "button";
      clearBtn.title = "투명으로 만들기 (transparent)";
      clearBtn.addEventListener("click", () => {
        store[bucket()][key] = "transparent";
        applyLive();
        scheduleSave();
        sync();
      });
    }

    const resetBtn = h("button", "mts-icon-btn mts-row-reset", SVG_UNDO);
    resetBtn.type = "button";
    resetBtn.title = "원래 값으로 되돌리기";

    let removeBtn = null;
    if (point.removable) {
      removeBtn = h("button", "mts-icon-btn mts-row-remove", SVG_X);
      removeBtn.type = "button";
      removeBtn.title = "이 변수를 목록에서 제거";
    }

    function sync() {
      // 스타일 포인트는 요소가 나중에 화면에 나타날 수 있으니 매번 다시 읽어본다
      if (isStyle) {
        const fresh = styleBaseValue(point);
        if (fresh !== undefined && fresh !== base) {
          base = fresh;
          input.placeholder = String(base).slice(0, 40);
        }
      }
      const cur = store[bucket()][key];
      if (document.activeElement !== input) input.value = cur ?? "";
      if (select) select.value = cur ?? "";
      // 잘린 값은 마우스를 올리면 전체가 보이게
      input.title = cur ?? (base !== undefined ? String(base) : "");
      const shown = cur ?? base;
      const rgba = point.type === "length" ? null : cssToRgba(shown, map);
      if (rgba && rgba.a > 0) {
        swatch.value = rgbaToHex(rgba);
        swatchWrap.classList.remove("mts-swatch-wrap--off", "mts-swatch-wrap--clear");
      } else if (rgba) {
        // 투명한 색 — 체크무늬만 보여준다
        swatchWrap.classList.add("mts-swatch-wrap--clear");
        swatchWrap.classList.remove("mts-swatch-wrap--off");
      } else {
        swatchWrap.classList.add("mts-swatch-wrap--off");
        swatchWrap.classList.remove("mts-swatch-wrap--clear");
        // 값을 못 읽어도 피커는 열 수 있게 중립색에서 시작
        swatch.value = "#888888";
      }
      row.classList.toggle("mts-row--changed", cur !== undefined);
    }
    if (isStyle) styleRowSyncs.push(sync);

    swatch.addEventListener("input", () => {
      store[bucket()][key] = swatch.value;
      input.value = swatch.value;
      row.classList.add("mts-row--changed");
      applyLive();
      scheduleSave();
    });
    input.addEventListener("input", () => {
      const v = normLen(input.value.trim());
      if (v) store[bucket()][key] = v;
      else delete store[bucket()][key];
      applyLive();
      scheduleSave();
      sync();
    });
    // 입력을 마치면(포커스 이동) 단위가 붙은 최종 값을 칸에 보여준다
    input.addEventListener("change", () => {
      const cur = store[bucket()][key];
      if (cur !== undefined) input.value = cur;
    });
    // 포커스하면 테마 기본값을 실제 텍스트로 채워서 그대로 고칠 수 있게 한다
    // (프로그램으로 넣은 값은 input 이벤트를 일으키지 않아 오버라이드로 저장되지 않음)
    input.addEventListener("focus", () => {
      if (!input.value && base !== undefined) input.value = String(base);
    });
    // 안 고치고 나가면 다시 비워서 '변경 없음' 상태로 되돌린다
    input.addEventListener("blur", () => {
      if (store[bucket()][key] === undefined && input.value.trim() === String(base ?? "").trim()) {
        input.value = "";
      }
    });
    resetBtn.addEventListener("click", () => {
      delete store[bucket()][key];
      sync();
      applyLive();
      scheduleSave();
    });
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        state.customVars = state.customVars.filter((v) => v !== key);
        delete state.overrides.dark[key];
        delete state.overrides.light[key];
        delete state.overrides.shared[key];
        applyLive();
        scheduleSave();
        renderRows();
      });
    }

    row.appendChild(swatchWrap);
    row.appendChild(main);
    row.appendChild(eyeBtn);
    if (stepWrap) row.appendChild(stepWrap);
    row.appendChild(select || inputWrap);
    if (clearBtn) row.appendChild(clearBtn);
    row.appendChild(resetBtn);
    if (removeBtn) row.appendChild(removeBtn);
    sync();
    return row;
  }

  function overrideCountFor(section) {
    if (!section.points) return 0;
    const styleBag = { ...state.styles.dark, ...state.styles.light, ...state.styles.shared };
    const varBag = { ...state.overrides.dark, ...state.overrides.light, ...state.overrides.shared };
    return section.points.reduce((n, p) => n + ((isStylePoint(p) ? styleBag[p.id] : varBag[p.v]) !== undefined ? 1 : 0), 0);
  }

  function totalOverrideCount() {
    return (
      Object.keys(state.overrides.dark).length +
      Object.keys(state.overrides.light).length +
      Object.keys(state.overrides.shared).length +
      Object.keys(state.styles.dark).length +
      Object.keys(state.styles.light).length +
      Object.keys(state.styles.shared).length
    );
  }

  function updateOverrideBadges() {
    if (!panelEl) return;
    const sections = pointList();
    for (const header of panelEl.querySelectorAll("[data-mts-group]")) {
      const section = sections.find((s) => s.id === header.dataset.mtsGroup);
      if (!section) continue;
      const badge = header.querySelector(".mts-group-badge");
      const n = overrideCountFor(section);
      badge.textContent = n ? String(n) : "";
      badge.classList.toggle("mts-group-badge--show", n > 0);
    }
    const counter = panelEl.querySelector(".mts-total-count");
    const total = totalOverrideCount();
    if (counter) counter.textContent = total ? `변경 사항 ${total}개` : "변경 사항이 없습니다";
  }

  // 안내 섹션 (앱 설정으로 조정하는 것들) 렌더링
  function buildGuide(guide) {
    const wrap = h("div", "mts-guide");
    if (guide.intro) {
      const p = h("div", "mts-guide-intro");
      p.textContent = guide.intro;
      wrap.appendChild(p);
    }
    for (const b of guide.blocks || []) {
      const t = h("div", "mts-guide-title");
      t.textContent = b.t;
      wrap.appendChild(t);
      for (const item of b.items || []) {
        const li = h("div", "mts-guide-item");
        li.textContent = "· " + item;
        wrap.appendChild(li);
      }
    }
    return wrap;
  }

  function renderRows() {
    if (!panelEl) return;
    styleRowSyncs = [];
    const body = panelEl.querySelector(".mts-body");
    body.innerHTML = "";

    for (const section of pointList()) {
      const group = h("section", "mts-group");
      const header = h("button", "mts-group-header");
      header.type = "button";
      header.dataset.mtsGroup = section.id;
      header.innerHTML =
        `<span class="mts-group-chevron">${SVG_CHEVRON}</span>` +
        `<span class="mts-group-title"></span>` +
        `<span class="mts-group-badge"></span>`;
      header.querySelector(".mts-group-title").textContent = section.label;

      const rows = h("div", "mts-group-rows");
      if (section.note) {
        const note = h("div", "mts-section-note");
        note.textContent = section.note;
        rows.appendChild(note);
      }
      if (section.guide) {
        rows.appendChild(buildGuide(section.guide));
      } else {
        // detail 라벨이 붙은 항목들은 라벨별 하위 접기("RP 상세 설정" 등) 안으로 들어간다
        const mainPoints = section.points.filter((p) => !p.detail);
        for (const p of mainPoints) rows.appendChild(buildRow(p, section));
        const detailGroups = new Map(); // 라벨 → 항목 목록 (등장 순서 유지)
        for (const p of section.points) {
          if (!p.detail) continue;
          const label = typeof p.detail === "string" ? p.detail : "상세 설정";
          if (!detailGroups.has(label)) detailGroups.set(label, []);
          detailGroups.get(label).push(p);
        }
        for (const [label, pts] of detailGroups) {
          const subKey = section.id + "-detail-" + label;
          const sub = h("div", "mts-subgroup");
          const subHeader = h("button", "mts-subgroup-header");
          subHeader.type = "button";
          subHeader.innerHTML = `<span class="mts-group-chevron">${SVG_CHEVRON}</span><span></span>`;
          subHeader.lastElementChild.textContent = label;
          const subRows = h("div", "mts-subgroup-rows");
          for (const p of pts) subRows.appendChild(buildRow(p, section));
          sub.classList.toggle("mts-subgroup--collapsed", !!(state.collapsed[subKey] ?? true));
          subHeader.addEventListener("click", () => {
            state.collapsed[subKey] = !sub.classList.contains("mts-subgroup--collapsed");
            sub.classList.toggle("mts-subgroup--collapsed", state.collapsed[subKey]);
            scheduleSave();
          });
          sub.appendChild(subHeader);
          sub.appendChild(subRows);
          rows.appendChild(sub);
        }
      }

      if (section.custom) {
        const addRow = h("div", "mts-add-row");
        const addInput = document.createElement("input");
        addInput.type = "text";
        addInput.className = "mts-row-input mts-add-input";
        addInput.placeholder = "--변수명 (예: --glass-bg)";
        addInput.spellcheck = false;
        const addBtn = h("button", "mts-icon-btn mts-add-btn", SVG_PLUS);
        addBtn.type = "button";
        addBtn.title = "변수 추가";
        const doAdd = () => {
          let v = addInput.value.trim();
          if (v && !v.startsWith("--")) v = "--" + v;
          if (!/^--[A-Za-z0-9_-]+$/.test(v)) {
            showToast("변수명 형식이 맞지 않아요 (예: --glass-bg)");
            return;
          }
          if (
            state.customVars.includes(v) ||
            KNOWN_VARS.has(v) ||
            palettePoints.some((p) => p.v === v) ||
            optionPoints.some((p) => p.v === v)
          ) {
            showToast("이미 목록에 있는 변수예요");
            return;
          }
          state.customVars.push(v);
          addInput.value = "";
          scheduleSave();
          renderRows();
        };
        addBtn.addEventListener("click", doAdd);
        addInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") doAdd();
        });
        addRow.appendChild(addInput);
        addRow.appendChild(addBtn);
        rows.appendChild(addRow);
      }

      const collapsed = state.collapsed[section.id] ?? !!section.defaultCollapsed;
      group.classList.toggle("mts-group--collapsed", !!collapsed);
      header.addEventListener("click", () => {
        state.collapsed[section.id] = !group.classList.contains("mts-group--collapsed");
        group.classList.toggle("mts-group--collapsed", state.collapsed[section.id]);
        scheduleSave();
      });

      group.appendChild(header);
      group.appendChild(rows);
      body.appendChild(group);
    }
    updateOverrideBadges();
    applyFilter();
  }

  function applyFilter() {
    if (!panelEl) return;
    const q = (panelEl.querySelector(".mts-search-input")?.value || "").trim().toLowerCase();
    for (const group of panelEl.querySelectorAll(".mts-group")) {
      let visible = 0;
      for (const row of group.querySelectorAll(".mts-row")) {
        const match = !q || (row.dataset.label || "").includes(q);
        row.classList.toggle("mts-row--hidden", !match);
        if (match) visible += 1;
      }
      group.classList.toggle("mts-group--hidden", !!q && visible === 0);
      if (q && visible > 0) group.classList.remove("mts-group--collapsed");
      // 검색어가 상세 설정 안 항목과 맞으면 하위 접기도 펼친다
      if (q) {
        for (const sub of group.querySelectorAll(".mts-subgroup")) {
          const anyVisible = [...sub.querySelectorAll(".mts-row")].some((r) => !r.classList.contains("mts-row--hidden"));
          if (anyVisible) sub.classList.remove("mts-subgroup--collapsed");
        }
      }
    }
  }

  function updateModeUi() {
    if (!panelEl) return;
    for (const tab of panelEl.querySelectorAll("[data-mts-mode]")) {
      tab.classList.toggle("mts-tab--active", tab.dataset.mtsMode === state.mode);
    }
    const note = panelEl.querySelector(".mts-mode-note");
    const now = appMode();
    if (state.mode === now) {
      note.textContent = "현재 모드와 일치 — 수정이 바로 적용됩니다 · [공통] 항목은 모드와 무관";
      note.classList.remove("mts-mode-note--warn");
    } else {
      note.textContent = "현재 모드와 불일치 — 수정한 내용은 모드를 바꿔야 적용됩니다";
      note.classList.add("mts-mode-note--warn");
    }
  }

  function buildPanel() {
    panelEl = h("div", "mts-panel");
    panelEl.hidden = true;
    panelEl.innerHTML = `
      <div class="mts-header">
        <span class="mts-header-grip" title="끌어서 이동"></span>
        <div class="mts-header-text">
          <span class="mts-title">테마 스튜디오</span>
          <span class="mts-total-count"></span>
        </div>
        <button type="button" class="mts-icon-btn mts-refresh" title="현재 테마에서 시작값 다시 읽기">${SVG_REFRESH}</button>
        <button type="button" class="mts-icon-btn mts-min" title="최소화 — 화면 전체를 확인할 때">${SVG_MIN}</button>
        <button type="button" class="mts-icon-btn mts-close" title="닫기">${SVG_X}</button>
      </div>
      <div class="mts-tabs">
        <button type="button" class="mts-tab" data-mts-mode="dark">다크</button>
        <button type="button" class="mts-tab" data-mts-mode="light">라이트</button>
        <span class="mts-search">${SVG_SEARCH}<input type="text" class="mts-search-input" placeholder="항목 검색" spellcheck="false"></span>
      </div>
      <div class="mts-mode-note"></div>
      <div class="mts-body"></div>
      <div class="mts-footer">
        <button type="button" class="mts-text-btn mts-reset-all">모두 되돌리기</button>
        <div class="mts-export">
          <input type="text" class="mts-export-name" placeholder="테마 이름" spellcheck="false">
          <button type="button" class="mts-text-btn mts-text-btn--primary mts-export-json" title="마리나라 테마 JSON으로 저장">${SVG_DOWNLOAD}<span>내보내기</span></button>
          <button type="button" class="mts-icon-btn mts-export-css" title="테마 CSS만 클립보드에 복사">${SVG_COPY}</button>
        </div>
      </div>`;
    document.body.appendChild(panelEl);

    panelEl.querySelector(".mts-close").addEventListener("click", closePanel);
    panelEl.querySelector(".mts-refresh").addEventListener("click", () => refreshVars(false));
    panelEl.querySelector(".mts-min").addEventListener("click", () => {
      panelEl.classList.toggle("mts-panel--min");
    });
    for (const tab of panelEl.querySelectorAll("[data-mts-mode]")) {
      tab.addEventListener("click", () => {
        state.mode = tab.dataset.mtsMode;
        scheduleSave();
        updateModeUi();
        renderRows();
      });
    }
    panelEl.querySelector(".mts-search-input").addEventListener("input", applyFilter);
    panelEl.querySelector(".mts-body").addEventListener("scroll", hideTip, { passive: true });

    // 모두 되돌리기 — 실수 방지 2단계 확인
    const resetAll = panelEl.querySelector(".mts-reset-all");
    let armTimer = 0;
    resetAll.addEventListener("click", () => {
      if (!resetAll.classList.contains("mts-reset-all--armed")) {
        resetAll.classList.add("mts-reset-all--armed");
        resetAll.textContent = "한 번 더 누르면 초기화";
        clearTimeout(armTimer);
        armTimer = setTimeout(() => {
          resetAll.classList.remove("mts-reset-all--armed");
          resetAll.textContent = "모두 되돌리기";
        }, 3000);
        return;
      }
      clearTimeout(armTimer);
      resetAll.classList.remove("mts-reset-all--armed");
      resetAll.textContent = "모두 되돌리기";
      state.overrides = { dark: {}, light: {}, shared: {} };
      state.styles = { dark: {}, light: {}, shared: {} };
      applyLive();
      persistNow();
      renderRows();
      showToast("모든 값을 원래대로 되돌렸어요");
    });

    const nameInput = panelEl.querySelector(".mts-export-name");
    nameInput.value = state.exportName;
    nameInput.addEventListener("input", () => {
      state.exportName = nameInput.value.slice(0, 60);
      scheduleSave();
    });
    panelEl.querySelector(".mts-export-json").addEventListener("click", exportThemeJson);
    panelEl.querySelector(".mts-export-css").addEventListener("click", copyThemeCss);

    setupDrag();
    if (state.panelPos) applyPanelPos();

    // 크기 조절(오른쪽 아래 모서리) 기억 — 최소화 상태·모바일에서는 기록하지 않는다
    if (state.panelSize && window.innerWidth >= 640) {
      panelEl.style.width = state.panelSize.w + "px";
      panelEl.style.height = state.panelSize.h + "px";
    }
    resizeObs = new ResizeObserver(() => {
      if (window.innerWidth < 640 || panelEl.hidden || panelEl.classList.contains("mts-panel--min")) return;
      const rect = panelEl.getBoundingClientRect();
      const w = Math.round(rect.width);
      const hh = Math.round(rect.height);
      if (state.panelSize && state.panelSize.w === w && state.panelSize.h === hh) return;
      state.panelSize = { w, h: hh };
      scheduleSave();
    });
    resizeObs.observe(panelEl);
  }

  function applyPanelPos() {
    if (!panelEl || !state.panelPos || window.innerWidth < 640) return;
    const maxLeft = Math.max(8, window.innerWidth - 100);
    const maxTop = Math.max(8, window.innerHeight - 80);
    panelEl.style.left = Math.min(Math.max(8, state.panelPos.left), maxLeft) + "px";
    panelEl.style.top = Math.min(Math.max(8, state.panelPos.top), maxTop) + "px";
    panelEl.style.right = "auto";
  }

  function setupDrag() {
    const header = panelEl.querySelector(".mts-header");
    let startX = 0;
    let startY = 0;
    let origin = null;
    const onMove = (e) => {
      if (!origin) return;
      state.panelPos = { left: origin.left + (e.clientX - startX), top: origin.top + (e.clientY - startY) };
      applyPanelPos();
    };
    const onUp = () => {
      if (origin) scheduleSave();
      origin = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    header.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, input") || window.innerWidth < 640) return;
      const rect = panelEl.getBoundingClientRect();
      origin = { left: rect.left, top: rect.top };
      startX = e.clientX;
      startY = e.clientY;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      e.preventDefault();
    });
    cleanupFns.push(() => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    });
  }

  function openPanel() {
    if (!panelEl) buildPanel();
    // 편집 탭을 지금 앱 모드에 맞춘다 — "바꿨는데 화면이 안 변해요"의 대부분은 탭·모드 불일치
    state.mode = appMode();
    refreshVars(true); // 열 때마다 최신 테마 기준으로 시작값 갱신
    panelEl.hidden = false;
    panelOpen = true;
    launcherEl?.classList.add("mts-launcher--active");
    updateModeUi();
    renderRows();
    // 코드블럭처럼 나중에 화면에 나타나는 요소의 시작값을 주기적으로 재시도
    clearInterval(styleSyncTimer);
    styleSyncTimer = setInterval(() => {
      for (const sync of styleRowSyncs) {
        try {
          sync();
        } catch {}
      }
    }, 2000);
  }

  function closePanel() {
    if (panelEl) panelEl.hidden = true;
    panelOpen = false;
    launcherEl?.classList.remove("mts-launcher--active");
    clearInterval(styleSyncTimer);
    hideTip();
  }

  function buildLauncher() {
    launcherEl = h("button", "mts-launcher", SVG_PALETTE);
    launcherEl.type = "button";
    launcherEl.title = "테마 스튜디오";
    launcherEl.setAttribute("aria-label", "테마 스튜디오 열기");
    launcherEl.addEventListener("click", () => (panelOpen ? closePanel() : openPanel()));
    document.body.appendChild(launcherEl);
  }

  /* 앱의 다크/라이트 전환 감지 → 안내 문구 갱신 */
  function startThemeAttrObserver() {
    themeAttrObserver = new MutationObserver(() => {
      if (panelOpen) {
        state.mode = appMode(); // 앱 모드가 바뀌면 편집 탭도 따라간다
        updateModeUi();
        renderRows(); // 계산된 기본값이 모드에 따라 달라질 수 있어 다시 그림
      }
    });
    themeAttrObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ══════════ 시작/정리 ══════════ */
  async function boot() {
    await loadState();
    collectCssVars();
    detectThemeVars();
    buildLauncher();
    applyLive(); // 저장돼 있던 작업 중 값을 즉시 복원
    startHeadObserver();
    startThemeAttrObserver();
    // 앱 스타일이 아직 로딩 중일 수 있어 잠시 후 한 번 더 읽는다
    setTimeout(() => refreshVars(true), 1500);
  }

  function stop() {
    clearTimeout(saveTimer);
    clearTimeout(refreshTimer);
    clearTimeout(toastTimer);
    clearTimeout(tipTimer);
    clearInterval(styleSyncTimer);
    clearFlash();
    persistNow();
    headObserver?.disconnect();
    themeAttrObserver?.disconnect();
    resizeObs?.disconnect();
    document.getElementById(LIVE_STYLE_ID)?.remove();
    panelEl?.remove();
    launcherEl?.remove();
    toastEl?.remove();
    tipEl?.remove();
    probe?.remove();
    for (const fn of cleanupFns) {
      try {
        fn();
      } catch {}
    }
  }

  void boot();

  if (typeof marinara !== "undefined" && typeof marinara?.onCleanup === "function") {
    marinara.onCleanup(stop);
  }
})();
