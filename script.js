const margin = {t: 15, r:20, b: 0, l:20};
const size = {w: 1200, h: 750};
const svg = d3.select('svg#sankey');

svg.attr('width', size.w)
    .attr('height', size.h);

const containerG = svg.append('g')
    .classed('container', true)
    .attr('transform', `translate(${margin.l}, ${margin.t})`);
size.w = size.w - margin.l - margin.r;
size.h = size.h - margin.t - margin.b;

//DECLARING GLOBAL VARIABLES
let categories, colorScale, tooltip;


d3.json('data/energy.json')
.then(function(data) {
    let energyData = dataProcessing(data);
    categories = Array.from(new Set(data.nodes.map(d => d.category)));
    drawSankey(energyData);

    tooltip = d3.select('.container')
        .append('div')
        .classed('tooltip', true);

    hover();
});


//--------FUNCTIONS--------

//PROCESSING DATA
function dataProcessing(data){
    let nodeList = Array.from(new Set(data.nodes.map(d => d.name)));

    data.nodes.forEach(d => {
        d.category = d.name.split(' ')[0];
    })

    data.links.forEach(d => {
        d.source = nodeList[d.source];
        d.target = nodeList[d.target];
    })
    return data;
}

//CREATING SANKEY DIAGRAM
function drawSankey(data){

    //sankey layout
    let sankeyLayout = d3.sankey()
        .nodeId(d => d.name)
        .nodeWidth(12)
        .nodePadding(10)
        .extent([[0,0], [size.w, size.h]])

    let sankey = sankeyLayout(data);

    //color scale
    colorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateRdYlBu);
    
    creatingGradients(data);
    drawLinks(data);
    drawNodes(data);
    drawTexts(data);
}

//GETTING COLOR
function getColor(d) {
    let k = categories.indexOf(d);
    return colorScale(k / categories.length)
}

//CREATING GRADIENTS
function creatingGradients(data = data){
    let gradients = containerG.append('g')
        .selectAll('g')
        .data(data.links)
        .join('g');

    linearGradients = gradients.append('linearGradient')
        .attr('id', (d, i) => `Linear${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', d => d.source.x1)
        .attr('x2', d => d.target.x0);
    
    linearGradients.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d => getColor(d.source.category));
    
    linearGradients.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d => getColor(d.target.category));
}

//CREATING LINKS (PATHS)
function drawLinks(data){

    let sankeyLinks = containerG.append('g')
    .selectAll('path')
    .data(data.links)
        .join('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke-width', d => Math.max(1,d.width))
        .attr('stroke-dasharray', '0, 1')
        .attr('index', (d, i) => i)
        .attr('stroke', (d, i) => `url(#Linear${i})`)
        .style('opacity', 0.4)
        .transition()
        .duration(700)
        .attrTween('stroke-dasharray', function(d){
            let length = this.getTotalLength();
            return d3.interpolate(`0, ${length}`, `${length}, ${length}`)
        })
        .delay((d) => {
            let name = d.source.name;
            let selNodeX = data.nodes.filter(d => d.name == name)[0].x0;
            let xCoordSets = Array.from(new Set(data.nodes.map(d => d.x0)));

            let delayScale = d3.scaleLinear()
                .domain([0, size.w])
                .range([0, xCoordSets.length-1]);

            return 700 * Math.ceil(delayScale(selNodeX));
        })
}

//CREATING NODES (RECTANGLES)
function drawNodes(data){
    let nodes = containerG.append('g')
    .selectAll('rect')
    .data(data.nodes)
        .join('rect')
        .classed('nodes', true)
        .attr('id', d => d.name)
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => getColor(d.category));
}

//APPENDING TEXTS
function drawTexts(data){
    let nodeText = containerG.append('g')
    .selectAll('text')
    .data(data.nodes)
        .join('text')
        .attr('x', function(d){
            if(d.x0 > size.w/2) return d.x0 - 3;
            else return d.x0 + 15;
        })
        .attr('y', d => d.y0 + (d.y1 - d.y0)/2)
        .text(d => d.name)
        .style('text-anchor', d => {
            if (d.x0 > size.w/2) return 'end';
            else return 'start';
        })
        .style('dominant-baseline', 'middle');
}


//INTERACTIVITY (MOUSE MOVE-IN MOVE-OUT)
function hover(){
    d3.selectAll('path').on('mouseover', function(e, d){

        d3.selectAll('rect').style('opacity', 0.3);
        d3.selectAll('path').attr('stroke', '#aaa').style('opacity', 0.2);
        d3.selectAll('text').attr('fill', '#aaa').style('opacity', 0.2);

        let index = d3.select(this).attr('index');

        let path = d3.select(this)
            .attr('stroke', (k, i) => `url(#Linear${index})`)
            .style('opacity', 0.7);

        let rect = d3.selectAll('rect').filter(function(k){
            return k.name == d.source.name || k.name == d.target.name;
        }).style('opacity', 1.0);

        let text = d3.selectAll('text')
            .filter(function(k){
                return k.name == d.source.name || k.name == d.target.name;
            })
            .attr('fill', 'rgb(13, 30, 46)')
            .style('opacity', 1.0)
            .style('font-weight', 800);
        
        let html = `<p><b>Flow:</b> ${d.source.name} => ${d.target.name}</p>
            <p><b>Value:</b> ${Math.round(d.source.value * 100) / 100} TWh</p>`;

        //popping up tooltip
        tooltip
            .style('visibility', 'visible')
            .style('left', (e.pageX + 20)+'px')
            .style('top', (e.pageY + 10)+'px')
            .html(html);

    }).on('mouseout', function(e){
        d3.selectAll('path')
            .attr('stroke', (d, i) => `url(#Linear${i})`)
            .style('opacity', 0.4);

        d3.selectAll('rect').style('opacity', 0.9);
        
        d3.selectAll('text')
            .attr('fill', 'rgb(13, 30, 46)')
            .style('opacity', 1.0)
            .style('font-weight', 100);
        
        tooltip.style('visibility', 'hidden');
    })
}