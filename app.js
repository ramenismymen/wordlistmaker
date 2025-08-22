let cefrLists = {};
const levels = ["A1","A2","B1","B2","C1","C2"];
let bookWords = [];  // all words in book
let firstPageText = "";

// Load CEFR lists
async function loadCEFR() {
  for (let lvl of levels) {
    const res = await fetch(`${lvl}.json`);
    cefrLists[lvl] = new Set(await res.json());
  }
}
loadCEFR();

// Get CEFR level of a word
function getCEFR(word) {
  word = word.toLowerCase();
  for (let lvl of levels.slice(0, -1)) {
    if (cefrLists[lvl].has(word)) return lvl;
  }
  return "C2";
}

// Predict unknown words
function predictUnknown(userUnknown, allWords) {
  let userLevels = userUnknown.map(getCEFR);
  let maxIdx = userLevels.length > 0 ? Math.max(...userLevels.map(l => levels.indexOf(l))) : 2;
  let targetLevels = levels.slice(maxIdx);

  let result = {};
  allWords.forEach(word => {
    let lvl = getCEFR(word);
    if (targetLevels.includes(lvl)) {
      result[word] = lvl;
    }
  });
  return result;
}

// Dictionary API lookup
async function getDefinition(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) return null;
    const data = await res.json();
    const meaning = data[0].meanings[0];
    return `${word} (${meaning.partOfSpeech}) — ${meaning.definitions[0].definition}`;
  } catch {
    return `${word} — (no definition found)`;
  }
}

// PDF.js helper
async function loadPDF(file) {
  const fileReader = new FileReader();
  return new Promise((resolve) => {
    fileReader.onload = async function() {
      const typedArray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let textContent = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const text = await page.getTextContent();
        const pageText = text.items.map(t => t.str).join(" ");
        if (pageNum === 1) {
          firstPageText = pageText;
          document.getElementById("page-text").innerText = pageText;
        }
        textContent += " " + pageText;
      }
      resolve(textContent);
    };
    fileReader.readAsArrayBuffer(file);
  });
}

// Tokenize text into words
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

// Handle PDF upload
document.getElementById("pdf-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await loadPDF(file);
  bookWords = tokenize(text);
});

// Handle Sherlock sample
document.getElementById("sample-btn").addEventListener("click", async () => {
  const res = await fetch("sherlock.pdf");
  const blob = await res.blob();
  const text = await loadPDF(blob);
  bookWords = tokenize(text);
});

// Handle analysis
document.getElementById("analyze-btn").addEventListener("click", async () => {
  const inputWords = document.getElementById("unknown-input").value.split(/\s+/).filter(Boolean);
  if (bookWords.length === 0) {
    alert("Please upload a PDF or load Sherlock Holmes sample first!");
    return;
  }

  let predicted = predictUnknown(inputWords, bookWords);

  let output = "Predicted 'Probably Unknown' Words:\n\n";
  for (let [word, lvl] of Object.entries(predicted)) {
    let def = await getDefinition(word);
    output += `${def} [${lvl}]\n`;
  }
  document.getElementById("result").innerText = output;
});
