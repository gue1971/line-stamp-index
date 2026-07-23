const GROUPS = [
  {key:"あ", label:"あ", test:/^[あいうえお]/}, {key:"か", label:"か", test:/^[かきくけこがぎぐげご]/},
  {key:"さ", label:"さ", test:/^[さしすせそざじずぜぞ]/}, {key:"た", label:"た", test:/^[たちつてとだぢづでど]/},
  {key:"な", label:"な", test:/^[なにぬねの]/}, {key:"は", label:"は", test:/^[はひふへほばびぶべぼぱぴぷぺぽ]/},
  {key:"ま", label:"ま", test:/^[まみむめも]/}, {key:"や", label:"や", test:/^[やゆよ]/},
  {key:"ら", label:"ら", test:/^[らりるれろ]/}, {key:"わ", label:"わ", test:/^[わをん]/},
];
const $ = (selector, root=document) => root.querySelector(selector);
let stickers = [];
let revealFrame = 0;

function normalize(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s\p{P}\p{S}ー〜]/gu, "");
}
function groupOf(reading) { return GROUPS.find(group => group.test.test(reading))?.key || "わ"; }
function sortJapanese(a,b) { return a.reading.localeCompare(b.reading,"ja",{usage:"sort"}) || a.id.localeCompare(b.id); }
function matches(sticker, query) { return normalize(sticker.text).includes(query) || normalize(sticker.reading).includes(query); }
function tabImage(set) { return `assets/tabs/${set}.png`; }
function setMarker(sticker, className="card-marker") {
  return `<span class="${className}"><img class="set-tab" src="${tabImage(sticker.set)}" alt="" width="96" height="74"><span class="set-label set-${sticker.set}">${sticker.set}-${sticker.position}</span></span>`;
}

function card(sticker) {
  return `<button class="sticker-card" type="button" data-id="${sticker.id}" aria-label="${sticker.text}、${sticker.set}-${sticker.position}の詳細">
    <span class="image-stage"><img src="${sticker.image}" alt="${sticker.text}" loading="lazy" width="370" height="320"></span>
    ${setMarker(sticker)}
  </button>`;
}

function revealSearchResults() {
  if (!window.matchMedia("(max-width: 600px)").matches) return;
  cancelAnimationFrame(revealFrame);
  revealFrame = requestAnimationFrame(() => {
    revealFrame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const toolsHeight = $(".sticky-tools").getBoundingClientRect().height;
      document.documentElement.style.setProperty("--search-viewport-top", `${viewport?.offsetTop || 0}px`);
      document.documentElement.style.setProperty("--search-viewport-height", `${viewport?.height || window.innerHeight}px`);
      document.documentElement.style.setProperty("--search-tools-height", `${toolsHeight}px`);
      $("#main").scrollTop = 0;
    });
  });
}

function selectSearchText() {
  const input = $("#search");
  if (input.value) requestAnimationFrame(() => input.select());
}

function render() {
  const raw = $("#search").value;
  const query = normalize(raw);
  const filtered = stickers.filter(s => !query || matches(s,query)).sort((a,b) => {
    if (query) {
      const exactA = normalize(a.text) === query ? 0 : 1;
      const exactB = normalize(b.text) === query ? 0 : 1;
      if (exactA !== exactB) return exactA - exactB;
    }
    return sortJapanese(a,b);
  });
  const sections = $("#sticker-sections");
  if (query) {
    sections.innerHTML = filtered.length ? `<section class="kana-section"><div class="sticker-grid">${filtered.map(card).join("")}</div></section>` : "";
  } else {
    sections.innerHTML = GROUPS.map(group => {
      const rows = filtered.filter(s => groupOf(s.reading) === group.key);
      return rows.length ? `<section class="kana-section" id="row-${group.key}" aria-label="${group.label}行"><div class="sticker-grid">${rows.map(card).join("")}</div></section>` : "";
    }).join("");
  }
  $("#empty").hidden = filtered.length > 0;
  $("#result-summary").textContent = query ? `「${raw.trim()}」の検索結果 ${filtered.length}件` : `全${stickers.length}件・50音順`;
  $("#clear-search").classList.toggle("visible", Boolean(raw));
  document.body.classList.toggle("searching", Boolean(query));
  document.querySelectorAll(".kana-nav button").forEach(btn => btn.disabled = Boolean(query) || !$( `#row-${btn.dataset.group}`));
  if (query) revealSearchResults();
}

