const socket = io.connect('http://localhost:5000');  // Replace with your server URL

let svg, width, height;
let simulation;
let g;  // Group for transformation

socket.on('update', (data) => {
    createGraph(data);
});

function createGraph(data) {
    d3.select("svg").selectAll("*").remove();
    d3.select("#node-list").selectAll("*").remove();

    svg = d3.select("svg");
    width = +svg.attr("width");
    height = +svg.attr("height");

    g = svg.append("g");  // Append a group element for the graph

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink()
            .id(d => d.id)
            .distance(150))  // Set distance between linked nodes
        .force("charge", d3.forceManyBody()
            .strength(-150))  // Increase strength to push nodes apart
        .force("center", d3.forceCenter(width / 2, height / 2));

    let link = g.selectAll(".link")
        .data(data.links)
        .enter().append("line")
        .attr("class", "link")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 2);

    let node = g.selectAll(".node")
        .data(data.nodes)
        .enter().append("g")
        .attr("class", d => `node node--${d.type}`)
        .on("click", function(event, d) {
            event.stopPropagation();
            if (d.children.length) {
                showChildren(d);
            } else {
                showPopup(d);
            }
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("circle")
        .attr("r", d => d.type === 'central' ? 80 : 40)
        .attr("fill", d => d.type === 'central' ? "lightblue" : "lightgreen");

    node.append("text")
        .attr("dx", d => d.type === 'central' ? -63 : -25)
        .attr("dy", 5)
        .text(d => d.id);

    updateNodeList(data.nodes);

    simulation.nodes(data.nodes);
    simulation.force("link").links(data.links);
    simulation.alpha(1).restart();

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
}

function updateNodeList(nodes) {
    const nodeList = d3.select("#node-list");

    const nodeListItems = nodeList.selectAll("li")
        .data(nodes, d => d.id);

    nodeListItems.enter().append("li")
        .text(d => d.id)
        .on("click", function(event, d) {
            d3.selectAll("#node-list li").style("background-color", "white");
            d3.select(this).style("background-color", "#e0e0e0");

            //displayNodeContent(d);
            if (d.children.length) {
                showChildren(d);
            } else {
                showPopup(d);
            }
            centerNode(d);
        });

    nodeListItems.text(d => d.id);
    nodeListItems.exit().remove();
}

function displayNodeContent(node) {
    const content = `Details for ${node.id}`;
    d3.select("#node-content").html(`<h2>${node.id}</h2><p>${content}</p>`);
}

function centerNode(node) {
    const nodeGroup = g.select(`.node.node--${node.type}`);
    if (!nodeGroup.empty()) {
        const nodeData = d3.select(nodeGroup.node()).datum();
        const targetX = width / 2 - nodeData.x;
        const targetY = height / 2 - nodeData.y;

        g.transition()
            .duration(1000)
            .attr("transform", `translate(${targetX}, ${targetY})`);
    }
}

function showChildren(node) {
    // Filter to get only child nodes
    const childNodes = data.nodes.filter(d => node.children.includes(d.id));
    const childLinks = data.links.filter(d => node.children.includes(d.target) || node.children.includes(d.source));

    // Add child nodes to the graph
    const newNodes = g.selectAll(".node")
        .data(childNodes, d => d.id);

    // Enter new nodes
    const enterNodes = newNodes.enter().append("g")
        .attr("class", d => `node node--${d.type}`)
        .on("click", function(event, d) {
            event.stopPropagation();
            if (d.children.length) {
                showChildren(d);
            } else {
                showPopup(d);
            }
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    enterNodes.append("circle")
        .attr("r", 80)
        .attr("fill", d => d.type === 'central' ? "lightblue" : "lightgreen");

    enterNodes.append("text")
        .attr("dy", 4)
        .attr("text-anchor", "middle")
        .text(d => d.id);

    newNodes.exit().remove();

    // Add child links to the graph
    const newLinks = g.selectAll(".link")
        .data(childLinks, d => `${d.source}-${d.target}`);

    newLinks.enter().append("line")
        .attr("class", "link")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 2);

    newLinks.exit().remove();

    // Update simulation with new nodes and links
    simulation.nodes(data.nodes);
    simulation.force("link").links(data.links);
    simulation.alpha(1).restart();

    // Smoothly transition to new positions
    simulation.on("tick", () => {
        g.selectAll(".link")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        g.selectAll(".node")
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });
}

// function showPopup(node) {
//     const popup = d3.select(".popup");
//     popup.classed("open", true);
//     d3.select(".popup-description").text(`Details for ${node.id}`);
// }

function showPopup(node) {
    const popup = d3.select(".popup");
    popup.classed("open", true);

    // Display content based on node type
    const content = `
        <h2>${node.id}</h2>
        <p>${node.details}</p>
        ${node.url ? `<a href="${node.url}" target="_blank">Read more</a>` : ''}
        ${node.url && node.url.includes('youtube') ? `<iframe width="560" height="315" src="${node.url}" frameborder="0" allowfullscreen></iframe>` : ''}
    `;
    //document.body.style.backgroundImage = `url('${imageUrl}')`;
    d3.select(".popup-description").html(content);
}

document.getElementById("back-button").addEventListener("click", () => {
    d3.select(".popup").classed("open", false);
});

// Drag functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

setInterval(() => {
    updateDateTime();
}, 1000);
function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString();
}
function updateDateTime() {
    const centralNodeText = svg.select(`.node.node--central text`);
    if (!centralNodeText.empty()) {
        centralNodeText.text(getCurrentDateTime());
    }
}

