// Helper to fetch and parse the CSV
async function loadCSV(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
    });
    return parsed.data;
}


// Fuzzy matching (basic Levenshtein distance)
function levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () =>
                              Array(b.length + 1).fill(0)
                              );
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            matrix[i][j] = Math.min(
                                    matrix[i - 1][j] + 1, // deletion
                                    matrix[i][j - 1] + 1, // insertion
                                    matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
                                    );
        }
    }
    return matrix[a.length][b.length];
}

// Main
(async function () {
    const csvUrl = "https://raw.githubusercontent.com/ChristofferBergman/neo4j-errors/refs/heads/main/errors.csv";
    const data = await loadCSV(csvUrl);
    
    const searchInput = document.getElementById('searchMessage');
    const oldErrorField = document.getElementById('oldError');
    const gqlCodeField = document.getElementById('gqlCode');
    const causeField = document.getElementById('cause');
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (!query) {
            oldErrorField.value = gqlCodeField.value = causeField.value = '';
            return;
        }
        
        let bestMatch = null;
        let bestScore = Infinity;
        
        for (const row of data) {
            const score = levenshtein(query.toLowerCase(), row['Old Error'].toLowerCase());
            if (score < bestScore) {
                bestScore = score;
                bestMatch = row;
            }
        }
        
        if (bestMatch) {
            oldErrorField.value = bestMatch['Old Error'];
            if (bestMatch['GQL'] === 'N/A') {
                gqlCodeField.value = 'This error is no longer used';
            } else {
                gqlCodeField.value = bestMatch['GQL'];
            }
            causeField.value = bestMatch['Cause'];
        }
    });
})();