function relatedFor(sticker) {
  return stickers.filter(other => other.id !== sticker.id && other.text !== sticker.text && other.tags.some(tag => sticker.tags.includes(tag)))
    .sort((a,b) => b.tags.filter(tag => sticker.tags.includes(tag)).length - a.tags.filter(tag => sticker.tags.includes(tag)).length || sortJapanese(a,b)).slice(0,6);
}
function showDetail(id) {
  const sticker = stickers.find(s => s.id === id); if (!sticker) return;
  const related = relatedFor(sticker);
  $("#detail-content").innerHTML = `<article class="detail">
    <div class="detail-top"><div class="image-stage detail-image"><img src="${sticker.image}" alt="${sticker.text}" width="370" height="320"></div>
      <div class="detail-info">${setMarker(sticker,"detail-marker")}<h2 id="detail-title" class="sr-only">${sticker.text}</h2><p class="detail-meta">読み：${sticker.reading}</p></div></div>
    <div class="position-map" aria-label="${sticker.set}-${sticker.position}のセット内配置">${Array.from({length:40},(_,i)=>`<span class="${i+1===sticker.position?"active":""}">${i+1}</span>`).join("")}</div>
    <h3 class="related-title">関連スタンプ</h3><div class="related-grid">${related.map(r=>`<button class="related-card" type="button" data-related="${r.id}" aria-label="${r.text}、${r.set}-${r.position}の詳細"><img class="related-image" src="${r.image}" alt="" loading="lazy">${setMarker(r,"related-marker")}</button>`).join("")}</div>
  </article>`;
  const dialog = $("#detail-dialog"); if (!dialog.open) dialog.showModal(); dialog.scrollTop=0;
}
function clearSearch(){ $("#search").value=""; render(); $("#search").focus(); }

async function init() {
  try {
    const response = await fetch("data/stickers.json"); if (!response.ok) throw new Error(response.statusText);
    stickers = await response.json(); stickers.sort(sortJapanese);
    $(".kana-nav").innerHTML = GROUPS.map(g=>`<button type="button" data-group="${g.key}">${g.label}</button>`).join("");
    render();
    $("#search").addEventListener("input",render);
    $("#search").addEventListener("focus",()=>{if($("#search").value){selectSearchText();revealSearchResults();}});
    $("#search").addEventListener("pointerup",selectSearchText);
    $("#clear-search").addEventListener("click",clearSearch); $("#empty-clear").addEventListener("click",clearSearch);
    window.visualViewport?.addEventListener("resize",()=>{if($("#search").value) revealSearchResults();});
    window.visualViewport?.addEventListener("scroll",()=>{if($("#search").value) revealSearchResults();});
    $(".kana-nav").addEventListener("click",e=>{const b=e.target.closest("button:not(:disabled)"); if(b) $(`#row-${b.dataset.group}`)?.scrollIntoView({behavior:"smooth"});});
    $("#sticker-sections").addEventListener("click",e=>{const c=e.target.closest("[data-id]"); if(c) showDetail(c.dataset.id);});
    $("#detail-dialog").addEventListener("click",e=>{if(e.target===$("#detail-dialog")||e.target.closest(".dialog-close")) $("#detail-dialog").close(); const r=e.target.closest("[data-related]"); if(r) showDetail(r.dataset.related);});
  } catch (error) { $("#result-summary").textContent="データを読み込めませんでした。ローカルサーバーから開いてください。"; console.error(error); }
}
document.addEventListener("DOMContentLoaded",init);
if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(error=>console.error("Service Worker registration failed",error)));
