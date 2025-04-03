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

// Main
(async function () {
    const csvUrl = "https://raw.githubusercontent.com/ChristofferBergman/neo4j-errors/refs/heads/main/errors.csv";
    const data = await loadCSV(csvUrl);
    
    // Initialize Fuse (i.e. Fuzzy searcher)
    const fuse = new Fuse(data, {
        keys: ['Old Error'], // field to search
        threshold: 0.4,      // 0.0 = exact match, 1.0 = match anything
        includeScore: true,
    });
    
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
        
        const results = fuse.search(searchInput.value.trim());
        if (results.length > 0) {
            const bestMatch = results[0].item;
            oldErrorField.value = bestMatch['Old Error'];
            if (bestMatch['GQL'] == 'N/A') {
                gqlCodeField.value = 'This error is no longer used';
            } else {
                gqlCodeField.value = bestMatch['GQL'];
            }
            causeField.value = bestMatch['Cause'];
        } else {
            oldErrorField.value = gqlCodeField.value = causeField.value = '';
        }
    });
})();
