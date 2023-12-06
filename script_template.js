
//DECLARE GLOBAL VARIABLES HERE

//CODE FOR  LOADING DATA 
d3.json('data/energy.json')
.then(function(data) {
    let energyData = dataProcessing(data);
    categories = Array.from(new Set(data.nodes.map(d => d.category)));
    drawSankey(energyData);
});


// WRITE YOUR FUNCTIONS HERE


//FUNCTION FOR CREATING SANKEY DIAGRAM
function drawSankey(data){

}
