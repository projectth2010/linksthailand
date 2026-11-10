let currentLang = 'en';
let locales = {};
let graphData = { nodes: [], links: [] };

const socket = io.connect('http://localhost:5000');
let svg, width, height, simulation, g, defs;
const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", zoomed);

async function loadLocales(lang) {
    try {
        const response = await fetch(`static/locales/${lang}.json`);
        locales = await response.json();
        updateUIText();
        if (graphData.nodes.length) renderNodeList(graphData.nodes);
    } catch (err) { console.error("Error loading locales:", err); }
}

function updateUIText() {
    document.getElementById('txt-app-title').textContent = locales.app_title;
    document.getElementById('txt-menu-show').textContent = locales.menu_show;
    document.getElementById('txt-menu-member').textContent = locales.menu_member;
    document.getElementById('txt-details-title').textContent = locales.details_title;
    document.getElementById('search-input').placeholder = locales.search_placeholder;
}

function getLocalizedLabel(node) {
    if (node.type === 'category') return locales.categories[node.id] || node.label;
    return node.label;
}

function initViz() {
    const vizArea = document.getElementById('viz-area');
    width = vizArea.clientWidth; height = vizArea.clientHeight;
    svg = d3.select("#main-svg").attr("width", width).attr("height", height).call(zoom);
    g = svg.append("g");
    defs = svg.select("defs");

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.04))
        .force("y", d3.forceY(height / 2).strength(0.04))
        .force("collide", d3.forceCollide().radius(d => (d.type === 'central' ? 80 : (d.type === 'category' ? 60 : 50))).iterations(2))
        .alphaTarget(0.05); // Keep the simulation moving subtly

    window.addEventListener('resize', () => {
        width = vizArea.clientWidth; height = vizArea.clientHeight;
        svg.attr("width", width).attr("height", height);
        simulation.force("center", d3.forceCenter(width / 2, height / 2)).restart();
    });
}

function zoomed(event) { g.attr("transform", event.transform); }

function updateGraph(data) {
    graphData = data;

    // Create Patterns for Images
    const patterns = defs.selectAll(".img-pattern")
        .data(data.nodes.filter(n => n.type === 'news'), d => d.id);

    patterns.exit().remove();

    const patternsEnter = patterns.enter().append("pattern")
        .attr("id", d => `pattern-${d.id}`)
        .attr("class", "img-pattern")
        .attr("width", 1)
        .attr("height", 1)
        .attr("patternContentUnits", "objectBoundingBox");

    patternsEnter.append("image")
        .attr("xlink:href", d => d.image)
        .attr("width", 1)
        .attr("height", 1)
        .attr("preserveAspectRatio", "xMidYMid slice");

    // Links
    const link = g.selectAll(".link").data(data.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);
    link.exit().remove();
    const links = link.enter().append("line").attr("class", "link").merge(link);

    // Nodes
    const node = g.selectAll(".node-group").data(data.nodes, d => d.id);
    node.exit().remove();

    const nodeEnter = node.enter().append("g")
        .attr("class", d => `node-group node--${d.type}`)
        .on("click", (e, d) => showDetails(d))
        .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

    nodeEnter.append("circle")
        .attr("class", "node-base")
        .attr("r", d => d.type === 'central' ? 60 : (d.type === 'category' ? 40 : 35))
        .attr("fill", d => {
            if (d.type === 'central') return "url(#grad-central)";
            if (d.type === 'category') return "url(#grad-category)";
            return `url(#pattern-${d.id})`;
        })
        .style("filter", "url(#gloss-filter)");

    // Add overlay for news images to make them look spherical
    nodeEnter.filter(d => d.type === 'news').append("circle")
        .attr("r", 35)
        .attr("fill", "rgba(255,255,255,0.1)")
        .attr("stroke", "rgba(255,255,255,0.2)")
        .attr("stroke-width", 2)
        .style("pointer-events", "none");

    nodeEnter.append("text")
        .attr("class", "node-label")
        .attr("text-anchor", "middle")
        .attr("dy", d => d.type === 'central' ? 85 : (d.type === 'category' ? 65 : 55));

    const nodes = nodeEnter.merge(node);
    nodes.select("text").text(d => d.type === 'central' ? d.label : getLocalizedLabel(d));

    simulation.nodes(data.nodes);
    simulation.force("link").links(data.links);
    simulation.alpha(0.5).restart();

    simulation.on("tick", () => {
        links.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        nodes.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    renderNodeList(data.nodes);
}

function renderNodeList(nodes) {
    const list = document.getElementById('node-list');
    if (!list) return;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filtered = nodes.filter(n => getLocalizedLabel(n).toLowerCase().includes(searchTerm));
    list.innerHTML = filtered.map(n => `
        <div class="node-item" onclick="focusNode('${n.id}')">
            <div class="node-dot dot-${n.type}"></div>
            <span>${n.type === 'central' ? n.label : getLocalizedLabel(n)}</span>
        </div>`).join('');
}

function focusNode(id) {
    const node = graphData.nodes.find(n => n.id === id);
    if (node) {
        const transform = d3.zoomIdentity.translate(width / 2, height / 2).scale(1.2).translate(-node.x, -node.y);
        svg.transition().duration(750).call(zoom.transform, transform);
        showDetails(node);
    }
}

function showDetails(node) {
    if (node.type === 'central') return;
    const popup = document.getElementById('details-popup');
    const imageUrl = node.image || '';

    // Create a more structured and visually appealing popup content
    document.getElementById('popup-body').innerHTML = `
        <div class="popup-image-container">
            <img src="${imageUrl}" alt="${getLocalizedLabel(node)}" class="popup-image">
            <div class="popup-image-overlay"></div>
        </div>
        <div class="popup-content-wrapper">
            <div class="node-badge badge-${node.type}">${node.type.toUpperCase()}</div>
            <h4 class="popup-node-title">${getLocalizedLabel(node)}</h4>
            <div class="popup-description">${node.details || ''}</div>
            ${node.url ? `
                <div class="popup-footer">
                    <a href="${node.url}" target="_blank" class="popup-link-btn">
                        <span>${locales.read_more || 'Read More'}</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                    </a>
                </div>
            ` : ''}
        </div>
    `;
    popup.classList.add('active');
}

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.1).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0.05); // Resume subtle motion
    d.fx = null;
    d.fy = null;
}

document.getElementById('lang-switcher').addEventListener('change', (e) => { currentLang = e.target.value; loadLocales(currentLang); });
document.getElementById('search-input').addEventListener('input', () => renderNodeList(graphData.nodes));
document.getElementById('popup-close').addEventListener('click', () => document.getElementById('details-popup').classList.remove('active'));

socket.on('update', (data) => updateGraph(data));
initViz();
loadLocales('en');
