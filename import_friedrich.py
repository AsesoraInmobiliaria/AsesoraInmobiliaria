import json
import urllib.request
import os

# Load keys from .env
env_vars = {}
try:
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line:
                k, v = line.strip().split("=", 1)
                env_vars[k] = v
except Exception as e:
    print("Could not read .env file:", e)

SUPABASE_URL = env_vars.get("SUPABASE_URL", "https://kxtbuqgqpgaseiaoclri.supabase.co")
# We use the Service Role key to bypass RLS and insert the property cleanly
SUPABASE_KEY = env_vars.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_KEY:
    print("Error: SUPABASE_SERVICE_ROLE_KEY not found in .env!")
    exit(1)

# Load the scraped next data
try:
    with open("scraped_next_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    print("Error reading scraped_next_data.json:", e)
    exit(1)

prop = data["props"]["pageProps"]["property"]

# Extract and reconstruct fields
code = str(prop.get("code", "1844"))
title = prop.get("title", "CASA EN VENTA - GENERAL RODRIGUEZ").upper()
operation = prop.get("operation", "venta").lower()

price_num = prop.get("price", 150000)
# Format price label: e.g. USD 150.000
price_label = f"USD {price_num:,}".replace(",", ".")

# Location
location = "General Rodríguez"

# Areas
covered_area = prop.get("coveredArea", 160)
meters = int(covered_area) if covered_area else 160

# Rooms/Ambientes (map 3 bedrooms to 4 ambientes)
rooms = int(prop.get("rooms", 0))
if rooms == 0:
    bedrooms = int(prop.get("bedrooms", 3))
    rooms = bedrooms + 1 # 3 bedrooms = 4 ambientes

bathrooms = int(prop.get("bathrooms", 1))

# Extras
extras_list = ["Piscina", "parque", "parrilla", "jardín", "solarium", "galería semicubierta"]
extras = ", ".join(extras_list)

# Map link
map_link = "Asturias 300, General Rodríguez, Buenos Aires, Argentina"

# Photos: Reconstruct Adinco URLs
multimedia = prop.get("multimedia", [])
photos = []
for item in multimedia:
    src = item.get("src")
    if src and "/" in src:
        folder, filename = src.split("/", 1)
        # Reconstruct standard Adinco high-resolution url
        photo_url = f"https://static1.adinco.net/{folder}/extra_large_u_{filename}"
        photos.append(photo_url)

# If no photos were reconstructed, add a fallback placeholder
if not photos:
    photos = [
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80"
    ]

# Construct properties row matching Supabase schema
supabase_row = {
    "code": code,
    "title": title,
    "operation": operation,
    "price_label": price_label,
    "price_usd": price_num,
    "location": location,
    "meters": meters,
    "rooms": rooms,
    "bathrooms": bathrooms,
    "extras": extras,
    "photos": photos,
    "map_link": map_link
}

print("Property data to insert:")
print(json.dumps(supabase_row, indent=2, ensure_ascii=False))

# Make HTTP Request to Supabase to insert row
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/propiedades",
    data=json.dumps([supabase_row]).encode('utf-8'),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        print("\nSuccess! Row successfully inserted into Supabase:")
        print(json.dumps(res_data, indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    print(f"\nHTTP Error {e.code}: {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print("\nError performing insert:", e)
