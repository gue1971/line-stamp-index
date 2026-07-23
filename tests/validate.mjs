import fs from "node:fs";
import assert from "node:assert/strict";

const rows = JSON.parse(fs.readFileSync(new URL("../data/stickers.json", import.meta.url), "utf8"));
const manifest = JSON.parse(fs.readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
assert.equal(rows.length, 240, "240件であること");
assert.equal(new Set(rows.map(r=>r.id)).size, 240, "IDが重複しないこと");
for (const set of "ABCDEF") {
  const setRows = rows.filter(r=>r.set===set);
  assert.equal(setRows.length,40,`${set}セットが40件であること`);
  assert.deepEqual(setRows.map(r=>r.position).sort((a,b)=>a-b),Array.from({length:40},(_,i)=>i+1),`${set}に欠番がないこと`);
  assert.ok(fs.existsSync(new URL(`../assets/tabs/${set}.png`,import.meta.url)),`${set}のtab画像`);
}
for (const row of rows) {
  assert.ok(row.reading && !/\p{Script=Han}/u.test(row.reading),`${row.id}の読み仮名`);
  assert.ok(Array.isArray(row.tags) && row.tags.length>0,`${row.id}のタグ`);
  assert.ok(fs.existsSync(new URL(`../${row.image}`,import.meta.url)),`${row.id}の画像`);
}
const normalize = value => value.normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s\p{P}\p{S}ー〜]/gu,"");
const find = query => rows.filter(r=>normalize(r.text).includes(normalize(query))||normalize(r.reading).includes(normalize(query)));
assert.ok(find("ありがと").some(r=>r.text==="ありがとう"),"前方部分一致");
assert.ok(find("ｵｯｹｰ").some(r=>r.id==="A01"),"半角カナ吸収");
assert.ok(find("どうする！").some(r=>r.id==="E40"),"句読点・感嘆符吸収");
const sorted=[...rows].sort((a,b)=>a.reading.localeCompare(b.reading,"ja",{usage:"sort"})||a.id.localeCompare(b.id));
assert.equal(sorted[0].id,"E23","読み仮名順の先頭確認");
assert.equal(manifest.display,"standalone","PWA standalone表示");
assert.ok(fs.existsSync(new URL("../sw.js",import.meta.url)),"Service Worker");
for (const icon of manifest.icons) assert.ok(fs.existsSync(new URL(`../${icon.src}`,import.meta.url)),`PWAアイコン ${icon.src}`);
console.log("OK: 240件、ID、欠番、画像、読み、タグ、検索正規化、並び順、PWA構成を検証しました。");
