/* Application ------------------------------------------------------- */
var Application = function(options) {

    if (!options)
        options = {};

    options.container = document.body;

    Control.call(this, options);

    this.container.classList.add("application");

    this.modalBackground = dd("div.modal-background", {
        centeredWrapper: dd("div.modal-wrapper")
    });
    this.container.appendChild(this.modalBackground);

    this.modalBackground.addEventListener("click", Application.prototype.hideModal.bind(this), false);
    this.modalBackground.centeredWrapper.addEventListener("click", function(event) {
        event.stopPropagation();
    }, false);

}

extend(Control, Application);

Application.prototype.showModal = function(control) {

    this.modalControl = control;

    this.modalBackground.style.display = "block";
    this.modalBackground.centeredWrapper.appendChild(control.getContainer());

}

Application.prototype.hideModal = function() {

    if (this.modalControl) {

        this.modalBackground.centeredWrapper.removeChild(this.modalControl.getContainer());
        this.modalBackground.style.display = "none";

        this.modalControl = undefined;

    }

}

/* Element ------------------------------------------------------------ */

var Element = function(options) {

    options.container = document.createElement(options.name);

    Control.call(this, options);

    if (this.classes)
        for (var i = 0; i < this.classes.length; i++)
            this.container.classList.add(this.classes[i]);

    if (this.style)
        for (var property in this.style)
            this.container.style[property] = this.style[property];

}

extend(Control, Element);

/* Div ---------------------------------------------------------------- */

var Div = function(options) {

    if (!options)
        options = {};

    options.name = "div";

    Element.call(this, options);
    
}

extend(Element, Div);

/* Panel -------------------------------------------------------------- */

var Panel = function(options) {

    Div.call(this, options);

    this.container.classList.add("panel");

}

extend(Div, Panel);

/* ScrollPanel ------------------------------------------------------- */

var ScrollPanel = function(options) {

    Panel.call(this, options);

    this.content = document.createElement("div");
    this.content.classList.add("scroll-content");

    this.container.appendChild(this.content);

}

extend(Panel, ScrollPanel);

/* Tabs pages -------------------------------------------------------- */

var TabPages = function(options) {

    Div.call(this, options);
   
    this.container.classList.add("tab-pages");
    
    this.tabPanel = document.createElement("div");
    this.tabPanel.classList.add("tab-pages-tabs");

    this.detailPanel = document.createElement("div");
    this.detailPanel.classList.add("tab-pages-details");

    this.container.appendChild(this.tabPanel);
    this.container.appendChild(this.detailPanel);

};

extend(Div, TabPages);

TabPages.prototype.add = function(page) {
    
    // Sets the control as the page's parent
    page.parent = this;

    var tab = dd("div.tab-pages-tab", {
        anchor: dd("a.caption", {
            icon: `span.icon.${page.icon}`,
            caption: dd("span", page.caption)
        })
    })

    // If page is closable by user, then create additional clickable icon
    // on the tab.
    if (page.closable) {

        var closeIcon = dd("span.close-icon.fa.fa-close");

        closeIcon.onclick = function(event){
            page.close();
        };

        tab.appendChild(closeIcon);

    }

    // Set tab click even to to changing the active tab
    tab.anchor.onclick = function(event) {

        if (page != this.activePage) 
            this.setActive(page);

    }.bind(this);

    // Store tab in the page
    page.tab = tab;

    // Adds the page to the end of the page linked-list
    if (this.lastPage) {
        page.prevPage = this.lastPage;
        this.lastPage.nextPage = page;
        this.lastPage = page;
    } else {
        this.firstPage = page;
        this.lastPage = page;
    }

    // Set tab z-indexes and classes
    this.adjustTabs();

    // Append new elements to the container elements
    this.tabPanel.appendChild(tab);
    this.detailPanel.appendChild(page.container);

    // If there is no active page, then set to the page being added.
    if (!this.activePage)
        this.setActive(page);
    // Otherwice hide the contents.
    else
        page.container.style.display = "none";

    return page;

};

TabPages.prototype.adjustTabs = function() {

    var page = this.lastPage;
    var zIndex = 1;

    while (page) {

        if (page == this.firstPage) {
            page.tab.classList.remove("tab-pages-tab-next");
            page.tab.classList.add("tab-pages-tab-first");
        } else {
            page.tab.classList.remove("tab-pages-tab-first");
            page.tab.classList.add("tab-pages-tab-next");
        }
                
        page.tab.style.zIndex = zIndex;

        page = page.prevPage;
        zIndex++;

    }

}

