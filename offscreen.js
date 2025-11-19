chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessages(message, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessages(message, sendResponse) {
  if (message.target !== 'offscreen-doc') {
    return;
  }

  if (message.type === 'copy-data') {
    const text = message.data;
    const textArea = document.querySelector('#text');
    textArea.value = text;
    textArea.select();
    const result = document.execCommand('copy');
    sendResponse({ success: result });
  }
}
