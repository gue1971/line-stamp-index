#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.resolve(projectRoot, "../line-stampmaker");
const dryRun = process.argv.includes("--check");

const imageDirs = {
  A: "line-stickers-a-set-v1",
  B: "line-stickers-b-set-v1",
  C: "line-stickers-c-set-v1",
  D: "line-stickers-d-set-reupload-v2",
  E: "line-stickers-e-set-reupload-v2",
  F: "line-stickers-f-set",
};

function read(file) {
  return fs.readFileSync(path.join(sourceRoot, file), "utf8");
}

function parseCsv() {
  const lines = read("docs/sticker-series-plan.csv").trim().split(/\r?\n/).slice(1);
  return lines.map((line) => {
    const [set, id, text, character] = line.split(",");
    return { set, id, position: Number(id.slice(1)), text, character };
  });
}

function parseMarkdownTable(markdown, set) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (!new RegExp(`^${set}\\d{2}$`).test(cells[0] || "")) continue;
    rows.push({
      set,
      id: cells[0],
      position: Number(cells[0].slice(1)),
      text: cells[1],
      character: cells[2],
    });
  }
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

const kana = (value) => value.normalize("NFKC").replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

const readings = {
  "了解":"りょうかい","見ました":"みました","今むり":"いまむり","すぐ行く":"すぐいく","向かってます":"むかってます","帰ります":"かえります","風呂":"ふろ","寝る":"ねる","笑":"わらい","お願いします":"おねがいします","大丈夫":"だいじょうぶ","確認中":"かくにんちゅう","ちょっと待って":"ちょっとまって","待って":"まって","助かる":"たすかる","起きた":"おきた","休憩":"きゅうけい","元気？":"げんき","遅れます":"おくれます",
  "泣く":"なく","信じられん":"しんじられん","知らん":"しらん","好き":"すき","嫌い":"きらい","微妙":"びみょう","残念":"ざんねん","無念":"むねん","惜しい":"おしい",
  "来た":"きた","的中":"てきちゅう","大勝利":"だいしょうり","素晴らしい":"すばらしい","革命":"かくめい","超便利":"ちょうべんり","強い":"つよい","待機中":"たいきちゅう","圧巻":"あっかん","素敵":"すてき","最高":"さいこう","天才":"てんさい","完璧":"かんぺき","任せた":"まかせた","優勝":"ゆうしょう","神":"かみ","いい感じ":"いいかんじ",
  "大変":"たいへん","お大事に":"おだいじに","無理せず":"むりせず","休め":"やすめ","落ち着く":"おちつく","落ち着け":"おちつけ","厳しい":"きびしい","痛恨":"つうこん","甘い":"あまい","カッコ悪い":"かっこわるい","話が違う":"はなしがちがう","違う":"ちがう","心配":"しんぱい","不安":"ふあん","参った":"まいった","仕方ない":"しかたない","論外":"ろんがい","困った":"こまった","無理":"むり",
  "突然":"とつぜん","行きます":"いきます","久しぶり":"ひさしぶり","会わない？":"あわない","遊ぼ":"あそぼ","誘って":"さそって","余裕がない":"よゆうがない","気をつけて":"きをつけて","今":"いま","今日":"きょう","明日":"あした","今週は？":"こんしゅうは","来週は？":"らいしゅうは","空いてる":"あいてる","暇":"ひま","偶然":"ぐうぜん","正解":"せいかい","堂々と":"どうどうと","忘れて":"わすれて","深くは":"ふかくは","漠然と":"ばくぜんと","また今度":"またこんど",
  "寝ろ":"ねろ","食って寝ろ":"くってねろ","失敗":"しっぱい","やり直し":"やりなおし","言いすぎ":"いいすぎ","考えすぎ":"かんがえすぎ","調子こいた":"ちょうしこいた","不覚":"ふかく","恥ずかし":"はずかし","欲":"よく","欲しい":"ほしい","欲張った":"よくばった","買った":"かった","買っちまった":"かっちまった","自己都合":"じこつごう","止まらん":"とまらん","未確認":"みかくにん","うろ覚え":"うろおぼえ","知らなんだ":"しらなんだ","見とらん":"みとらん","読んどらん":"よんどらん","聞いとらん":"きいとらん","飽きた":"あきた","任せる":"まかせる","懐かしい":"なつかしい"
};

const tagRules = [
  ["挨拶", /おはよう|こんにちは|こんばんは|おやすみ|久しぶり|またね|いってらっしゃい|もしもし/],
  ["了承", /オッケー|了解|わかった|なるほど|そうじゃね|いいね|もちろん|たしかに|なっとく|そうね|うんうん|それでよし/],
  ["感謝", /ありがとう|サンキュー|助かる|わざわざ/],
  ["謝罪", /すみません|ごめん|言いすぎ|恥ずかし/],
  ["返事", /はーい|いえいえ|ですね|それなら|じゃあ|ですが|でも|それは/],
  ["確認", /見ました|確認|どこ|いつ|今週|来週|ですか|どうする|会わない|空いてる/],
  ["催促", /待って|ちゃんと|ねえ|休め|寝ろ|ください|誘って/],
  ["移動", /行く|行きます|向かって|帰ります|遅れます|来た|いってらっしゃい/],
  ["仕事", /確認|待機中|任せ|やり直し|できたて|正解|的中|失敗|余裕がない/],
  ["応援", /おつかれ|よろしく|お願い|大丈夫|無理せず|お大事に|ゆっくり|やってみよう|気をつけて/],
  ["喜び", /うれしい|やった|大勝利|優勝|最高|サイコー|おめでとう|素晴らしい|完璧|神|パチパチ/],
  ["驚き", /まじか|えっ|ウソ|ワオ|ガーン|なんで|ほんまに|びっくり|まさか|ありえん|なんと|すごっ|突然|わああ/],
  ["落胆", /泣く|いまいち|微妙|残念|無念|惜しい|ショック|きつい|大変|厳しい|痛恨|困った|不安|参った|がっくし|不覚|失敗/],
  ["笑い", /笑|フフフ|エッヘン|ボケ|調子こいた|カッコ悪い/],
  ["会話終了", /またね|おやすみ|寝る|寝ろ|やめた|帰ります|忘れて|また今度/],
  ["予定", /あとで|もうすぐ|今日|明日|今週|来週|いつでも|空いてる|暇|ときどき|また今度/],
  ["否定", /わからん|知らん|嫌い|ありえん|ダメ|ならん|やれん|いやいや|じゃなくて|それはない|無理|違う|論外|見とらん|読んどらん|聞いとらん/],
  ["称賛", /かっこいい|かわいい|素敵|天才|さすが|やるじゃん|いい感じ|強い|圧巻|堂々と/],
  ["お願い", /お願いします|待って|任せた|任せる|ください|誘って/],
  ["日常", /風呂|寝る|起きた|休憩|食って|買った|欲しい|すっきり/],
];

