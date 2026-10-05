#!/usr/bin/env python3
"""Fix b47-b54 lexicon shards: replace English form text with hiragana/katakana, normalize pos."""
import json, os

R = "languages/ja-JP/lexicon"
KANA = {
 # film2
 "joukei":("じょうけい","h"),"iro":("いろ","h"),"hikari":("ひかり","h"),"on":("おん","h"),
 "ongaku":("おんがく","h"),"fukushoku":("ふくしょく","h"),"bakuhatsu":("ばくはつ","h"),
 "tatakai":("たたかい","h"),"inbou":("いんぼう","h"),"hantai":("はんたい","h"),
 "shippai":("しっぱい","h"),"ketsui":("けつい","h"),"taifu":("たいふ","h"),
 "shizuka":("しずか","h"),"kaze":("かぜ","h"),"ame":("あめ","h"),"yuki":("ゆき","h"),
 "yoru":("よる","h"),"asa":("あさ","h"),"umi":("うみ","h"),"sora":("そら","h"),
 "tori":("とり","h"),"sakana":("さかな","h"),"ki":("き","h"),"hana":("はな","h"),
 "tsuki":("つき","h"),"hoshi":("ほし","h"),"yama":("やま","h"),"mado":("まど","h"),
 "kagayaki":("かぎやき","h"),
 # history
 "shiryou":("しりょう","h"),"genbun":("げんぶん","h"),"shoko":("しょうこ","h"),
 "shogen":("しょうげん","h"),"hakukutsu":("はくくつ","h"),"shakusha":("がくしゃ","h"),
 "kijutsu":("きじゅつ","h"),"kaishaku":("かいしゃく","h"),"hikaku":("ひかく","h"),
 "shinwa":("しんわ","h"),"sensou":("せんそう","h"),"kakumei":("かかくめい","h"),
 "joyaku":("じょうやく","h"),"kenpou":("けんぽう","h"),"dekigoto":("できごと","h"),
 "genin":("げんいん","h"),"eikyou":("えいきょう","h"),"kodai":("こだい","h"),
 "kindai":("きんたい","h"),"hakubutsukan":("はくぶつかん","h"),
 # history2
 "monument":("モニュメント","k"),"kinenbi":("きねんび","h"),"shouzou":("ぞうしょう","h"),
 "hoko":("ほこう","h"),"hyougeki":("ひょうげき","h"),"sagitou":("ぎとう","h"),
 "shiryoukan":("しりょうかん","h"),"kanren":("かんれん","h"),"kousatsu":("こうさつ","h"),
 "teikyou":("ていきょう","h"),"hensen":("へんせん","h"),"saikoutei":("さいこうてい","h"),
 "kuchikami":("くちかみ","h"),"intabyuu":("インタビュー","k"),"kioku":("きおく","h"),
 "denko":("でんこう","h"),"kaisou":("かいそう","h"),"senjo":("せんじょう","h"),
 "sengo2":("せんご","h"),"fukko":("ふっこう","h"),"seicho":("せいちょう","h"),
 "kinkyo":("きんきょう","h"),"senryaku2":("せんりゃく","h"),"seimen":("せいめん","h"),
 "jissai":("じっさい","h"),"honne2":("ほんね","h"),"gijinka":("ぎじんか","h"),
 "fuhai":("ふはい","h"),"hyoujun":("ひょうじゅん","h"),"kijun":("きじゅん","h"),
 "ihan":("いはん","h"),"toui":("とうぎ","h"),"ruiji":("るいじ","h"),"konkyo":("こんきょ","h"),
 "risou":("りそう","h"),"genjitsu":("げんじつ","h"),"kachi":("かち","h"),"kiso":("きそ","h"),
 "soshi":("そし","h"),"kento":("けんとう","h"),"katsuyou":("かつよう","h"),
 "shiten2":("してん","h"),"tachiba":("たちば","h"),"irezumi":("いれずみ","h"),
 "kiji":("きじ","h"),"koseki":("こせき","h"),"chosa":("ちょうさ","h"),
 "mousho":("もうしょ","h"),"nikki":("にっき","h"),"tegami":("てがみ","h"),
 # history3
 "taiou":("たいおう","h"),"jikkou":("じっこう","h"),"hyouka":("ひょうか","h"),
 "rondai":("ろんだい","h"),"bunkyou":("ぶんきょう","h"),"denshou2":("でんしょう","h"),
 "shimei":("しみめい","h"),"kaisai":("かいさい","h"),"sekinin":("せきにん","h"),
 "mondai":("もんだい","h"),
 # society3
 "jinkou":("じんこう","h"),"genkou":("げんこう","h"),"zouka":("ぞうか","h"),
 "noureka":("のうれか","h"),"kodomo":("こども","h"),"hakushou":("しゅうしゅつりつ","h"),
 "shoushou":("しょうしょう","h"),"roojin":("ろうじん","h"),"yobikou":("よびこう","h"),
 "boushi":("ぼうし","h"),"fuyou":("ふよう","h"),"kaigo":("かいご","h"),"yaku":("やく","h"),
 "tanshuku":("つうきん","h"),"koyou":("こうよう","h"),"shitsugyou":("しつぎょう","h"),
 "yuumu":("ざんぎょう","h"),"yuukou":("ゆうこう","h"),"seido":("せいど","h"),
 "kaikaku":("かいかく","h"),"nyuugaku":("にゅうがく","h"),"jugyou":("じゅぎょう","h"),
 "senmon":("せんもん","h"),"jitsugyou":("じつぎょう","h"),"toshi":("とし","h"),
 "inaka":("いなか","h"),"kensetsu":("けんせつ","h"),"iju":("いきょ","h"),
 "ikei":("いけい","h"),"henkou":("へんこう","h"),"danjyo":("だんじょ","h"),
 "heikin":("へいきん","h"),"wari":("わり","h"),"toukei":("とうけい","h"),
 "sanka":("さんか","h"),"komei":("こうめい","h"),"hoken":("ほけん","h"),
 "nenkin":("ねんきん","h"),"zei":("ぜい","h"),"fukushi":("ふくし","h"),
 # society4
 "keieki":("けいえき","h"),"kigyo":("きぎょう","h"),"hataraki":("はたらき","h"),
 "taido":("たいど","h"),"kizuna":("きずな","h"),"kakushin":("かくしん","h"),
 "fukkyuu":("ふっきゅう","h"),"jichitsu":("じちつ","h"),"kyousou":("きょうそう","h"),
 "kyouchou":("きょうちょう","h"),"rentai":("れんたい","h"),"hatsu":("はつ","h"),
 "shigen":("しげん","h"),"saishi":("さいし","h"),"ene":("エネルギー","k"),
 "kiki":("きき","h"),"taisho":("たいさく","h"),"yosan":("よさん","h"),
 "aisan":("ざいし","h"),"kouritsu":("こうりつ","h"),"kurashi":("くらし","h"),
 "shuumatsu":("しゅうまつ","h"),"kozou":("こうぞう","h"),"kaihyou":("きょう","h"),
 "soutou":("びょうどう","h"),"fukyu":("ふきゅう","h"),"saisu":("さい","h"),
 "kyousei":("きょうせい","h"),"jiyuu":("じゆう","h"),"kenri":("けんり","h"),
 "gimu":("ぎむ","h"),"hoshou":("ほうしょう","h"),"unyou":("うんえい","h"),
 "suisin":("すいしん","h"),"totsunyuu":("とうしゅう","h"),"kakyu":("きゅう","h"),
 "juyou":("じゅうよう","h"),"shihai":("しはい","h"),"tousei":("とうせい","h"),
 "komyuniti":("コミュニティ","k"),"jogai":("ぎょうらい","h"),"noutoku":("のうとく","h"),
 "jichikai":("じちかい","h"),"kaihatsu":("かいはつ","h"),"shinkou":("しんこう","h"),
 "senyuu":("せんゆう","h"),"mirai":("みらい","h"),"yoiron":("ようろん","h"),
 "touhyou":("とうひょう","h"),"hatsugen":("はつげん","h"),"kaikei":("かいけい","h"),
 # science
 "toukeigaku":("とうけいがく","h"),"hyousou":("ひょうそう","h"),
 "heikinkyou":("へいきんちゅう","h"),"henza":("へんさ","h"),
 "samupuru":("サンプル","k"),"denki":("でんき","h"),"taiyou":("たいよう","h"),
 "kaze2":("かぜ","h"),"genshi":("げんし","h"),"denpo":("でんぱつ","h"),
 "seibutsu":("せいぶつ","h"),"igen":("いでん","h"),"saikou":("さいこう","h"),
 "gaisei":("かいせい","h"),"zouho":("じょうほう","h"),"kojin":("こじん","h"),
 "jouhou2":("こじんじょうほう","h"),"shakunin":("ほうじん","h"),
 "poribaishikku":("プライバシー","k"),"unmei":("うんめい","h"),
 "uchuu":("うちゅう","h"),"houshaki":("ロケット","k"),"chikyu":("ちきゅう","h"),
 "getsuyou":("げつよう","h"),"isshou":("えいせい","h"),"iryou":("いりょう","h"),
 "shutsunyu":("しゅつにゅう","h"),"sougou":("しんだん","h"),"yakuhin":("やくひん","h"),
 "chiryou":("ちりょう","h"),"kikou":("きこう","h"),"kikai":("きかい","h"),
 "jinkou-chou":("じんこうちのう","h"),"robo":("ロボット","k"),
 "arugo":("アルゴリズム","k"),"bunseki":("ぶんせき","h"),
 "kiki2":("リスク","k"),"hazard":("ハザード","k"),"yosoku":("よそく","h"),
 "houkoku":("ほうこく","h"),"kankyou-hoju":("かんきょうほご","h"),
 "tenkan2":("きこう","h"),"kisha2":("きしゃ","h"),"kagaku":("かがく","h"),
 "kentei":("けんてい","h"),"jikken":("じっけん","h"),"risshi":("せいこう","h"),
 "shippai2":("しっぱい","h"),"seika2":("せいか","h"),"riron":("りろん","h"),
 # science2
 "kitei":("きてい","h"),"seinin":("おとな","h"),"hoshou2":("ほうしょう","h"),
 "tousei2":("せいぎょ","h"),"hantai3":("はんたい","h"),"sangyou":("さんぎょう","h"),
 "shinko2":("しんしん","h"),"fukumu2":("ふくむ","h"),"koura":("むだ","h"),
 "touka":("トークン化","k"),"tsuuyou":("つうよう","h"),"kiso2":("きそ","h"),
 "kentei2":("かせつ","h"),"shoumei":("しょうめい","h"),"hanrei":("はんれい","h"),
 "kairyou":("かいりょう","h"),"rinen":("りねん","h"),"mokuteki":("もくてき","h"),
 "hyoka":("ひょうか","h"),"koryaku":("こうりゃく","h"),
 # edu3
 "kyoushi":("きょうし","h"),"gakusei":("がくせい","h"),"kyoshitsu":("きょうしつ","h"),
 "hodai":("ほうほう","h"),"kyokugaku":("きょういくがく","h"),"seiseki":("せいせき","h"),
 "shikaku":("しかく","h"),"kyouzai":("きょうざい","h"),"shukudai":("しゅくだい","h"),
 "taiwa":("たいわ","h"),"happyou":("はっぴょう","h"),"guruupu":("グループ","k"),
 "togihou":("とうぎほう","h"),"jiko":("じこ","h"),"ninshiki":("にんしき","h"),
 "riki":("りき","h"),"oen":("おうよう","h"),"kihon":("きほん","h"),
 "jissen":("じっせん","h"),"gakuryoku":("がくりょく","h"),"saidou":("せいた","h"),
 "rengo":("れんごう","h"),"koubun":("こうぶん","h"),"yakugo":("やくご","h"),
 "hatsuon":("はつおん","h"),"choukai":("ちょうかい","h"),"bunkai":("ぶんかい","h"),
 "bunkou":("もくどく","h"),"fantei":("はんてい","h"),"seminaa":("セミナー","k"),
 # edu4
 "gijutsu-kyouiku":("きょういくぎじゅつ","h"),"taburetto":("タブレット","k"),
 "onrain":("オンライン","k"),"digital":("デジタル","k"),"anzen":("あんぜん","h"),
 "shokubun":("しょくぶん","h"),"kyoushoku":("きょうしょく","h"),"shumoku":("しょくむ","h"),
 "jitsuryoku":("じつりょく","h"),"saishin":("さいしん","h"),"jiritsu":("じりつ","h"),
 "jikaku":("じかく","h"),"senkousei":("せんこう","h"),"tokucho":("とくちょう","h"),
 "saisei":("さいせい","h"),"youji":("ようじ","h"),"hoiku":("いく","h"),
 "enji":("ようちえん","h"),"shogaigaku":("しょうがっこう","h"),
 "chugaku":("ちゅうがっこう","h"),"koutou-gakko":("こうとうがっこう","h"),
 "kenkyusei":("けんきゅうせい","h"),"shakaijin":("しゃかいじん","h"),
 "shuushoku":("しゅうしょく","h"),"kunren":("くんにん","h"),"jitsugyo":("じつぎょう","h"),
 "menta":("メンター","k"),"byoudou":("びょうどう","h"),"kyousei2":("ふうとう","h"),
 "hogosha":("ほごしゃ","h"),"oya":("おや","h"),"kokusai":("こくさい","h"),
 "bunkachi":("ぶんかち","h"),"koutei":("かてい","h"),"kuni":("くに","h"),
 "seisaku":("せいさく","h"),"hiyou":("ひよう","h"),"zentai":("ぜんたい","h"),
 "koudou":("こうどう","h"),"kokugo":("こくご","h"),"gaikokugo":("がいこくご","h"),
 "eigo":("えいご","h"),"gakai":("がくがい","h"),"nai":("ない","h"),
 "seikyu":("せいきゅう","h"),"kibou":("きぼう","h"),"yakuwari":("やくわり","h"),
 "tantousha":("たんとうしゃ","h"),"kyouiku-houritsu":("きょういくほうりつ","h"),
 "kurabu":("クラブ","k"),
 # global
 "mushou":("むしょう","h"),"zei2":("かんぜい","h"),"boeki":("ぼうえき","h"),
 "kyoutei":("きょうてい","h"),"kuiki":("くいき","h"),"kokuren":("こくれん","h"),
 "kyouryoku":("きょうりょく","h"),"choukai2":("こうしょう","h"),
 "kyousei3":("しゃくぜん","h"),"heiwa":("へいわ","h"),"fukushi2":("ふくし","h"),
 "kenkou2":("けんこう","h"),"byouki":("びょうき","h"),"yobo":("よぼう","h"),
 "pandemic":("パンデミック","k"),"hakken":("はっけん","h"),
 "kaihatsu3":("かいはつ","h"),"fukyu4":("ひんこん","h"),"kizon":("きぞん","h"),
 "katei2":("かてい","h"),"koho":("こうほう","h"),"hodo":("ほうどう","h"),
 "shuppan":("しゅっぱん","h"),"denshin":("でんしん","h"),"hatten3":("はってん","h"),
 "fukkyuu2":("ふっきゅう","h"),"mokuhyou":("もくひょう","h"),
 "sanka3":("さんか","h"),"kyousai":("きょうさい","h"),"josei":("じょうせい","h"),
 "bunkou2":("こうりゅう","h"),"ryugaku":("りゅうがく","h"),"kouryu":("こうりゅう","h"),
 "housou2":("ほうそう","h"),"tsuushin2":("つうしん","h"),"chousei":("ちょうせい","h"),
 "aisou":("そう","h"),"kaitai":("かいたい","h"),"nanmin":("なんみん","h"),
 "juutaku":("じゅうたく","h"),"nyukan":("にゅうかん","h"),"ryuukou":("りゅうこう","h"),
 "tsuuka":("つうか","h"),"kokumin":("こくみん","h"),"kyoudou":("きょうどう","h"),
 "gijutsu2":("ぎじゅつ","h"),"yusei":("ゆうせい","h"),"kangae":("かんがえ","h"),
 "kankaku":("かんかく","h"),"gaikoku":("がいこく","h"),
}

POS = {"n":"noun","adj-na":"na-adjective","v":"verb"}
SHARDS = ["film2","history","history2","history3","society3","society4",
          "science","science2","edu3","edu4","global"]
missing = []
for shard in SHARDS:
    path = os.path.join(R, shard + ".jsonl")
    out = []
    for line in open(path):
        e = json.loads(line)
        rid = e["id"].split(".")[-1]
        if rid not in KANA:
            missing.append(rid)
            out.append(line)
            continue
        kana, sc = KANA[rid]
        script = "hiragana" if sc == "h" else "katakana"
        e["forms"] = [{"text": kana, "script": script, "is_primary": True}]
        e["readings"] = [{"text": kana, "script": script},
                         {"text": rid, "transliteration_system": "modified-hepburn"}]
        if e.get("part_of_speech") in POS:
            e["part_of_speech"] = POS[e["part_of_speech"]]
        out.append(json.dumps(e, ensure_ascii=False) + "\n")
    with open(path, "w") as f:
        f.writelines(out)
print("missing:", missing)
