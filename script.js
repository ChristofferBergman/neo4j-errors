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

// Update the link buttons
async function updateLink(field, gqlCode) {
    const docUrl = `https://neo4j.com/docs/status-codes/current/errors/gql-errors/${gqlCode}/`;
    
    if (gqlCode == '' || gqlCode.includes('|') || gqlCode.includes(',') || gqlCode.includes(' ') || gqlCode.length > 5) {
        field.setAttribute('disabled', 'true');
    } else {
        field.removeAttribute('disabled');
        field.href = docUrl;
    }
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
    const genericField = document.getElementById('gqlCodeGeneric');
    const gqlLink = document.getElementById('gqlLink');
    const genericLink = document.getElementById('genericLink');
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (!query) {
            oldErrorField.value = gqlCodeField.value = genericField.value = '';
        } else {
            const results = fuse.search(searchInput.value.trim());
            if (results.length > 0) {
                const bestMatch = results[0].item;
                oldErrorField.value = bestMatch['Old Error'];
                if (bestMatch['GQL'] == 'N/A') {
                    gqlCodeField.value = 'This error is no longer used';
                    genericField.value = '';
                } else if (bestMatch['Cause'] == '') {
                    // If cause is empty, set GQL as the detailed GQLSTATUS
                    gqlCodeField.value = bestMatch['GQL'];
                    genericField.value = '';
                } else {
                    // Otherwise, use the cause as the detailed GQLSTATUS
                    gqlCodeField.value = bestMatch['Cause'];
                    genericField.value = bestMatch['GQL'];
                }
            } else {
                oldErrorField.value = gqlCodeField.value = causeField.value = '';
            }
        }
        
        updateLink(gqlLink, gqlCodeField.value);
        updateLink(genericLink, genericField.value);
    });
})();
