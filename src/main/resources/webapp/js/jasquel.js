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

            if (location.hash)
                attach(location.hash);

        }.bind(this));

    window.addEventListener("hashchange", function(event) {

        if (!location.hash)
            return;

        if (!application.tabPages.activePage || application.tabPages.activePage.hash != location.hash)
            attach(location.hash);

    }, false);

    location.hash = "#archive";

});

/* Jasquel application */

var Jasquel = function(options) {

    options.layoutManager = new DockLayout();

    Application.call(this, options);

    /* Create a header. */
    this.header = this.add(new Div({
        align: "top",
        height: "48px",
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
        startRun(application.environmentSelect.selection);
        //application.showModal(this.runDialog);
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

    this.runArchivePage = this.tabPages.add(new TabPage({
        caption: "Run archive",
        icon: "fa.fa-archive",
        hash: "#archive"
    }));

    this.runArchivePage.onactivate = function() {
        location.hash = this.hash;
    };
    
    this.runArchivePage.add(new RunArchive({
        align: "center"
    }))

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
        caption: "Watch",
        icon: "fa.fa-eye",
        closable: true,
        hash: "#watch/" + environment
    }));
    
    application.tabPages.setActive(watchPage);

    watchPage.onclose = function() {

        console.log(this.hash);

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
    
    watchPage.reporter = reporter;
    reporter.createLayout();

    return watchPage;

}

/* Start a new Run for the selected files and folders */

function startRun(environment, reporterPage) {

    var paths = getSelectedPaths();

    $.post(

        "api/run",

        JSON.stringify({
            environment: environment,
            paths: paths,
            threads: 1,
            shared: true
        }),

        function(response) {

            var hash = "#run/" + response.runId;

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

function createRunPage(runId) {

    var runPage = new TabPage({
        caption: "Run",
        icon: "fa.fa-play",
        closable: true,
        hash: "#run/" + runId
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

    runPage.reporter = reporter;
    reporter.createLayout();

    return runPage;

}

function attachRun(reporter, runId) {

    var eventSource = new EventSource(`api/run/${runId}`);
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

        var environment = target.substr(7).toUpperCase();

        if (application.config.environments.indexOf(environment) < 0)
            return;

        reporterPages[target] = createWatchPage(environment);
        startWatch(environment, reporterPages[target].reporter);
        
    } else if (/^#run\//.test(target)) {

        var runId = target.substr(5);

        reporterPages[target] = createRunPage(runId);
        attachRun(reporterPages[target].reporter, runId);

    }

}

/* RunDialog ------------------------------------------------------------------- */

var RunDialog = function() {

    DialogPanel.call(this, {
        title: "Start run"
    });

    this.container.classList.add("run-dialog");

    this.cancelButton = this.buttonPanel.add(new Button({
        align: "right",
        caption: "Cancel",
        onclick: function() {
            application.hideModal();
        }
    }));

    this.startButton = this.buttonPanel.add(new Button({
        align: "right",
        caption: "Start",
        onclick: function() {
            application.hideModal();
            startRun(createRunPage().reporter);
        }
    }));

};

extend(DialogPanel, RunDialog);

