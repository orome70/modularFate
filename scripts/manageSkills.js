Hooks.once('init', async function () {
    //On init, we initialise all settings and settings menus for dealing with skills 
    console.log(`Initializing manageSkills`);

    //We will be using this setting to store the world's list of skills.
    game.settings.register("modularFate", "skills", {
        name: "Skill list",
        hint: "This is the list of skills for this particular world.",
        scope: "world",
        config: false,
        type: Object
    });
    //Initialise the setting if it is currently empty.
    if (jQuery.isEmptyObject(game.settings.get("modularFate","skills"))){
        game.settings.set("modularFate","skills",[]);
    }

    // Register a setting for replacing the existing skill list with one of the pre-defined default sets.
    game.settings.register("modularFate", "defaultSkills", {
        name: "Replace Or Clear All World Skills?",
        hint: "Pick a skill set with which to override the world's current skills. CANNOT BE UNDONE.",
        scope: "world",     // This specifies a client-stored setting
        config: true,        // This specifies that the setting appears in the configuration view
        type: String,
        restricted:true,
        choices: {           // If choices are defined, the resulting setting will be a select menu
            "nothing":"No",
            "fateCore":"Yes - Fate Core Defaults",
            "fateCondensed":"Yes - Fate Condensed Defaults",
            "accelerated":"Yes - Fate Accelerated Defaults",
            "clearAll":"Yes - Clear All Skills"
        },
        default: "nothing",        // The default value for the setting
        onChange: value => { // A callback function which triggers when the setting is changed
                if (value == "fateCore"){
                    game.settings.set("modularFate","skills",ModularFateConstants.getFateCoreDefaultSkills());
                }
                if (value=="clearAll"){
                    game.settings.set("modularFate","skills",[]);
                }
                if (value=="fateCondensed"){
                    game.settings.set("modularFate","skills",ModularFateConstants.getFateCondensedDefaultSkills());
                }
                if (value=="accelerated"){
                    game.settings.set("modularFate","skills",ModularFateConstants.getFateAcceleratedDefaultSkills());
                }
                //This menu only does something when changed, so set back to 'nothing' to avoid
                //confusing or worrying the GM next time they open this menu.
                game.settings.set("modularFate","defaultSkills","nothing");
            }
    });

    // Register the menu to setup the world's skill list.
    game.settings.registerMenu("modularFate", "SkillSetup", {
        name: "Skill Setup",
        label: "Setup",      // The text label used in the button
        hint: "Configure this world's skill (or Approach) list.",
        type: SkillSetup,   // A FormApplication subclass which should be created
        restricted: true                   // Restrict this submenu to gamemaster only?
      });
});

// SkillSetup: This is the class called from the options to view and edit the skills.
class SkillSetup extends FormApplication{
    constructor(...args){
            super(...args);
    }

    //Set up the default options for instances of this class
    static get defaultOptions() {
        const options = super.defaultOptions; //begin with the super's default options
        //The HTML file used to render this window
        options.template = "systems/modularFate/templates/SkillSetup.html"; 
        options.width = "auto";
        options.height = "auto";
        options.title = `Setup Skills for world ${game.world.title}`;
        options.closeOnSubmit = true;
        options.id = "SkillSetup"; // CSS id if you want to override default behaviors
        options.resizable = false;
        return options;
    }
    //The function that returns the data model for this window. In this case, we only need the game's skill list.
    getData(){
        this.skills=game.settings.get("modularFate","skills");
        const templateData = {
           skills:this.skills
        }
        return templateData;
      }
    
      //Here are the action listeners
      activateListeners(html) {
        super.activateListeners(html);
        const editButton = html.find("button[id='editSkill']");
        const deleteButton = html.find("button[id='deleteSkill']");
        const addButton = html.find("button[id='addSkill']");
        const selectBox = html.find("select[id='skillListBox']");

        editButton.on("click", event => this._onEditButton(event, html));
        deleteButton.on("click", event => this._onDeleteButton(event, html));
        addButton.on("click", event => this._onAddButton(event, html));
        selectBox.on("dblclick", event => this._onEditButton(event, html));

        Hooks.on('closeEditSkill',async () => {
            this.render(true);
        })
    }
    
