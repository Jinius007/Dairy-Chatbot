import pathlib

txt = pathlib.Path("supabase/functions/_shared/balanced-ration-guide.txt").read_text(encoding="utf-8")
lines = txt.split("\n")
out = []
skip = False
for line in lines:
    if line.startswith("SECTION 6:"):
        skip = True
    if line.startswith("SECTION 7:"):
        skip = False
    if not skip:
        out.append(line)
curated = "\n".join(out)
escaped = curated.replace("\\", "\\\\").replace("`", "\\`")
path = pathlib.Path("supabase/functions/_shared/balanced-ration-guide.ts")
path.write_text(
    "// Source: Balanced_Ration_Guide_Indian_Dairy_Farmers.docx (ICAR/NDDB/FAO)\n"
    "export const BALANCED_RATION_GUIDE = `\n"
    + escaped
    + "\n`;\n",
    encoding="utf-8",
)
print("curated chars", len(curated))
