import csv
import json
import re

# 設定輸入檔案
FILES = {
    'miner': "Mining and Quarrying.csv",
    'botanist': "Logging and Harvesting.csv"
}

items_db = []

# 初始化語言包結構，包含介面 (ui) 與資料 (item/region...)
# 預先定義好基礎介面的翻譯
locale_db = {
    "zh-TW": {
        "ui": {
            "title": "FFXIV 採集指南",
            "miner": "⛏️ 採礦工",
            "botanist": "🪓 園藝師",
            "progress": "進度",
            "jump_to": "快速跳轉 (等級)",
            "loading": "載入資料中...",
            "time_any": "常駐",
            "done": "完成"
        },
        "item": {}, "region": {}, "area": {}, "location": {}
    },
    "en": {
        "ui": {
            "title": "FFXIV Gathering Log",
            "miner": "⛏️ Miner",
            "botanist": "🪓 Botanist",
            "progress": "Progress",
            "jump_to": "JUMP TO (LEVEL)",
            "loading": "Loading data...",
            "time_any": "Anytime",
            "done": "Done"
        },
        "item": {}, "region": {}, "area": {}, "location": {}
    },
    "ja": {
        "ui": {
            "title": "FFXIV 採集手帳",
            "miner": "⛏️ 採掘師",
            "botanist": "🪓 園芸師",
            "progress": "達成度",
            "jump_to": "レベルジャンプ",
            "loading": "読み込み中...",
            "time_any": "常時",
            "done": "完了"
        },
        "item": {}, "region": {}, "area": {}, "location": {}
    }
}

def clean_text(text):
    return text.strip() if text else ""

def generate_id(text):
    return re.sub(r'[^a-z0-9]', '_', text.lower().strip()).strip('_')

print("開始轉換...")

for job, filename in FILES.items():
    current_level_range = "1-5"
    
    try:
        with open(filename, encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader) # Skip header
            
            for row in reader:
                if len(row) < 2 or "FALSE" not in row[0].upper():
                    potential_level = row[0].strip()
                    if re.match(r'\d+-\d+', potential_level):
                        current_level_range = potential_level
                    continue

                if len(row) < 5: continue
                
                raw_item = clean_text(row[1])
                if not raw_item or raw_item.lower() == "item": continue

                raw_region = clean_text(row[2])
                raw_area = clean_text(row[3])
                raw_location = clean_text(row[4])
                raw_time = clean_text(row[5]) if len(row) > 5 else ""

                item_id = generate_id(raw_item)
                
                # 建立主資料
                entry = {
                    "id": item_id,
                    "job": job,
                    "level": current_level_range,
                    "time": raw_time if raw_time else None,
                    "region_key": generate_id(raw_region), # 使用 Key 參照語言包
                    "area_key": generate_id(raw_area),
                    "location_key": generate_id(raw_location)
                }
                items_db.append(entry)

                # 填入語言包 (預設全部填入英文原名，後續需人工翻譯)
                for lang in ["zh-TW", "en", "ja"]:
                    if item_id not in locale_db[lang]["item"]:
                        locale_db[lang]["item"][item_id] = raw_item
                    
                    # 地點資訊也加入翻譯檔
                    r_key = generate_id(raw_region)
                    a_key = generate_id(raw_area)
                    l_key = generate_id(raw_location)
                    
                    if r_key: locale_db[lang]["region"][r_key] = raw_region
                    if a_key: locale_db[lang]["area"][a_key] = raw_area
                    if l_key: locale_db[lang]["location"][l_key] = raw_location

    except FileNotFoundError:
        print(f"錯誤: 找不到檔案 {filename}")

# 輸出
with open('items.json', 'w', encoding='utf-8') as f:
    json.dump(items_db, f, ensure_ascii=False, indent=2)

with open('locales.json', 'w', encoding='utf-8') as f:
    json.dump(locale_db, f, ensure_ascii=False, indent=2)

print("轉換完成！請開啟 locales.json 進行翻譯工作。")