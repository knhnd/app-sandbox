async function main() {
  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("empty-state");
  const errorState = document.getElementById("error-state");

  let items;
  try {
    const res = await fetch("data/manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = await res.json();
  } catch (err) {
    console.error("manifest.jsonの読み込みに失敗:", err);
    errorState.hidden = false;
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    emptyState.hidden = false;
    return;
  }

  const frag = document.createDocumentFragment();

  for (const item of items) {
    const card = document.createElement("a");
    card.className = "card";
    card.href = `app.html?id=${encodeURIComponent(item.id)}`;

    const stamp = document.createElement("span");
    stamp.className = "card-stamp";
    stamp.textContent = `No. ${item.id}`;

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "card-thumb-wrap";

    const thumb = document.createElement("img");
    thumb.className = "card-thumb";
    thumb.src = item.thumbnail;
    thumb.alt = `${item.title} のサムネイル`;
    thumb.loading = "lazy";
    thumbWrap.appendChild(thumb);

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = item.title;

    const nickname = document.createElement("p");
    nickname.className = "card-nickname";
    nickname.textContent = item.nickname;

    card.append(stamp, thumbWrap, title, nickname);
    frag.appendChild(card);
  }

  grid.appendChild(frag);
}

main();
