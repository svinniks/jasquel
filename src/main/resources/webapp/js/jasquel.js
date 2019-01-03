var ignoreHashChange = false;
var application;
var reporterPages = {};
var treeSelection = [];

$(function() {

    $.get(
        "api/config",
        function(data) {

            var config = JSON.parse(data);
            application = new Jasquel({
                config: config
            });

            window.addEventListener("hashchange", function(event) {

                if (!location.hash)
                    return;

                if (!application.tabPages.activePage || application.tabPages.activePage.hash != location.hash)
                    attach(location.hash);

            }, false);

            if (location.hash)
                attach(location.hash);
            else
                location.hash = "#archive";

        }.bind(this));

});

/* Jasquel application */

var Jasquel = function(options) {

    options.layoutManager = new DockLayout();

    Application.call(this, options);

    /* Create a header. */
    this.header = this.add(new Div({
        align: "top",
        height: "42px",
        classes: ["header"]
    }));
    
    /* Sidebar toggle icon button */
    this.sidebarToggle = this.header.add(new IconButton({
        icon: "fa fa-bars",
        align: "left",
        width: "48px",
        classes: ["sidebar-toggle"]
    }));

    this.sidebarToggle.container.onclick = function() {

        if (this.sidebar.hidden)
            this.sidebar.show();
        else
            this.sidebar.hide();

    }.bind(this);

    /* Logo */

    this.header.add(new Div({
        align: "right",
        classes: ["jasquel-logo"]
    }));

    this.header.add(new Title({
        align: "right",
        project: this.config.project,
        version: this.config.version
    }))

    /* Create content */
    this.content = this.add(new Div({
        layoutManager: new DockLayout({
            gap: "8px"
        }),
        align: "center",
        classes: ["content"]
    }));
    
    /* Create a sidebar, which has test run/watch/refresh toolbar and
       the file tree. */
    this.sidebar = this.content.add(new Div({
        align: "left",
        width: "30%",
        resizeable: true,
        classes: ["sidebar"]
    }));

    /* Create the main toolbar */

    this.toolbar = this.sidebar.add(new Toolbar({
        align: "top"
    }));

    this.environmentSelect = this.toolbar.add(new Select({
        align: "left",
        selection: this.config.environments[0],
        options: this.config.environments
    }));

    this.environmentSelect.container.classList.add("environment-select");

    this.toolbar.add(new Splitter({
        align: "left"
    }));

    this.runDialog = new RunDialog();

    this.runButton = this.toolbar.add(new Button({
        align: "left",
        caption: "Run",
        icon: "fa fa-play"
    }));

    this.runButton.container.onclick = function(event) {

        this.runDialog.setEnvironment(application.environmentSelect.selection);
        this.runDialog.setPaths(getSelectedPaths());

        this.runDialog.publicCheckBox.container.input.checked = false;

        this.runDialog.descriptionTextBox.container.input.value = "";
        this.runDialog.descriptionTextBox.container.input.disabled = true;

        application.showModal(this.runDialog);

        this.runDialog.publicCheckBox.container.input.focus();

    }.bind(this);

    this.watchButton = this.toolbar.add(new Button({
        align: "left",
        caption: "Watch",
        icon: "fa fa-eye"
    }));

    this.watchButton.container.onclick = function(event) {
        location.hash = "#watch/" + application.environmentSelect.selection;
    };

    this.refreshButton = this.toolbar.add(new Button({
        align: "right",
        icon: "fa fa-refresh"
    }));

    this.refreshButton.container.onclick = function(event) {
        refreshFileTree();
    };

    /*
    var pullButton = this.toolbar.add(new Button({
        align: "right",
        icon: "fa fa-download"
    }));
    */

    /* Create the file tree control */

    var fileTree = this.sidebar.add(new Panel({
        align: "center",
        classes: ["file-tree"]
    }));
        
    this.fileTree = $(fileTree.container);

    /* Test run detail tab pages */
    this.tabPages = this.content.add(new TabPages({
        align: "center"
    }));

    let runArchive = new RunArchive({
        align: "center"
    });

    this.runArchivePage = this.tabPages.add(new TabPage({
        caption: "Run archive",
        icon: "fa.fa-archive",
        hash: "#archive",
        runArchive: runArchive
    }));

    this.runArchivePage.onactivate = function() {
        location.hash = this.hash;
        runArchive.runArchivePanelLayout.refresh();
    };
    
    this.runArchivePage.add(runArchive);

    refreshFileTree(); 

}

extend(Application, Jasquel);

/* Title component and version retrieval */

var Title = function(options) {

    Control.call(this, options);

    this.container = dd("div.control.jasquel-title", {
        title: dd("span", this.project),
        version: dd("div.version", "Jasquel v" + this.version)
    });

}