function tagsFor(text) {
  const tags = tagRules.filter(([, re]) => re.test(text)).map(([tag]) => tag);
  if (!tags.length) tags.push("会話");
  if (tags.length === 1 && !["会話", "日常"].includes(tags[0])) tags.push("会話");
  return tags.slice(0, 4);
}

function buildRows() {
  const abc = parseCsv();
  if (abc.length !== 120) throw new Error(`CSVは120件を想定しています（実際: ${abc.length}件）`);
  const productionPlan = read("docs/d-f-production-plan.md");
  const d = parseMarkdownTable(productionPlan, "D");
  const e = parseMarkdownTable(productionPlan, "E");
  const f = parseMarkdownTable(read("docs/f-set-assignment-plan.md"), "F");
  if (d.length !== 40 || e.length !== 40 || f.length !== 40) throw new Error(`D/E/Fの解析件数が不正です: ${d.length}/${e.length}/${f.length}`);
  d.find((row) => row.id === "D01").text = "きつい";
  e.find((row) => row.id === "E39").text = "またね";
  return [...abc, ...d, ...e, ...f].map((row) => {
    const reading = readings[row.text] || kana(row.text).replace(/[\s\p{P}\p{S}ー〜]/gu, "");
    if (/\p{Script=Han}/u.test(reading)) throw new Error(`${row.id}「${row.text}」の読み仮名が未登録です`);
    return {...row, reading, tags: tagsFor(row.text), image: `assets/stickers/${row.set}/${String(row.position).padStart(2, "0")}.png`};
  });
}

function validate(rows) {
  const errors = [];
  if (rows.length !== 240) errors.push(`データ件数: ${rows.length}`);
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.id)) errors.push(`ID重複: ${row.id}`);
    ids.add(row.id);
  }
  for (const set of Object.keys(imageDirs)) {
    for (let position = 1; position <= 40; position++) {
      const id = `${set}${String(position).padStart(2, "0")}`;
      if (!ids.has(id)) errors.push(`欠番: ${id}`);
      const src = path.join(sourceRoot, "dist-ai", imageDirs[set], `${String(position).padStart(2, "0")}.png`);
      if (!fs.existsSync(src)) {
        errors.push(`画像不足: ${src}`);
      } else {
        const header = fs.readFileSync(src).subarray(0, 26);
        const isPng = header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        const width = isPng ? header.readUInt32BE(16) : 0;
        const height = isPng ? header.readUInt32BE(20) : 0;
        const bitDepth = isPng ? header[24] : 0;
        const colorType = isPng ? header[25] : 0;
        if (!isPng || width !== 370 || height !== 320 || bitDepth !== 8 || colorType !== 6) {
          errors.push(`画像仕様不正: ${src} (${width}x${height}, bit=${bitDepth}, colorType=${colorType})`);
        }
      }
    }
    const tab = path.join(sourceRoot, "dist-ai", imageDirs[set], "tab.png");
    if (!fs.existsSync(tab)) {
      errors.push(`tab画像不足: ${tab}`);
    } else {
      const header = fs.readFileSync(tab).subarray(0, 26);
      const isPng = header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      if (!isPng || header.readUInt32BE(16) !== 96 || header.readUInt32BE(20) !== 74 || header[24] !== 8 || header[25] !== 6) {
        errors.push(`tab画像仕様不正: ${tab}`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
}

const rows = buildRows();
validate(rows);
if (!dryRun) {
  for (const set of Object.keys(imageDirs)) {
    const target = path.join(projectRoot, "assets/stickers", set);
    fs.mkdirSync(target, { recursive: true });
    for (let position = 1; position <= 40; position++) {
      const filename = `${String(position).padStart(2, "0")}.png`;
      fs.copyFileSync(path.join(sourceRoot, "dist-ai", imageDirs[set], filename), path.join(target, filename));
    }
    const tabTarget = path.join(projectRoot, "assets/tabs");
    fs.mkdirSync(tabTarget, { recursive: true });
    fs.copyFileSync(path.join(sourceRoot, "dist-ai", imageDirs[set], "tab.png"), path.join(tabTarget, `${set}.png`));
  }
  fs.mkdirSync(path.join(projectRoot, "data"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "data/stickers.json"), `${JSON.stringify(rows, null, 2)}\n`);
}
console.log(`OK: ${rows.length}件、A〜F各40件、スタンプ240枚とtab画像6枚を検証${dryRun ? "（checkのみ）" : "・同期"}しました。`);