TabPages.prototype.setActive = function(page) {

    if (this.activePage) {

        this.activePage.tab.classList.remove("tab-pages-tab-active");
        this.activePage.tab.style.zIndex--;

        this.activePage.visibleDisplay = this.activePage.container.style.display;
        this.activePage.container.style.display = "none";

        if (typeof(this.activePage.ondeactivate) == "function")
            this.activePage.ondeactivate();

    }
    
    page.tab.classList.add("tab-pages-tab-active");
    page.tab.style.zIndex++;

    page.container.style.display = page.visibleDisplay;
    page.visibleDisplay = undefined;

    this.activePage = page; 

    if (typeof(this.activePage.onactivate) == "function")
        this.activePage.onactivate();

}

/* TabPage --------------------------------------------------------- */

var TabPage = function(options) {

    Div.call(this, options);

    this.container.classList.add("tab-pages-page");

}

extend(Div, TabPage);

TabPage.prototype.close = function() {

    this.container.parentNode.removeChild(this.container);
    this.tab.parentNode.removeChild(this.tab);

    if (this.nextPage)
        this.nextPage.prevPage = this.prevPage;

    if (this.prevPage)
        this.prevPage.nextPage = this.nextPage;    

    if (this == this.parent.firstPage)
        this.parent.firstPage = this.nextPage;

    if (this == this.parent.lastPage)
        this.parent.lastPage = this.prevPage;    

    this.parent.adjustTabs();

    if (this == this.parent.activePage)
        if (this.prevPage)
            this.parent.setActive(this.prevPage)
        else if (this.nextPage)
            this.parent.setActive(this.nextPage)
        else {

            if (typeof(this.ondeactivate) == "function")
                this.ondeactivate();

            this.parent.activePage = undefined;

        }

    if (typeof(this.onclose) == "function")
        this.onclose();

}

/* Button --------------------------------------------------------- */

var Button = function(options) {

    Div.call(this, options);

    this.container = dd("div.control.button")
    
    if (this.icon) {
        this.container.icon = dd("span");
        this.container.icon.setAttribute("class", "button-icon " + this.icon);
        this.container.appendChild(this.container.icon);
    }

    if (this.caption) {
        this.container.caption = dd("span.button-caption", this.caption);
        this.container.appendChild(this.container.caption);
    };

    this.container.addEventListener("click", function() {

        if (this.onclick)
            this.onclick.bind(this)();

    }.bind(this), false);
    
}

extend(Control, Button);

/* ToggleButton ---------------------------------------------------- */

var ToggleButton = function(options) {

    Button.call(this, options);

    if (this.isOn)
        this.container.classList.add("toggle-button-on");

    this.container.onclick = function() {

        if (!this.isOn || !this.isLocked)
            this.toggle();

        if (typeof(this.ontoggle) == "function")
            this.ontoggle(this);

    }.bind(this);

}

extend(Button, ToggleButton);

ToggleButton.prototype.on = function() {
    this.isOn = true;
    this.container.classList.add("toggle-button-on");
}

ToggleButton.prototype.off = function() {
    this.isOn = false;
    this.container.classList.remove("toggle-button-on");
}

ToggleButton.prototype.toggle = function() {
    if (this.isOn)
        this.off();
    else    
        this.on();
}

ToggleButton.prototype.lock = function() {
    this.isLocked = true;
}

ToggleButton.prototype.unlock = function() {
    this.isLocked = false;
}

/* ToggleGroup (helper, not a control) -------------------------------- */
var ToggleGroup = function(buttons, on) {

    this.buttons = buttons;
    this.on = on;

    for (var i = 0; i < buttons.length; i++) {

        this.buttons[i].lock();

        if (this.buttons[i] == on)
            this.buttons[i].on();
        else
            this.buttons[i].off();

        this.buttons[i].ontoggle = function(button) {

            if (this.on != button)
                this.on.off();

            this.on = button;

            if (typeof(this.onchange) == "function")
                this.onchange(this);

        }.bind(this);

    }
       
}

/* IconButton --------------------------------------------------------- */

var IconButton = function(options) {

    Div.call(this, options);

    this.container.classList.add("icon-button");

    this.container.innerHTML = `
        <div class = "icon-button-center">
            <span class = "icon-button-icon ${options.icon}"></span>
        </div>
    `;

}

extend(Div, IconButton);

/* Toolbar -------------------------------------------------------------- */

var toolbarLayout = new DockLayout({
    gap: "2px"
});

var Toolbar = function(options) {

    if (!options)
        options = {};

    options.layoutManager = toolbarLayout;

    Div.call(this, options);

    this.container.classList.add("toolbar");

}

extend(Div, Toolbar);

/* Splitter (for toolbar) ----------------------------------------------- */
var Splitter = function(options) {

    Div.call(this, options);

    this.container.classList.add("splitter");

}

extend(Div, Splitter);

/* Caption - centered text. */
var Caption = function(options) {

    if (!options)
        options = {};

    options.name = "span";

    if (!options.classes)
        options.classes = [];

    options.classes.push("caption");

    Element.call(this, options);

    this.container.innerHTML = options.text;

}

