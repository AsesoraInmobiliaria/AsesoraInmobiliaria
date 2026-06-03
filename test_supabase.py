import urllib.request
import json

SUPABASE_URL = 'https://kxtbuqgqpgaseiaoclri.supabase.co'
SUPABASE_KEY = 'sb_publishable_KiAQsHfP0ACCEWhAI2_qZg_Ng2KDSas'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/",
    headers=headers
)

try:
    with urllib.request.urlopen(req) as response:
        schema = json.loads(response.read().decode('utf-8'))
        definitions = schema.get("definitions", {})
        propiedades_schema = definitions.get("propiedades", {})
        print("Table 'propiedades' schema columns:")
        properties = propiedades_schema.get("properties", {})
        for col, col_info in properties.items():
            print(f"  {col}: {col_info.get('type')} - {col_info.get('format', '')}")
except Exception as e:
    print("Error querying schema:", e)
