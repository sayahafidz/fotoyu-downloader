import sys
filepath = sys.argv[1]
with open(filepath, "w", encoding="utf-8") as f:
    for line in sys.stdin:
        f.write(line)
