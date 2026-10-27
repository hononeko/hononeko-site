// Copy buttons: <button class="copy" data-copy="#id"> copies the text of the element it points to.
for (const button of document.querySelectorAll("button.copy[data-copy]")) {
  const label = button.textContent;
  button.addEventListener("click", async () => {
    const source = document.querySelector(button.dataset.copy);
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source.textContent.trim());
      button.textContent = "Copied";
      button.dataset.copied = "";
    } catch {
      button.textContent = "Press Ctrl+C";
      getSelection()?.selectAllChildren(source);
    }
    setTimeout(() => {
      button.textContent = label;
      delete button.dataset.copied;
    }, 1600);
  });
}
