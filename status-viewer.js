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
    const valueMap = {};
    
    // Collect individual GQL and Cause values
    rows.forEach(row => {
        if (row.GQL && row.GQL !== "N/A") {
            valueMap[row.GQL] = valueMap[row.GQL] || [];
            valueMap[row.GQL].push(row);
        }
        if (row.Cause && row.Cause !== "N/A") {
            valueMap[row.Cause] = valueMap[row.Cause] || [];
            valueMap[row.Cause].push(row);
        }
    });
    
    // Usage map: how many different Statuses use each value
    const usageMap = {};
    data.forEach(row => {
        if (row.GQL && row.GQL !== "N/A") {
            usageMap[row.GQL] = usageMap[row.GQL] || new Set();
            usageMap[row.GQL].add(row.Status);
        }
        if (row.Cause && row.Cause !== "N/A") {
            usageMap[row.Cause] = usageMap[row.Cause] || new Set();
            usageMap[row.Cause].add(row.Status);
        }
    });
    
    gqlCauseList.innerHTML = '';
    Object.keys(valueMap).sort().forEach(value => {
        const li = document.createElement('li');
        li.textContent = value;
        
        const usage = usageMap[value];
        li.classList.add(usage.size === 1 ? 'unique' : 'shared');
        
        li.addEventListener('click', () => {
            selectedGqlCauseKey = value;
            highlightSelected(gqlCauseList, li);
            renderErrorList();
        });
        
        gqlCauseList.appendChild(li);
    });
}

function renderErrorList() {
    const value = selectedGqlCauseKey;
    const rows = data.filter(row =>
                             row.Status === selectedStatus &&
                             (row.GQL === value || row.Cause === value)
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
