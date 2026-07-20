import fs from "node:fs";

const dirs = ["investigations", "evidence-briefs", "document-autopsies", "dispatches"];

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const flatten = (value) => {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && Array.isArray(value["@graph"])) return flatten(value["@graph"]);
  return value ? [value] : [];
};

const normalizeItem = (entry) => {
  if (!entry) return entry;
  if (typeof entry.item === "object") return { ...entry, ...entry.item };
  return entry;
};

const findBreadcrumb = (html) => {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scripts) {
    try {
      for (const item of flatten(JSON.parse(match[1].trim()))) {
        const type = item?.["@type"];
        if (
          (type === "BreadcrumbList" || (Array.isArray(type) && type.includes("BreadcrumbList"))) &&
          Array.isArray(item.itemListElement)
        ) {
          return item.itemListElement.map(normalizeItem).sort((a, b) => (a.position || 0) - (b.position || 0));
        }
      }
    } catch {
      // Existing JSON-LD issues are handled by the regression harness.
    }
  }
  return null;
};

const hrefFromItem = (item) => {
  const value = item?.item || "";
  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return value || "/";
  }
};

const changed = [];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir, { recursive: true })) {
    if (!file.endsWith(".html")) continue;
    const filePath = `${dir}/${file}`;
    let html = fs.readFileSync(filePath, "utf8");
    if (html.includes("breadcrumb-nav") || !html.includes("BreadcrumbList") || /noindex/i.test(html)) continue;
    const breadcrumb = findBreadcrumb(html);
    if (!breadcrumb) continue;
    const items = breadcrumb
      .map((item, index) => {
        const name = escapeHtml(item.name);
        if (index === breadcrumb.length - 1) return `      <li><span aria-current="page">${name}</span></li>`;
        return `      <li><a href="${escapeHtml(hrefFromItem(item))}">${name}</a></li>`;
      })
      .join("\n");
    const nav = `  <nav class="breadcrumb-nav" aria-label="Breadcrumb">\n    <ol>\n${items}\n    </ol>\n  </nav>\n`;
    html = html.replace(/(<\/header>\s*)/, `$1\n${nav}`);
    fs.writeFileSync(filePath, html);
    changed.push(filePath);
  }
}

console.log(changed.join("\n"));