extend(Element, Caption);

Caption.prototype.setText = function(text) {
    this.container.innerHTML = text;
}

/* ProgressBar ------------------------------------------------------- */

var progressBarLayout = new DockLayout();

var ProgressBar = function(options) {

    if (!options)
        options = {};                       

                                                              

    options.layoutManager = progressBarLayout;

    Div.call(this, options);

    this.container.classList.add("progress-bar");

    this.progressPanel = document.createElement("div");
    this.progressPanel.classList.add("progress");

    if (this.vertical) {
        this.progressPanel.style.width = "100%";
        this.progressPanel.style.height = "0%";
    } else {
        this.progressPanel.style.width = "0%";
        this.progressPanel.style.height = "100%";
    }
        
    this.container.appendChild(this.progressPanel);

    this.caption = this.add(new Caption({
        layout: {
            align: "center"
        }
    }));

    if (!this.total)
        this.total = 0;

    if (!this.progress)
        this.progress = 0;

    this.adjustProgress();

}

extend(Div, ProgressBar);

ProgressBar.prototype.adjustProgress = function() {

    if (this.vertical)
        this.progressPanel.style.height = `${this.total ? this.progress / this.total * 100 : 0}%`;
    else
        this.progressPanel.style.width = `${this.total ? this.progress / this.total * 100 : 0}%`;

    this.caption.container.innerHTML = `${this.progress}/${this.total}`;

}

ProgressBar.prototype.set = function(progress, total) {
    
    this.progress = progress;
    
    if (total)
        this.total = total;

    this.adjustProgress();

}

/* DialogTitle ------------------------------------------------------------------ */

var DialogTitle = function(options) {

    Div.call(this, options);

    this.container.classList.add("title");
    this.container.innerHTML = this.title;

}

extend(Div, DialogTitle);

/* DialogPanel ------------------------------------------------------------------ */

var dialogLayout = new DockLayout({
    gap: "8px"
});

var DialogPanel = function(options) {

    if (!options)
        options = {};

    options.layoutManager = dialogLayout;

    Panel.call(this, options);

    this.container.classList.add("dialog");

    this.container.addEventListener("keyup", function(event) {
        if (event.key == "Enter" && this.okButton && this.okButton.onclick)
            this.okButton.onclick();
        else if (event.key == "Escape" && this.cancelButton && this.cancelButton.onclick)
            this.cancelButton.onclick();
    }.bind(this))

    this.titlePanel = this.add(new DialogTitle({
        align: "top",
        title: this.title
    }))

    this.buttonPanel = this.add(new Div({
        align: "bottom",
        classes: ["button-panel"]
    }));

    this.contentContainer = this.add(new Div({
        align: "center",
        classes: ["dialog-content"]
    }))

}

extend(Panel, DialogPanel);

/* Select -------------------------------------------------------------------- */

var Select = function(options) {

    Control.call(this, options);

    this.container = dd("div.control.select", {
        selection: dd("span.selection", this.selection || ""),
        icon: "span.fa.fa-caret-down"
    });

    this.container.on("mouseover", function(event) {
        this.container.classList.add("active");
    }.bind(this));

    this.container.on("mouseout", function(event) {
        this.container.classList.remove("active");
    }.bind(this));

    if (this.options)
        this.setOptions(this.options);
        
};

extend(Control, Select);

Select.prototype.setOptions = function(options) {

    this.options = options;

    if (this.container.selector)
        this.container.removeChild(this.container.selector);

    this.selection = undefined;
    this.container.selection.innerHTML = "";

    this.container.selector = dd("div.selector");
    this.container.appendChild(this.container.selector);

    for (var i = 0; i < this.options.length; i++) {

        var option = dd("div.option", this.options[i]);
        this.container.selector.appendChild(option);

        option.addEventListener("click", function(event) {

            this.select(event.target.innerHTML, true);
            this.container.classList.remove("active");

        }.bind(this), false);

    }

    if (this.options[0])
        this.select(this.options[0], true);

}

Select.prototype.select = function(option, propagate) {

    if (this.selection == option)
        return;

    this.container.selection.innerHTML = option;
    this.selection = option;

    if (this.onselect && propagate)
        this.onselect();

}

/* TextBox */
var TextBox = function(options) {

    Control.call(this, options);

    this.container = dd("div", {
        input: dd("input.text-box-input")
    });

};

extend(Control, TextBox);

/* CheckBox */
var CheckBox = function(options) {

    Control.call(this, options);

    this.container = dd("div", {
        input: dd("input")
    });
    this.container.input.setAttribute("type", "checkbox");

    this.container.input.addEventListener('change', function() {
        if (this.onchange)
            this.onchange();
    }.bind(this));

};

extend(Control, CheckBox);