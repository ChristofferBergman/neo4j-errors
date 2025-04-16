import createApp from "https://unpkg.com/@neo4j-nvl/core@latest/dist/index.js";

const statusSearch = document.getElementById('statusSearch');
const statusList = document.getElementById('statusList');
const result = document.getElementById('result');

const url = 'neo4j+s://452e7e61.databases.neo4j.io';
const user = 'errorexplorer';
const pw = '0e?5\\y{K?|$,y73v1v0#W-XK';

let app;

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
    
    const container = document.getElementById("graph");
    app = await createApp({
        container,
        initialGraphData: {
            nodes: [],            // empty at start
            relationships: []
        }
    });
    
    app.render();
})();

async function renderResultForStatus(status) {
    const driver = neo4j.driver(url,neo4j.auth.basic(user, pw));
    const session = driver.session();
    
    try {
        const result = await session.executeRead(tx => tx.run(
                 `MATCH (s1:Neo4jStatus {status: $status})<-[r1:NEO4JSTATUS]-(e1:Error)-[r2:GQLSTATUS|CAUSE]->(g:GqlStatus)<-[r3:GQLSTATUS|CAUSE]-(e2:Error)-[r4:NEO4JSTATUS]->(s2:Neo4jStatus)
                  RETURN *
                 `, {status}));
        
        const nodesMap = new Map();
        const relationships = [];
        
        result.records.forEach(record => {
            record.values.forEach(value => {
                if (value instanceof neo4j.types.Node) {
                    if (!nodesMap.has(value.identity.toString())) {
                        nodesMap.set(value.identity.toString(), {
                            id: value.identity.toString(),
                            labels: value.labels,
                            properties: value.properties
                        });
                    }
                }
                else if (value instanceof neo4j.types.Relationship) {
                    relationships.push({
                        id: value.identity.toString(),
                        type: value.type,
                        startNode: value.start.toString(),
                        endNode: value.end.toString(),
                        properties: value.properties
                    });
                }
            });
        });
        
        // Update NVL
        app.update({
            nodes: Array.from(nodesMap.values()),
            relationships
        });
    } catch (error) {
        console.error("Neo4j query error:", error);
        return null;
    } finally {
        await session.close();
        await driver.close();
    }
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
