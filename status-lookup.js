const statusSearch = document.getElementById('statusSearch');
const statusList = document.getElementById('statusList');
const result = document.getElementById('result');

const url = 'neo4j+s://452e7e61.databases.neo4j.io';
const user = 'errorexplorer';
const pw = '0e?5\\y{K?|$,y73v1v0#W-XK';

let filteredStatusList = [];
let allStatuses = [];

function renderStatusList() {
    statusList.innerHTML = '';
    filteredStatusList.forEach(status => {
        const li = document.createElement('li');
        li.textContent = status;
        li.addEventListener('click', () => {
            highlightSelected(statusList, li);
            renderResultForStatus(status);
        });
        statusList.appendChild(li);
    });
}

function highlightSelected(listEl, selectedLi) {
    Array.from(listEl.children).forEach(li => li.classList.remove('selected'));
    selectedLi.classList.add('selected');
}

function filterStatuses(query) {
    const q = query.toLowerCase();
    filteredStatusList = allStatuses.filter(status => status.toLowerCase().includes(q));
    renderStatusList();
    result.value = '';
}

statusSearch.addEventListener('input', () => {
    filterStatuses(statusSearch.value);
});

(async function init() {
    allStatuses = await loadStatus();
    filterStatuses('');
})();

// Placeholder: function to populate the GQL list later
async function renderResultForStatus(status) {
    result.value = 'Please wait...';
    const driver = neo4j.driver(url,neo4j.auth.basic(user, pw));
    const session = driver.session();
    
    try {
        // Find all GQLSTATUS codes only used by this Neo4j Status
        let exclusive = await fetchAllExclusiveCodes(session, status);
        
        // See what errors we would miss by just checking for those
        let missing = await fetchMissingErrors(session, status, exclusive);
        
        // Now see if we can trim the list without missing more errors
        const filtered = [];
        for (const code of exclusive) {
            const sublist = exclusive.filter(c => c !== code);
            const m = await fetchMissingErrors(session, status, sublist);
            
            if (m.length > missing.length) {
                filtered.push(code);
            }
        }
        exclusive = filtered;
        
        // Find all GQLSTATUS codes used by this Neo4j Status (even if used by others)
        let all = await fetchAllCodes(session, status);
        
        // Again try to trim it
        const filtered2 = [];
        for (const code of all) {
            const sublist = all.filter(c => c !== code);
            const m = await fetchMissingErrors(session, status, sublist);
            
            if (m.length != 0) {
                filtered2.push(code);
            }
        }
        all = filtered2;
        
        // See what extra errors we would get by checking for all those
        let extra = await fetchExtraErrors(session, status, exclusive);
        
        if (exclusive.length === 0) {
            result.value = 'There are no GQLSTATUS codes that would only catch ' + status + ' errors\n';
            addAlternative(status, all, extra);
        }
        else if (missing.length === 0) {
            result.value = 'You catch all errors of ' + status + ' by checking for these GQLSTATUS codes:\n';
            exclusive.forEach(code => result.value += ('\n * ' + code));
        } else {
            result.value = 'You catch some errors of ' + status + ' by checking for these GQLSTATUS codes:\n';
            exclusive.forEach(code => result.value += ('\n * ' + code));
            result.value += '\n\nBut you would not catch these errors:\n';
            missing.forEach(code => result.value += ('\n   \"' + code + '\"'));
            result.value += '\n\nThe reason is that the GQLSTATUS of those are shared with other Neo4j Status codes\n';
            addAlternative(status, all, extra);
        }
    } catch (error) {
        console.error("Neo4j query error:", error);
        return null;
    } finally {
        await session.close();
        await driver.close();
    }
}

function addAlternative(status, all, extra) {
    result.value += '\nTo catch all ' + status + ' errors you would need to check for all these\n';
    all.forEach(code => result.value += ('\n * ' + code));
    result.value += '\n\nBut that would also give you these errors that is not of this status:\n';
    extra.forEach(code => result.value += ('\n   \"' + code + '\"'));
}

async function fetchAllExclusiveCodes(session, status) {
    const result = await session.executeRead(tx => tx.run(
        `MATCH (e:Error)-[:NEO4JSTATUS]->(n:Neo4jStatus {code: $status}),
        (e)-[:GQLSTATUS|CAUSE]->(g:GqlStatus)
        WHERE g.code <> "N/A"
        WITH DISTINCT g.code AS code
        WHERE NOT EXISTS {
           MATCH (otherError:Error)-[:NEO4JSTATUS]->(otherNeo:Neo4jStatus),
                 (otherError)-[:GQLSTATUS|CAUSE]->(otherGql:GqlStatus)
           WHERE otherNeo.code <> $status AND otherGql.code = code
        }
        RETURN code
        `, {status}));
    
    return result.records.map(record => record.get('code'));
}

async function fetchAllCodes(session, status) {
    const result = await session.executeRead(tx => tx.run(
        `MATCH (e:Error)-[:NEO4JSTATUS]->(n:Neo4jStatus {code: $status}),
        (e)-[:GQLSTATUS|CAUSE]->(g:GqlStatus)
        WHERE g.code <> "N/A"
        RETURN DISTINCT g.code AS code
        `, {status}));
    
    return result.records.map(record => record.get('code'));
}

async function fetchMissingErrors(session, status, codes) {
    const result = await session.executeRead(tx => tx.run(
        `MATCH (e:Error)-[:NEO4JSTATUS]->(n:Neo4jStatus {code: $status})
        OPTIONAL MATCH (e)-[:GQLSTATUS|CAUSE]->(g:GqlStatus)
        WHERE g.code IN $codes
        WITH e, COUNT(g) AS c
        WHERE c = 0
        RETURN e.olderror AS error
        `, {status, codes}));
    
    return result.records.map(record => record.get('error'));
}

async function fetchExtraErrors(session, status, codes) {
    const result = await session.executeRead(tx => tx.run(
        `MATCH (e:Error)-[:NEO4JSTATUS]->(n:Neo4jStatus)
        WHERE n.code <> status
        MATCH (e)-[:GQLSTATUS|CAUSE]->(g:GqlStatus)
        WHERE g.code IN $codes
        RETURN e.olderror AS error
        `, {status, codes}));
    
    return result.records.map(record => record.get('error'));
}

async function loadStatus() {
    const driver = neo4j.driver(url,neo4j.auth.basic(user, pw));
    const session = driver.session();
    
    try {
        const result = await session.executeRead(tx => tx.run(
                 `MATCH (s:Neo4jStatus)
                  RETURN DISTINCT s.code AS Status ORDER BY s.code
                 ` ));
        
        return result.records.map(record => record.get('Status'));
    } catch (error) {
        console.error("Neo4j query error:", error);
        return null;
    } finally {
        await session.close();
        await driver.close();
    }
}
