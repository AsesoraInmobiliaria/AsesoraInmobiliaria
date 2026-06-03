import os
import re

workspace_dir = r"c:\JuanmaNetbok\Click24Clientes\inmobiliaria"
key_patterns = [
    r"service_role",
    r"sb_secret",
    r"secret",
    r"key\s*=\s*['\"][a-zA-Z0-9_\-\.]{50,}['\"]"
]

found = False
for root, dirs, files in os.walk(workspace_dir):
    for file in files:
        if file.endswith((".js", ".html", ".css", ".txt", ".json", ".env")):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                for pattern in key_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        print(f"Found potential match in {file}: {matches}")
                        found = True
            except Exception as e:
                pass

if not found:
    print("No service role keys or secret keys found in the workspace.")
