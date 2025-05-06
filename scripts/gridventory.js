CONFIG.debug.hooks = true;



class gridventoryWindow extends Application {

    constructor(actor, options = {}) {
        super(options);
        this._actor = actor;

    }
    

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sheet", "grid-inventory-window"],
            template: "modules/gridventory/templates/gridventory.hbs",
            width: 800, 
            height: 800, 
            resizable: true,
            title: "Grid Inventory",
        });
    }

    async getData(options={}){
        const ctx = await super.getData(options);
        const inventory = this.actor.getFlag('gridventory','inventory');
        const locations = Object.keys(inventory);
        const itemsUuid = Object.values(inventory);
        var items = {};
        for (var i = 0;i<itemsUuid.length;i++){
            var temp = await fromUuid(itemsUuid[i]);
            items[locations[i]] = temp;
        }

        const rows = this.actor.system.abilities.str.value;
        const cols = this.actor.system.abilities.str.value;
        const totalSlots = rows*cols;
        

        //couldnt figure out why this doesnt work in the init hook so its here now, maybe fix sometime
        Handlebars.registerHelper('filled', function(index,locations){
            if (locations === undefined){
                return;
            }
            if(locations.includes(index.toString())){
                return true;
            }
            return false;
            
    
        });
        console.warn(items);
        console.warn(locations);

        return {
            ...ctx,
            system: this.actor.system,
            rows: rows,
            cols: cols,
            totalSlots: totalSlots,
            items: items,
            locations: locations
        }

    }

    get actor(){
        return this._actor;
    }
    get id(){
        return `gridventory-${this.actor.id}`
    }
    

}

Hooks.on('init', () =>{

    Handlebars.registerHelper('assign', function(varName, varValue, options){
        if(!options.data.root){
            options.data.root = {};
        }
        options.data.root[varName] = varValue;
    });
    Handlebars.registerHelper('multiply',function(a,b){
        const a1 = parseFloat(a);
        const b1 = parseFloat(b);
        if(!isNaN(a1) && !isNaN(b)){
            return a1*b1;
        }
        console.warn("Multiply NaN");
        return 0;
    });

    Handlebars.registerHelper('times',function(n,block){
        let newBlock = '';
        for(var i=0;i<n;i++){
            const data = Handlebars.createFrame({index: i});
            newBlock += block.fn(this, {data: data});
        }
        return newBlock;
    });

    Handlebars.registerHelper('getImage',function(object, index){
        const a = object[index.toString()].img;
        console.warn(a);
        return object[index.toString()].img;
    });

    Handlebars.registerHelper('getTitle',function(object, index){
        return object[index.toString()].title;
    });




});


Hooks.on('renderActorSheetV2', (app, html,data) =>{

    //Construct and add the button that opens the grid-based inventory
    const invTab = html.querySelector('.middle');
    const gridview = document.createElement('i');
    gridview.classList.add('fas');
    gridview.classList.add('fa-th-large');
    gridview.textContent = 'Grid View';
    const gridventoryButton = document.createElement('button');
    gridventoryButton.classList.add('gridventory-button');
    gridventoryButton.title = 'Open Grid';
    gridventoryButton.appendChild(gridview);
    const buttonHtml = `<button type="button" class="gridventory-button" title="Open Grid"><i class="fas fa-th-large"></i> Grid View</button>`;
    invTab.after(gridventoryButton);

    //Open the grid-based inventory
    html.querySelector('.gridventory-button').addEventListener('click', (event) =>{
        event.preventDefault();
        const windowId = `gridventory-${app.actor.id}`;
        let openWindow = Object.values(ui.windows).find(w => w.id === windowId);
        if (openWindow){
            openWindow.bringToTop();
        }
        else{
            new gridventoryWindow(app.actor).render(true);

        }
    });

    


});

Hooks.on('rendergridventoryWindow', async (app,html) =>{

    //Initialize the flag if it doesnt exist yet
    if (!app._actor.getFlag('gridventory','inventory')){
        await app._actor.setFlag('gridventory','inventory',{});
    }


    html.find('.grid-inventory-window').find('.inventory-grid').on('drop', async (event)=>{
        event.preventDefault();
        console.warn(event)


        //Get data of dragged item and store it in a flag
        const dataTransfer = event.originalEvent.dataTransfer;
        console.warn(dataTransfer);
        const dataString = dataTransfer.getData('text/plain');
        console.warn(dataString);
        const droppedData = JSON.parse(dataString);
        const uuid = droppedData.uuid;
        const targetDivID = event.target.id;
        const currInventory = app._actor.getFlag('gridventory','inventory') || {};
        const updateInventory = {
            ...currInventory,
            [targetDivID] : uuid
        };
        await app._actor.setFlag('gridventory','inventory',updateInventory);

        //Change target cell to the item if its empty
        const droppedObject = await fromUuid(uuid);
        const cell = event.target;
        cell.innerHTML = '';
        cell.classList.remove('empty-slot');
        cell.classList.add('occupied-slot');
        const img = document.createElement('img');
        img.src = droppedObject.img;
        img.title = droppedObject.name;
        cell.appendChild(img);
        console.warn(app._actor.getFlag('gridventory','inventory'));
    });

    html.find('.grid-inventory-window').find('.inventory-grid').on('dragstart', async (event)=>{
        const parent = event.target.parentElement;
        const items = app._actor.getFlag('gridventory','inventory');
        const draggedItemUuid = items[parent.id];
        const draggedItem = await fromUuid(draggedItemUuid);
        console.warn(draggedItem);
        var dragData = {};
        dragData = {
            "type" : "Item",
            "uuid" : draggedItemUuid
        }
        event.originalEvent.dataTransfer.setData('text/plain',JSON.stringify(dragData));
        console.warn(event);
        console.warn(JSON.stringify(dragData));
    });


});