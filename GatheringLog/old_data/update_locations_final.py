import json
import time
import urllib.request
import urllib.parse
import urllib.error

ITEMS_FILE = 'items.json'
LOCALES_FILE = 'locales.json'
LIMIT = 9999 # 跑全部

HEADERS = {'User-Agent': 'FFXIV-Gathering-Log-Tool/Final'}
BASE_URL = "https://cafemaker.wakingsands.com"
GARLAND_URL = "https://www.garlandtools.org/api/search.php"
GARLAND_DATA_URL = "https://www.garlandtools.org/db/doc/item/en/3"

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def fetch(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return None

def search_garland_id(name):
    params = {"text": name, "type": "item"}
    url = f"{GARLAND_URL}?{urllib.parse.urlencode(params)}"
    data = fetch(url)
    if data:
        for res in data:
            if res['obj']['n'].lower() == name.lower():
                return res['id']
        return data[0]['id']
    return None

def get_map_name(map_id):
    url = f"{BASE_URL}/PlaceName/{map_id}"
    data = fetch(url)
    if data:
        return data.get('Name_chs') or data.get('Name')
    return None

def get_garland_zones(item_id):
    url = f"{GARLAND_DATA_URL}/{item_id}.json"
    data = fetch(url)
    zones = set()
    if data:
        for p in data.get('partials', []):
            if p['type'] == 'node':
                z = p['obj'].get('z')
                if z: zones.add(z)
    return list(zones)

def main():
    items = load_json(ITEMS_FILE)
    locales = load_json(LOCALES_FILE)
    en_names = locales.get("en", {}).get("item", {})
    
    count = 0
    for item in items:
        if count >= LIMIT: break
        
        name_en = en_names.get(item['id'])
        if not name_en: continue
        
        # 1. Garland ID
        real_id = search_garland_id(name_en)
        if not real_id: continue
        
        # 2. Garland Zones
        zone_ids = get_garland_zones(real_id)
        
        # 3. Resolve Map Names
        loc_names = []
        for z in zone_ids:
            m_name = get_map_name(z)
            if m_name:
                loc_names.append(m_name)
        
        if loc_names:
            # Sort for consistency
            loc_names.sort()
            item['locations'] = loc_names
            print(f"[{count+1}] {name_en}: {', '.join(loc_names)}")
        else:
            print(f"[{count+1}] {name_en}: No zones found.")
            
        count += 1

        if count % 50 == 0:
            time.sleep(20)
            print("Sleeping for 20 seconds...")

        time.sleep(0.1)
        
    save_json(ITEMS_FILE, items)
    print("Done.")

if __name__ == "__main__":
    main()