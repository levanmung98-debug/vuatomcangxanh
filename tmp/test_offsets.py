import json
import re

with open("assets/index-Os1X4Z7e.js", "r", encoding="utf-8") as f:
    bundle = f.read()

pos_enc = bundle.find("const encodeContractToB64 =")
pos_map = bundle.find("const Xm_MapModal =")

print(f"Target slice: {pos_enc} to {pos_map}")
assert pos_enc != -1 and pos_map != -1, "Offsets not found"