/* File tree loading and displaying */

function refreshFileTree() {

    $.get(
        "api/files",
        function(response) {
            displayFileTree(response);
        }
    );

}

function augmentFileTree(root) {
 
    root.text = root.name;

    for (var childI in root.children)
        augmentFileTree(root.children[childI]);

}

function displayFileTree(root) {

    augmentFileTree(root);

    application.fileTree.jstree("destroy");

    application.fileTree.jstree({
        core: {
            animation: 0,
            themes: {
                stripes: true
            },
            data: [
                root
            ]
        },
        types: {
		    file: {
                icon: "img/file.png" 
            }
		},
        plugins: [
            "types"
        ]
    });

    application.fileTree.on("changed.jstree", fileTreeChange);

}

function fileTreeChange(event, data) {
    treeSelection = data.selected;
}

/* Message dispatcher translates event into 
   reporter method calls. */

var MessageDispatcher = function(reporter) {
    this.reporter = reporter;
};

MessageDispatcher.prototype.dispatchMessage = function(message) {
    
    if (message.event === "RunStart") {

        if (this.reporter.runStart)
            this.reporter.runStart(message.data);

    } else if (message.event === "UnitStart") {

        if (this.reporter.unitStart)
            this.reporter.unitStart(message.data);

    } else if (message.event === "Success") {

        if (this.reporter.success)
            this.reporter.success(message.data);

    } else if (message.event === "Error") {

        if (this.reporter.error)
            this.reporter.error(message.data);

    } else if (message.event === "Info") {

        if (this.reporter.info)
            this.reporter.info(message.data);

    }
    
};

/* If not yet started, starts a new watch session.
   If already started, switch to it. */
function startWatch(environment, reporter) {
    
    $.post(

        "api/watch",

        JSON.stringify({
            environment: environment
        }),

        function(response) {
            attachRun(reporter, response.runId);
        },

        "json"
        
    );

}

function createWatchPage(environment) {
    
    var watchPage = application.tabPages.add(new TabPage({
        caption: environment,
        icon: "fa.fa-eye",
        closable: true,
        hash: "#watch/" + environment
    }));
    
    application.tabPages.setActive(watchPage);

    watchPage.onclose = function() {

        reporterPages[this.hash] = undefined;

        if (reporter.eventSource)
            reporter.eventSource.close();

        if (!application.tabPages.activePage)
            location.hash = "";

    };

    watchPage.onactivate = function() {
        this.reporter.refresh();
        location.hash = this.hash;
    };

    var reporter = watchPage.add(new WatchReporter({
        align: "center",
        environment: environment,
        page: watchPage
    }));

    reporter.shared = false;
    reporter.active = true;

    watchPage.reporter = reporter;
    reporter.createLayout();

    return watchPage;

}

/* Start a new Run for the selected files and folders */

function startRun(environment, paths, shared, description, reporterPage) {

    $.post(

        "api/runs",

        JSON.stringify({
            environment: environment,
            paths: paths,
            threads: 1,
            shared: shared,
            description: description
        }),

        function(response) {

            var hash = "#runs/" + response.runId;

            if (reporterPage) {

                reporterPages[reporterPage.hash] = undefined;

                reporterPage.hash = hash;
                reporterPages[hash] = reporterPage;

                attachRun(reporterPage.reporter, response.runId);

            }

            location.hash = hash;

        },

        "json"

    );

}

function getSelectedPaths() {

    var paths = [];

    treeSelection.forEach(function(nodeId) {

        var node = $(`#${nodeId}`);
        var path = "";

        do {

            if (path)
                path = "/" + path;
        
            var nodeText = $(`#${node.attr("id")}_anchor`).text();
            path = nodeText + path;

            node = node.parent().closest("li.jstree-node");

        } while (node.length > 0);

        paths.push(path);

    });

    return paths;

}

function createRunPage(runId, summary) {

    let caption;

    if (summary.shared) {

        caption = moment(summary.startTime).format("YYYY-MM-DD HH:mm:ss") + " " + summary.environment;

        if (summary.description)
            caption += ": " + summary.description;

    } else
        caption = summary.environment;

    var runPage = new TabPage({
        caption: caption,
        icon: "fa.fa-play",
        closable: true,
        hash: "#runs/" + runId
    });

    application.tabPages.add(runPage);
    application.tabPages.setActive(runPage);

    runPage.onclose = function() {

        reporterPages[this.hash] = undefined;

        if (reporter.eventSource)
            reporter.eventSource.close();

        if (!application.tabPages.activePage)
            location.hash = "";

    };

    runPage.onactivate = function() {
        this.reporter.refresh();
        location.hash = this.hash;
    };

    var reporter = runPage.add(new RunReporter({
        align: "center",
        page: runPage
    }));

    reporter.environment = summary.environment;
    reporter.shared = summary.shared;
    reporter.active = summary.active;

    runPage.reporter = reporter;
    reporter.createLayout();

    return runPage;

}