    //Here are the event listener functions.
    async _onEditButton(event,html){
        //Launch the EditSkill FormApplication.
        let skills = game.settings.get("modularFate","skills");
        let slb = html.find("select[id='skillListBox']")[0].value;
        for (let i = 0; i< skills.length; i++){
            if (skills[i].name==slb){
                let e = new EditSkill(skills[i]);
                e.render(true);       
            }
        }
    }
    async _onDeleteButton(event,html){
        //Code to delete the selected skill
        //First, get the name of the skill from the HTML element skillListBox
        let slb = html.find("select[id='skillListBox'")[0].value;
        
        //Find that skill in the list of skills
        let skills=game.settings.get("modularFate","skills");
        var index=undefined;
        for (let i = 0;i<skills.length; i++){
            if (skills[i].name === slb){
                index = i;
            }
        }
        //Use splice to cut that skill out of the list of skills
        if (index != undefined){
            skills.splice(index,1);
            //Set the game settings for skills as appropriate.
            await game.settings.set("modularFate","skills",skills);
            this.render(true); 
        }
    }
    async _onAddButton(event,html){
        //Launch the EditSkill FormApplication.
        let e = new EditSkill(undefined);
        e.render(true);
    }
}

//EditSkill: This is the class to edit a specific skill
class EditSkill extends FormApplication{
    constructor(skill){
            super(skill);
            this.skill=skill;
            if (this.skill==undefined){
                this.skill={
                    "name":"",
                    "description":"",
                    "overcome":"",
                    "caa":"",
                    "attack":"",
                    "defend":"",
                    "pc":"true"
                }
            }
        }

    //Here are the action listeners
    activateListeners(html) {
        super.activateListeners(html);
        const saveButton = html.find("button[id='edit_save_changes']");
        saveButton.on("click", event => this._onSaveButton(event, html));
    }
        
    //Here are the event listener functions.
    async _onSaveButton(event,html){
        //Get the name of the skill and the other attributes
        let name = html.find("input[id='edit_skill_name']")[0].value;
        let description = html.find("textarea[id='edit_skill_description']")[0].value;
        let overcome = html.find("textarea[id='edit_skill_overcome']")[0].value;
        let caa = html.find("textarea[id='edit_skill_caa']")[0].value;
        let attack = html.find("textarea[id='edit_skill_attack']")[0].value;
        let defend = html.find("textarea[id='edit_skill_defend']")[0].value;
        let pc = html.find("input[id='edit_pc']")[0].checked;
        let skills=game.settings.get("modularFate","skills");
        let newSkill = {"name":name, "description":description,"overcome":overcome,"caa":caa, "attack":attack,"defend":defend,"pc":pc};

        var existing = false;
        //First check if we already have a skill by that name, or the skill is blank; if so, throw an error.
        if (name == undefined || name ==""){
            ui.notifications.error("You cannot have a skill with a blank name.")
        } else {

            for (let i =0; i< skills.length; i++){
                if (skills[i].name == name){
                    skills[i]=newSkill;
                    existing = true;
                }
            } 
        }
        if (!existing){            
            skills.push(newSkill);
        }
        await game.settings.set("modularFate","skills",skills);
        this.close();
    }    

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "systems/modularFate/templates/EditSkill.html"; 
    
        //Define the FormApplication's options
        options.width = "1000";
        options.height = "auto";
        options.title = `Skill Editor`;
        options.closeOnSubmit = true;
        options.id = "EditSkill"; // CSS id if you want to override default behaviors
        options.resizable = true;
        return options;
    }
    getData(){
        const templateData = {
           skill:this.skill
        }
        return templateData;
        }
}
