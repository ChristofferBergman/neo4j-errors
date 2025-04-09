const csvUrl = "./errors.csv";

let data = [];

const statusList = document.getElementById('statusList');
const gqlCauseList = document.getElementById('gqlCauseList');
const errorList = document.getElementById('errorList');

let selectedStatus = null;
let selectedGqlCauseKey = null;

function renderStatusList() {
    const statuses = [...new Set(data.map(row => row.Status))].sort();
    statusList.innerHTML = '';
    statuses.forEach(status => {
        const li = document.createElement('li');
        li.textContent = status;
        li.addEventListener('click', () => {
            selectedStatus = status;
            selectedGqlCauseKey = null;
            highlightSelected(statusList, li);
            renderGqlCauseList();
            errorList.innerHTML = '';
        });
        statusList.appendChild(li);
    });
}

function renderGqlCauseList() {
    const rows = data.filter(row => row.Status === selectedStatus);
    const gqlCauseMap = {};
    
    rows.forEach(row => {
        const key = `${row.GQL}::${row.Cause}`;
        gqlCauseMap[key] = gqlCauseMap[key] || [];
        gqlCauseMap[key].push(row);
    });
    
    // Determine uniqueness
    const gqlCauseUsage = {};
    data.forEach(row => {
        const key = `${row.GQL}::${row.Cause}`;
        gqlCauseUsage[key] = gqlCauseUsage[key] || new Set();
        gqlCauseUsage[key].add(row.Status);
    });
    
    gqlCauseList.innerHTML = '';
    Object.entries(gqlCauseMap).forEach(([key, rows]) => {
        const li = document.createElement('li');
        const [gql, cause] = key.split('::');
        li.textContent = `${gql} – ${cause}`;
        
        const usage = gqlCauseUsage[key];
        li.classList.add(usage.size === 1 ? 'unique' : 'shared');
        
        li.addEventListener('click', () => {
            selectedGqlCauseKey = key;
            highlightSelected(gqlCauseList, li);
            renderErrorList();
        });
        
        gqlCauseList.appendChild(li);
    });
}

function renderErrorList() {
    const [gql, cause] = selectedGqlCauseKey.split('::');
    const rows = data.filter(row =>
                             row.Status === selectedStatus &&
                             (row.GQL === gql || row.Cause === cause)
                             );
    errorList.innerHTML = '';
    rows.forEach(row => {
        const li = document.createElement('li');
        li.textContent = row['Old Error'];
        errorList.appendChild(li);
    });
}

function highlightSelected(listEl, selectedLi) {
    Array.from(listEl.children).forEach(li => li.classList.remove('selected'));
    selectedLi.classList.add('selected');
}

(async function init() {
    const response = await fetch(csvUrl);
    const text = await response.text();
    const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim()
    });
    data = parsed.data;
    renderStatusList();
})();