function attachRun(reporter, runId) {

    var eventSource = new EventSource(`api/runs/${runId}/events`);
    var dispatcher = new MessageDispatcher(reporter);

    reporter.runId = runId;
    reporter.eventSource = eventSource;

    eventSource.onmessage = function(message) {

        var messages = JSON.parse(message.data);

        for (var i = 0; i < messages.length; i++)
            dispatcher.dispatchMessage(messages[i]);

        reporter.reporterLayout.refresh();

    };

    eventSource.onerror = function() {
        eventSource.close();
    }
    
}

/* hashChange attaches to an existing run/watch */

function attach(target) {

    if (reporterPages[target])

        application.tabPages.setActive(reporterPages[target]);

    else if (/^#watch\//.test(target)) {

        let environment = target.substr(7).toUpperCase();

        if (application.config.environments.indexOf(environment) < 0)
            return;

        reporterPages[target] = createWatchPage(environment);
        startWatch(environment, reporterPages[target].reporter);
        
    } else if (/^#runs\//.test(target)) {

        let runId = target.substr(6);

        $.get(
            `api/runs/${runId}/summary`,
            function(summary) {
                reporterPages[target] = createRunPage(runId, summary);
                attachRun(reporterPages[target].reporter, runId);
            }
        );

    }

}

/* RunDialog ------------------------------------------------------------------- */

var RunDialog = function() {

    DialogPanel.call(this, {
        title: "Start test run"
    });

    this.container.classList.add("run-dialog");

    this.cancelButton = this.buttonPanel.add(new Button({
        align: "right",
        caption: "Cancel",
        onclick: function() {
            application.hideModal();
        }
    }));

    this.okButton = this.buttonPanel.add(new Button({
        align: "right",
        caption: "Start",
        onclick: function() {
            application.hideModal();
            startRun(this.environment, this.paths, this.publicCheckBox.container.input.checked, this.descriptionTextBox.container.input.value);
        }.bind(this)
    }));

    this.environmentContainer = this.contentContainer.add(new Div({
        align: "top",
        classes: ["run-dialog-row"]
    }));

    this.environmentContainer.add(new Caption({
        align: "left",
        text: "Environment:",
        classes: ["run-dialog-caption"]
    }));

    this.environmentCaption = this.environmentContainer.add(new Caption({
        align: "left"
    }));

    this.scriptContainer = this.contentContainer.add(new Div({
        align: "center",
        classes: ["run-dialog-row"]
    }));

    this.scriptCaptionContainer = this.scriptContainer.add(new Div({
        width: "110px",
        align: "left",
    }))

    this.scriptCaptionContainer.add(new Caption({
        align: "top",
        text: "Scripts:",
        classes: ["run-dialog-caption"]
    }));

    this.scriptList = this.scriptContainer.add(new ScrollPanel({
        align: "center",
        classes: ["embedded", "run-dialog-scripts"]
    }));

    this.descriptionContainer = this.contentContainer.add(new Div({
        align: "bottom",
        classes: ["run-dialog-row"]
    }));

    this.descriptionContainer.add(new Caption({
        align: "left",
        text: "Description:",
        classes: ["run-dialog-caption"]
    }));

    this.descriptionTextBox = this.descriptionContainer.add(new TextBox({
        align: "center"
    }));

    this.publicRunCheckContainer = this.contentContainer.add(new Div({
        align: "bottom",
        classes: ["run-dialog-row"]
    }));

    this.publicRunCheckContainer.add(new Caption({
        align: "left",
        text: "Public run:",
        classes: ["run-dialog-caption"]
    }));

    this.publicCheckBox = this.publicRunCheckContainer.add(new CheckBox({
        align: "left",
        onchange: function() {

            this.descriptionTextBox.container.input.disabled = !this.publicCheckBox.container.input.checked;

            if (!this.publicCheckBox.container.input.checked)
                this.descriptionTextBox.container.input.value = "";

        }.bind(this)
    }));

};

extend(DialogPanel, RunDialog);

RunDialog.prototype.setEnvironment = function(environment) {
    this.environment = environment;
    this.environmentCaption.setText(environment);
}

RunDialog.prototype.setPaths = function(paths) {

    this.paths = paths;

    this.scriptList.content.innerHTML = "";

    for (let path of paths) {
        this.scriptList.content.appendChild(document.createTextNode(path));
        this.scriptList.content.appendChild(document.createElement("br"));
    }

}