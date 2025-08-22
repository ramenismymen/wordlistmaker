let cefrLists = {};
const levels = ["A1","A2","B1","B2","C1","C2"];

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

// Handle analysis
document.getElementById("analyze-btn").addEventListener("click", async () => {
  const inputWords = document.getElementById("unknown-input").value.split(/\s+/).filter(Boolean);
  
  // TODO: extract words from PDF text (for now simple demo list)
  let allWords = ["restart","tsunami","although","despite","freedom","obscure","vicinity","perplexed"];
  
  let predicted = predictUnknown(inputWords, allWords);

  let output = "Predicted 'Probably Unknown' Words:\n\n";
  for (let [word, lvl] of Object.entries(predicted)) {
    let def = await getDefinition(word);
    output += `${def} [${lvl}]\n`;
  }
  document.getElementById("result").innerText = output;
});

// TODO: Hook PDF.js to read actual PDF text
document.getElementById("sample-btn").addEventListener("click", () => {
  alert("Sherlock Holmes sample PDF would load here!");
});
