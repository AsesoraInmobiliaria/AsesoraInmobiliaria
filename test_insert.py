import urllib.request
import json

SUPABASE_URL = 'https://kxtbuqgqpgaseiaoclri.supabase.co'
SUPABASE_KEY = 'sb_publishable_KiAQsHfP0ACCEWhAI2_qZg_Ng2KDSas'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

test_property = {
    'operation': 'venta',
    'title': 'Propiedad de prueba',
    'price_label': 'USD 100.000',
    'price_usd': 100000,
    'location': 'Prueba',
    'meters': 100,
    'rooms': 3,
    'bathrooms': 2,
    'extras': 'Ninguno',
    'photos': [],
    'map_link': '',
    'code': 'TEST-123'
}

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/propiedades",
    data=json.dumps([test_property]).encode('utf-8'),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("Success! Row inserted:")
        print(json.dumps(data, indent=2))
        
        # Now let's delete the test row
        row_id = data[0]['id']
        del_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/propiedades?id=eq.{row_id}",
            headers=headers,
            method='DELETE'
        )
        with urllib.request.urlopen(del_req) as del_res:
            print("Successfully deleted the test row.")
            
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
