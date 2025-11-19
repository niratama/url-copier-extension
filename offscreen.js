chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message) {
  if (message.target !== 'offscreen-doc') {
    return;
  }

  if (message.type === 'copy-data') {
    const text = message.data;
    const textArea = document.querySelector('#text');
    textArea.value = text;
    textArea.select();
    document.execCommand('copy');
  }
}
