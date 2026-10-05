import os, json

tsx = []
tsx.append("")
def a(s): tsx.append(s)

a('"use client";')
a("")
a('import { useState } from "react";')
a("")
a("const APP_URL =")
a("  process.env.NEXT_PUBLIC_APP_URL ||")
a('  (typeof window !== "undefined" ? window.location.origin : "");')
a("")

# Build CONSOLE_CODE as raw JS
console_lines = []
console_lines.append("(function(){")
console_lines.append('  var APP_URL = "${APP_URL}";')
console_lines.append("  function fallback() {")
console_lines.append('    var v = localStorage.getItem("persist:root");')
console_lines.append('    if (!v) { alert("persist:root tidak ditemukan."); return; }')
console_lines.append('    location.href = APP_URL + "/#t=" + encodeURIComponent(v);')
console_lines.append("  }")
console_lines.append('  var root = localStorage.getItem("persist:root");')
console_lines.append("  var token = null;")
console_lines.append("  if (root) {")
console_lines.append("    try {")
console_lines.append("      var parsed = JSON.parse(root);")
console_lines.append("      var userStr = parsed.user;")
console_lines.append('      if (typeof userStr === "string") {')
console_lines.append("        var user = JSON.parse(userStr);")
console_lines.append("        if (user && user.access_token) { token = user.access_token; }")
console_lines.append("      }")
console_lines.append("    } catch(e) {}")
console_lines.append("  }")
console_lines.append("  if (!token) { fallback(); return; }")
console_lines.append('  fetch("https://api.fotoyu.com/gs/v1/carts/preview", {')
console_lines.append('    method: "POST",')
console_lines.append("    headers: {")
console_lines.append('      "Content-Type": "application/json",')
console_lines.append('      "Accept": "application/json, text/plain, */*",')
console_lines.append('      "Authorization": "Bearer " + token')
console_lines.append("    },")
console_lines.append("    body: JSON.stringify({page:1,limit:100,selected_products:[]})")
console_lines.append("  })")
console_lines.append("  .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,json:j}; }); })")
console_lines.append("  .then(function(o){")
console_lines.append("    if (o.ok && o.json && o.json.result && Array.isArray(o.json.result.data)) {")
console_lines.append('      location.href = APP_URL + "/#cart=" + encodeURIComponent(JSON.stringify(o.json));')
console_lines.append("    } else { fallback(); }")
console_lines.append("  })")
console_lines.append("  .catch(function(){ fallback(); });")
console_lines.append("})();")

escaped_console = []
for line in console_lines:
    escaped = line.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")
    escaped_console.append(escaped)

a("const CONSOLE_CODE = `" + "\\n".join(escaped_console) + "`;")
a("")

a("interface BookmarkletSectionProps {")
a("  onTokenReceived?: (token: string) => void;")
a("}")
a("")
a("export default function BookmarkletSection({ onTokenReceived }: BookmarkletSectionProps) {")

final = "\\n".join(tsx)

out = r"D:\PYTHON PROJECT\fotoyu downloader\web\components\BookmarkletSection.tsx"
with open(out, "w", encoding="utf-8") as f:
    f.write(final)
print("done")
