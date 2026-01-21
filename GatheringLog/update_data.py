import json
import time
import urllib.request
import urllib.parse
import urllib.error
import sys

# 設定
ITEMS_FILE = 'items.json'
LOCALES_FILE = 'locales.json'
LIMIT = 9999 # 為了示範，先跑 50 個。若要跑全部請設為 9999

# User Agent
HEADERS = {'User-Agent': 'FFXIV-Gathering-Log-Tool/2.0'}

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def search_garland_id(name):
    """從 Garland Tools 查 ID"""
    base_url = "https://www.garlandtools.org/api/search.php"
    params = {"text": name, "type": "item"}
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data:
                # 優先完全匹配
                for res in data:
                    if res['obj']['n'].lower() == name.lower():
                        return res['id']
                return data[0]['id']
    except Exception as e:
        print(f"  [Garland] Error searching {name}: {e}")
    return None

def get_cafemaker_data(item_id):
    """從 CafeMaker 取得 Icon 和 翻譯"""
    url = f"https://cafemaker.wakingsands.com/item/{item_id}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"  [CafeMaker] HTTP Error {e.code} for ID {item_id}")
    except Exception as e:
        print(f"  [CafeMaker] Error ID {item_id}: {e}")
    return None

def main():
    print("Loading data...")
    items = load_json(ITEMS_FILE)
    locales = load_json(LOCALES_FILE)
    
    en_names = locales.get("en", {}).get("item", {})
    
    # 確保 zh-CN 結構存在
    if "zh-CN" not in locales:
        locales["zh-CN"] = {"ui": {}, "item": {}, "region": {}, "area": {}, "location": {}}

    print(f"Total items: {len(items)}")
    
    processed_count = 0
    updated_icon_count = 0
    updated_cn_count = 0
    updated_ja_count = 0

    for item in items:
        if processed_count >= LIMIT:
            break
            
        item_slug = item['id']
        name_en = en_names.get(item_slug)
        
        # 條件檢查：如果已經有 icon 且已經有簡中翻譯和日文翻譯，就跳過
        has_icon = 'icon' in item and item['icon']
        has_cn = item_slug in locales['zh-CN']['item'] and locales['zh-CN']['item'][item_slug] != name_en
        has_ja = item_slug in locales['ja']['item'] and locales['ja']['item'][item_slug] != name_en
        
        # 為了強制更新或補完，這裡我們設定：只要缺其中一個就跑
        if has_icon and has_cn and has_ja:
            continue

        processed_count += 1
        print(f"[{processed_count}/{LIMIT}] Processing: {name_en} ({item_slug})...")

        # 1. 取得 ID
        # 如果 items.json 未來有儲存 game_id 就不用查了，但目前沒有，所以必須查
        # 為了優化，這裡其實可以把查到的 ID 存回 items.json，不過先保持簡單
        
        # 小優化：如果是 Shard/Crystal 這種通用物品，Garland 搜尋可能會有多個結果
        # 但我們信任 Garland 的排序 (通常基礎物品在前)
        
        item_id = search_garland_id(name_en)
        if not item_id:
            print("  -> ID not found.")
            continue

        # 2. 查詢 CafeMaker
        cm_data = get_cafemaker_data(item_id)
        if not cm_data:
            print("  -> CafeMaker data not found.")
            continue
            
        # 3. 更新 Icon
        icon_path = cm_data.get('Icon')
        if icon_path:
            # CafeMaker 的 icon 路徑通常是 /i/... 
            full_icon = f"https://cafemaker.wakingsands.com{icon_path}"
            if item.get('icon') != full_icon:
                item['icon'] = full_icon
                updated_icon_count += 1
                print(f"  -> Icon updated")

        # 4. 更新 簡體中文翻譯 (Name_chs)
        name_chs = cm_data.get('Name_chs')
        if name_chs:
            locales['zh-CN']['item'][item_slug] = name_chs
            updated_cn_count += 1
            # print(f"  -> CN Name: {name_chs}")

        # 5. 更新 日文翻譯 (Name_ja)
        name_ja = cm_data.get('Name_ja')
        if name_ja:
            locales['ja']['item'][item_slug] = name_ja
            updated_ja_count += 1
            # print(f"  -> JA Name: {name_ja}")
            
        # colddown
        if processed_count % 100 == 0:
            time.sleep(60)

        # 禮貌性延遲
        time.sleep(0.1)

    print("-" * 30)
    print(f"Batch finished.")
    print(f"Icons updated: {updated_icon_count}")
    print(f"CN Names updated: {updated_cn_count}")
    print(f"JA Names updated: {updated_ja_count}")
    
    print("Saving files...")
    save_json(ITEMS_FILE, items)
    save_json(LOCALES_FILE, locales)
    print("Done!")

if __name__ == "__main__":
    main()