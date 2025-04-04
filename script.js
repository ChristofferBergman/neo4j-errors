const searchInput = document.getElementById('searchMessage');
const oldErrorField = document.getElementById('oldError');
const gqlCodeField = document.getElementById('gqlCode');
const genericField = document.getElementById('gqlCodeGeneric');
const gqlLink = document.getElementById('gqlLink');
const genericLink = document.getElementById('genericLink');
const searchResultsList = document.getElementById('searchResults');

let data = null;
let currentResults = [];
let othersWithGql = "";
let othersWithGeneric = "";

async function viewOthersWithGql() {
    viewOthers(othersWithGql, gqlCodeField.value);
}

async function viewOthersWithGenericGql() {
    viewOthers(othersWithGeneric, genericField.value);
}

async function viewOthers(content, code) {
    Swal.fire({
        title: 'Other errors using ' + code,
        input: 'textarea',
        inputValue: content,
        showCancelButton: false,
        confirmButtonText: 'Close',
        showConfirmButton: true,
        didOpen: () => {
            const textarea = Swal.getInput();
            if (textarea) {
                textarea.readOnly = true;
                textarea.wrap = 'off';
                textarea.style.whiteSpace = 'pre';
                textarea.style.overflowX = 'auto';
                textarea.style.cursor = 'default';
                textarea.style.backgroundColor = '#f9f9f9';
                textarea.scrollTop = 0;
            }
        }
    });
}

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

function loadOtherErrors(code) {
    let errors = 'Each line represents an error\n------------------------------';
    for (const row of data) {
        if (row['GQL'] == code || row['Cause'] == code) {
            errors += '\n';
            errors += row['Old Error'];
        }
    }
    return errors;
}

// Update the link buttons
function updateLink(field, secondary, gqlCode) {
    const docUrl = `https://neo4j.com/docs/status-codes/current/errors/gql-errors/${gqlCode}/`;
    
    if (gqlCode == '' || gqlCode.includes('|') || gqlCode.includes(',') || gqlCode.includes(' ') || gqlCode.length != 5) {
        secondary.setAttribute('disabled', 'true');
        field.setAttribute('disabled', 'true');
    } else {
        secondary.removeAttribute('disabled');
        field.removeAttribute('disabled');
        field.href = docUrl;
    }
}

function updateFieldsFromRow(row) {
    oldErrorField.value = row['Old Error'] || '';
    if (row['GQL'] == 'N/A') {
        gqlCodeField.value = 'This error is no longer used';
        genericField.value = '';
    } else if (row['Cause'] == '') {
        // If cause is empty, set GQL as the detailed GQLSTATUS
        gqlCodeField.value = row['GQL'] || '';
        genericField.value = '';
    } else {
        // Otherwise, use the cause as the detailed GQLSTATUS
        gqlCodeField.value = row['Cause'] || '';
        genericField.value = row['GQL'] || '';
    }
    
    updateLink(gqlLink, gqlOthers, gqlCodeField.value);
    updateLink(genericLink, genericOthers, genericField.value);
    
    othersWithGql = loadOtherErrors(gqlCodeField.value);
    othersWithGeneric = loadOtherErrors(genericField.value);
}

function renderSearchResults(results) {
    searchResultsList.innerHTML = ''; // Clear
    results.slice(0, 5).forEach((res, index) => {
        const li = document.createElement('li');
        li.textContent = res.item['Old Error'];
        li.dataset.index = index;
        li.addEventListener('click', () => {
            selectResult(index);
        });
        searchResultsList.appendChild(li);
    });
    
    // Auto-select the first one
    if (results.length > 0) {
        selectResult(0);
    } else {
        searchResultsList.innerHTML = '';
        oldErrorField.value = gqlCodeField.value = genericField.value = '';
    }
}

function selectResult(index) {
    // Highlight selected item
    const allItems = searchResultsList.querySelectorAll('li');
    allItems.forEach((li, i) => {
        li.classList.toggle('selected', i === index);
    });
    
    const selected = currentResults[index];
    if (selected) {
        updateFieldsFromRow(selected.item);
    }
}

// Main
(async function () {
    const csvUrl = "https://raw.githubusercontent.com/ChristofferBergman/neo4j-errors/refs/heads/main/errors.csv";
    data = await loadCSV(csvUrl);
    
    // Initialize Fuse (i.e. Fuzzy searcher)
    const fuse = new Fuse(data, {
        keys: ['Old Error'], // field to search
        threshold: 0.4,      // 0.0 = exact match, 1.0 = match anything
        includeScore: true,
    });
    
    // Input listener
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (!query) {
            searchResultsList.innerHTML = '';
            oldErrorField.value = gqlCodeField.value = genericField.value = '';
            updateLink(gqlLink, gqlOthers, gqlCodeField.value);
            updateLink(genericLink, genericOthers, genericField.value);
            return;
        }
        
        currentResults = fuse.search(query);
        renderSearchResults(currentResults);
    });
})();
