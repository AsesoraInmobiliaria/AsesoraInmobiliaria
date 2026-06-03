import re

file_path = r"C:\Users\Juanma\.gemini\antigravity\brain\acae88c8-3505-4e63-847c-0775044e6b44\.system_generated\steps\21\content.md"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Find all occurrences of "adinco.net" and print around them
matches = re.finditer(r'adinco\.net/[^\s"\'>]+', text)
print("All adinco.net matches in file:")
for i, m in enumerate(matches):
    print(f"Match {i}: {m.group(0)}")
