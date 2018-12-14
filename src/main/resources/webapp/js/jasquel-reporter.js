var Duration = function(milliseconds) {

    this.milliseconds = milliseconds;

    this.seconds = Math.floor(milliseconds / 1000);
    this.secondMilliseconds = milliseconds % 1000;

    this.minutes = Math.floor(this.seconds / 60);
    this.minuteSeconds = this.seconds % 60;

    this.hours = Math.floor(this.minutes / 60);
    this.hourMinutes = this.minutes % 60;

}

Duration.prototype.toSecondTime = function() {

    return this.seconds + "." + ("000" + this.secondMilliseconds).slice(-3);

}

Duration.prototype.toMinuteTime = function() {

    return this.minutes + ":" + ("00" + this.minuteSeconds).slice(-2) + "." + ("000" + this.secondMilliseconds).slice(-3);

}

Duration.prototype.toHourTime = function() {

    return ("00" + this.hours).slice(-2) + ":" + ("00" + this.hourMinutes).slice(-2) + ":" + ("00" + this.minuteSeconds).slice(-2);

}

var Reporter = function(options) {

    Div.call(this, options);

    this.unitStack = [];

};

extend(Div, Reporter);

Reporter.prototype.createLayout = function() {

    this.toolPanel = this.add(new Div({
        align: "top"
    }));

    this.toolbar = this.toolPanel.add(new Toolbar({
        align: "left",
        classes: ["embedded"]
    }));
    
    this.toggleAutoScroll = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-angle-double-down",
        caption: "Auto",
        isOn: this.active,
        ontoggle: function() {

            if (this.toggleAutoScroll.isOn) {
                this.reporterLayout.autoScroll = true;
                this.reporterLayout.refresh();
            } else
                this.reporterLayout.autoScroll = false;
            
        }.bind(this)
    }));

    this.toolbar.add(new Splitter({
        align: "left"
    }));

    this.displayScripts = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-file-text",
        caption: "Scripts"
    }));

    this.displaySuites = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-folder-o",
        caption: "Suites"
    }));

    this.displayTests = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-check",
        caption: "Tests"
    }));

    this.displaySteps = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-circle-o step-icon",
        caption: "Steps"
    }));

    this.displayCalls = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-database",
        caption: "Calls"
    }));

    this.toggleDisplay = new ToggleGroup(
        [this.displayScripts, this.displaySuites, this.displayTests, this.displaySteps, this.displayCalls],
        this.active ? this.displayTests : this.displayScripts
    );
    
    this.toggleDisplay.onchange = function() {

        if (this.toggleDisplay.on == this.displayScripts)
            this.display("scripts");
        else if (this.toggleDisplay.on == this.displayTests)
            this.display("tests");
        else if (this.toggleDisplay.on == this.displaySuites)
            this.display("suites");
        else if (this.toggleDisplay.on == this.displaySteps)
            this.display("steps");
        else
            this.display("calls");

    }.bind(this);

    this.toolbar.add(new Splitter({
        align: "left"
    }));

    if (!this.shared)
        this.clearButton = this.toolbar.add(new Button({
            align: "left",
            icon: "fa fa-eraser",
            caption: "Clear",
            onclick: function() {

                this.detailPanel.clear();
                this.detailPanel.setPassCount(0);
                this.detailPanel.setFailCount(0);
                this.detailPanel.setSetupFailure(false);

                if (this.unitStack.length > 1) {

                    var scriptPanel = this.unitStack[1].control;

                    this.detailPanel.add(scriptPanel);
                    this.detailPanel.setPassCount(scriptPanel.passCount);
                    this.detailPanel.setFailCount(scriptPanel.failCount);
                    this.detailPanel.setSetupFailure(scriptPanel.setupFailure);

                } else {

                    this.detailPanel.resetDuration();

                }

                this.reporterLayout.refresh();

            }.bind(this)
        }));

    if (this.active) {

        this.stopButton = this.toolbar.add(new Button({
            align: "left",
            icon: "fa fa-stop",
            caption: "Stop"
        }));

        this.stopButton.container.querySelector(".button-icon").style.color = "#880000";

    }

    this.summaryPanel = this.toolPanel.add(new SummaryPanel({
        align: "right"
    }));

    /*
    this.progressBar = this.toolbar.add(new ProgressBar({
        align: "center",
        total: 0,
        progress: 0
    }));
    */

    this.reporterLayout = new FeedLayout({
        autoRefresh: false,
        autoScroll: this.active,
        onscroll: function() {
            this.toggleAutoScroll.off();
            this.reporterLayout.autoScroll = false;
        }.bind(this)
    });

    this.detailPanel = this.add(new DetailPanel({
        layoutManager: this.reporterLayout,
        align: "center",
        classes: ["embedded", "detail-panel"],
        summaryPanel: this.summaryPanel
    }));

}

Reporter.prototype.refresh = function() {
    this.reporterLayout.refresh();
}

Reporter.prototype.displayControl = function(control, what) {

    if (what == "scripts")

        this.reporterLayout.collapse(control, true);

    else if (what == "suites" && (control instanceof SuitePanel || control instanceof TestPanel || control instanceof StepPanel || control instanceof CallPanel))

        this.reporterLayout.collapse(control, true);

    else if (what == "tests" && (control instanceof TestPanel || control instanceof StepPanel || control instanceof CallPanel))

        this.reporterLayout.collapse(control, true);

    else if (what == "steps" && (control instanceof StepPanel || control instanceof CallPanel))

        this.reporterLayout.collapse(control, true);

    else if (what == "calls" && control instanceof CallPanel)

        this.reporterLayout.collapse(control, true);

    else {

        this.reporterLayout.expand(control);

        var child = control.firstChild;
        while (child) {
            this.displayControl(child, what);
            child = child.nextSibling;
        }

    }

}

Reporter.prototype.display = function(what) {

    if (this.reporterLayout.scrollableControls._size == 0)
        return;

    var topControl = this.reporterLayout.scrollableControls.getRanked(this.reporterLayout.rank);

    var child = this.detailPanel.firstChild;

    while (child) {
        this.displayControl(child, what);
        child = child.nextSibling;
    }

    while (!this.reporterLayout.scrollableControls.get(topControl.feedLayoutId))
        topControl = topControl.parent;

    this.reporterLayout.rank = this.reporterLayout.scrollableControls.rank(topControl.feedLayoutId);
    this.reporterLayout.refresh();
    
}

/* Jasquel message consumer methods */

Reporter.prototype.runStart = function(data) {

    if (this.progressBar)
        this.progressBar.set(0, data.scripts.length);

    if (this.stopButton)
        this.stopButton.show();

    this.unitStack.push({
        type: "Run",
        control: this.detailPanel
    });

}

Reporter.prototype.unitStart = function(data) {

    console.log(JSON.stringify(data));

    var control;
    var parentUnit = this.unitStack.peek();

    if (data.unit.type == "Script") {

        control = parentUnit.control.add(new ScriptPanel({
            collapsed:
                this.toggleDisplay.on == this.displayScripts,
            scriptName: data.unit.name
        }));

    } else if (data.unit.type == "Suite") {

        control = parentUnit.control.add(new SuitePanel({
            collapsed:
                this.toggleDisplay.on == this.displayScripts
                || this.toggleDisplay.on == this.displaySuites,
            suiteName: data.unit.name
        }));

    } else if (data.unit.type == "Test" || data.unit.type == "Setup" || data.unit.type == "Teardown") {

        control = parentUnit.control.add(new TestPanel({
            collapsed:
                this.toggleDisplay.on == this.displayScripts
                || this.toggleDisplay.on == this.displaySuites
                || this.toggleDisplay.on == this.displayTests,
            testType: data.unit.type,
            testName: data.unit.name
        }));

    } else if (data.unit.type == "Step") {

        control = parentUnit.control.add(new StepPanel({
            collapsed:
                this.toggleDisplay.on == this.displayScripts
                || this.toggleDisplay.on == this.displaySuites
                || this.toggleDisplay.on == this.displayTests
                || this.toggleDisplay.on == this.displaySteps,
            testName: data.unit.name
        }));

    } else if (data.unit.type == "Call") {

        control = parentUnit.control.add(new CallPanel({
            collapsed: true,
            method: data.unit.name,
            line: data.unit.lineNumber,
            params: data.unit.params
        }));

        control.detailPanel = control.add(new CallDetails());

    }

    this.unitStack.push({
        type: data.unit.type, 
        control: control
    });

}

Reporter.prototype.success = function(data) {

    var unit = this.unitStack.pop();

    if (unit.control.pass)
        unit.control.pass(data.result);
    
    if (unit.control.setDuration)
        unit.control.setDuration(data.duration);

    if (unit.type == "Test")

        for (var i = 0; i < this.unitStack.length; i++) {
            var control = this.unitStack[i].control;
            control.setPassCount(control.passCount + 1);
        }

    else if (unit.type == "Run")
    
        this.onrunend();

}

Reporter.prototype.error = function(data) {

    let unit = this.unitStack.pop();

    if (unit.control.fail)
        unit.control.fail(data.message);

    if (unit.control.setDuration)
        unit.control.setDuration(data.duration);

    if (unit.type == "Test")
        for (var i = 0; i < this.unitStack.length; i++) {
            let control = this.unitStack[i].control;
            control.setFailCount(control.failCount + 1);
        }
    else if (unit.type == "Setup" || unit.type == "Teardown")
        for (var i = 0; i < this.unitStack.length; i++) {
            let control = this.unitStack[i].control;
            control.setSetupFailure(true);
        }
    else if (unit.type == "Run")
        this.onrunend();

}

Reporter.prototype.info = function(data) {

    var unit = this.unitStack.peek();

    unit.control.add(new InfoPanel({
        message: data.message
    }));

}

Reporter.prototype.onrunend = function() {

};

/* RunReporter ----------------------------------------------- */

var RunReporter = function(options) {

    Reporter.call(this, options);

};

extend(Reporter, RunReporter);

RunReporter.prototype.createLayout = function() {

    Reporter.prototype.createLayout.bind(this)();

    if (this.stopButton)
        this.stopButton.onclick = function() {

            $.ajax({
                url: `api/runs/${this.runId}`,
                method: "PUT"
            });

            this.stopButton.hide();

        }.bind(this);

    if (!this.shared) {

        this.startButton = this.toolbar.add(new Button({
            align: "left",
            icon: "fa fa-play",
            caption: "Start",
            onclick: function () {

                this.detailPanel.hideDuration();
                this.startButton.hide();

                startRun(this.environment, getSelectedPaths(), false, null, this.page);

            }.bind(this)
        }));

        this.startButton.hide();

    }

}

RunReporter.prototype.onrunend = function() {

    if (this.stopButton)
        this.stopButton.hide();

    if (this.startButton)
        this.startButton.show();

}

/* WatchReporter ----------------------------------------------- */

var WatchReporter = function(options) {

    Reporter.call(this, options);

};

extend(Reporter, WatchReporter);

WatchReporter.prototype.createLayout = function() {

    Reporter.prototype.createLayout.bind(this)();

    if (this.stopButton)
        this.stopButton.onclick = function() {

            this.restart = true;

            $.ajax({
                url: `api/runs/${this.runId}`,
                method: "PUT"
            });

            this.stopButton.hide();

        }.bind(this);

}

WatchReporter.prototype.onrunend = function() {

    if (this.restart) {
        this.restart = undefined;
        this.detailPanel.hideDuration();
        startWatch(this.environment, this);
    }

}

/* DetailPanel ----------------------------------------------- */
var DetailPanel = function(options) {

    Panel.call(this, options);

    this.passCount = 0;
    this.failCount = 0;

    this.duration = new Duration(0);

}

extend(Panel, DetailPanel);

DetailPanel.prototype.setPassCount = function(value) {
    this.passCount = value;
    this.summaryPanel.container.passCount.innerHTML = value;
};

DetailPanel.prototype.setFailCount = function(value) {
    this.failCount = value;
    this.summaryPanel.container.failCount.innerHTML = value;
    this.summaryPanel.container.failCount.style.display = value == 0 ? "none" : "block";
};

DetailPanel.prototype.setSetupFailure = function(value) {
    this.summaryPanel.container.setupFailure.style.display = value ? "block" : "none";
}

DetailPanel.prototype.setDuration = function(value) {

    this.duration = new Duration(this.duration.milliseconds + value);
    
    this.summaryPanel.container.duration.classList.remove("run-spinner");
    this.summaryPanel.container.duration.innerHTML = this.duration.toHourTime();

}

DetailPanel.prototype.resetDuration = function() {
    this.setDuration(-this.duration.milliseconds);
}

DetailPanel.prototype.hideDuration = function() {

    this.summaryPanel.container.duration.classList.add("run-spinner");
    this.summaryPanel.container.duration.innerHTML = "";
    
}

/* Reporter feed blocks -------------------------------------- */

/* RporterPanel (defines common destroyDOM method) */
var ReporterPanel = function(options) {
    Control.call(this, options);
}

extend(Control, ReporterPanel);

ReporterPanel.prototype.destroyDOM = function() {

    dd.release(this.dom);
    elementPool.put(this.dom);

    this.dom = undefined;

};

/* Generic method for expanding/collapsing panels */

function toggleCollapsed() {

    if (this.collapsed)
        this.getLayoutManager().expand(this);
    else 
        this.getLayoutManager().collapse(this);
    
    this.getLayoutManager().refresh();

}

/* Script panel */

var ScriptPanel = function(options) {

    ReporterPanel.call(this, options);

    this.passCount = 0;
    this.failCount = 0;
    this.setupFailure = false;

}

extend(ReporterPanel, ScriptPanel);

ScriptPanel.prototype.setPassCount = function(value) {

    this.passCount = value;

    if (this.dom)
        this.dom.content.summary.pass.innerHTML = value;

}

ScriptPanel.prototype.setFailCount = function(value) {

    this.failCount = value;

    if (this.dom) {
        this.dom.content.summary.failures.fail.innerHTML = value;
        this.dom.content.summary.failures.fail.style.display = this.failCount == 0 ? "none" : "inline";
    }

}

ScriptPanel.prototype.setSetupFailure = function(value) {

    this.setupFailure = value;

    if (this.dom)
        this.dom.content.summary.failures.setupFailure.style.display = value ? "inline" : "none";

}

ScriptPanel.prototype.setDuration = function(duration) {

    this.duration = new Duration(duration);

    if (this.dom) {
        this.dom.content.summary.duration.classList.remove("script-spinner");
        this.dom.content.summary.duration.innerHTML = this.duration.toHourTime();
    }

}

ScriptPanel.prototype.fail = function(message) {

    this.failed = true;

    this.add(new ErrorPanel({
        message: message
    }));

    if (this.dom)
        this.dom.classList.add("fail");

}

ScriptPanel.prototype.createDOM = function() {

    this.dom = dd("div.control.script-panel", {
        spacer: "div.script-spacer",
        content: dd("div.script-details", {
            summary: dd("div.unit-summary", {
                icon: `span.fa.fa-fw.fa-file-text`,
                name: dd("div.script-name", this.scriptName),
                failures: dd("div.script-failures", {
                    setupFailure: dd("span.setup-failure", "!"),
                    fail: dd("span.script-test-count.fail", this.failCount)
                }),
                pass: dd("span.script-test-count.pass", this.passCount),
                duration: "span.script-duration"
            })
        })
    });

    if (this.failed)
        this.dom.classList.add("fail");

    this.dom.content.summary.on("click", toggleCollapsed.bind(this));

    if (this.setupFailure)
        this.dom.content.summary.failures.setupFailure.style.display = "inline";

    if (this.failCount > 0)
        this.dom.content.summary.failures.fail.style.display = "inline";

    if (this.duration)
        this.dom.content.summary.duration.innerHTML = this.duration.toHourTime();
    else
        this.dom.content.summary.duration.classList.add("script-spinner");

    this.content = this.dom.content;

}

/* Suite panel */

var SuitePanel = function(options) {

    ReporterPanel.call(this, options);

    this.passCount = 0;
    this.failCount = 0;

}

extend(ReporterPanel, SuitePanel);

SuitePanel.prototype.setPassCount = function(value) {

    this.passCount = value;

    if (this.dom)
        this.dom.summary.pass.innerHTML = value;

}

SuitePanel.prototype.setFailCount = function(value) {

    this.failCount = value;

    if (this.dom) {
        this.dom.summary.failures.fail.innerHTML = value;
        this.dom.summary.failures.fail.style.display = value == 0 ? "none" : "inline";
    }

}

SuitePanel.prototype.setSetupFailure = function(value) {

    this.setupFailure = value;

    if (this.dom)
        this.dom.summary.failures.setupFailure.style.display = value ? "inline" : "none";

}

SuitePanel.prototype.setDuration = function(duration) {

    this.duration = new Duration(duration);

    if (this.dom) {
        this.dom.summary.duration.classList.remove("script-spinner");
        this.dom.summary.duration.innerHTML = this.duration.toHourTime();
    }

}

SuitePanel.prototype.fail = function(message) {

    this.failed = true;

    this.add(new ErrorPanel({
        message: message
    }));

    if (this.dom)
        this.dom.classList.add("fail");

}

SuitePanel.prototype.createDOM = function() {

    this.dom = dd("div.control.suite-panel", {
        summary: dd("div.unit-summary", {
            icon: `span.fa.fa-fw.fa-folder-o`,
            name: dd("span.unit-name.suite-name", this.suiteName),
            failures: dd("div.script-failures", {
                setupFailure: dd("span.suite-setup-failure", "!"),
                fail: dd("span.suite-test-count.fail", this.failCount)
            }),
            pass: dd("span.suite-test-count.pass", this.passCount),
            duration: "span.suite-duration"
        })
    });

    if (this.failed)
        this.dom.classList.add("fail");

    if (this.duration)
        this.dom.summary.duration.innerHTML = this.duration.toHourTime();
    else
        this.dom.summary.duration.classList.add("script-spinner");

    if (this.failCount > 0)
        this.dom.summary.failures.fail.style.display = "inline";

    if (this.setupFailure)
        this.dom.summary.failures.setupFailure.style.display = "inline";

    this.dom.summary.on("click", toggleCollapsed.bind(this));

}

/* Test panel */

var TestPanel = function(options) {
    ReporterPanel.call(this, options);
}

extend(ReporterPanel, TestPanel);

TestPanel.prototype.fail = function(message) {
    
    this.failed = true;

    this.add(new ErrorPanel({
        message: message
    }));

    if (this.dom)
       this.dom.classList.add("fail");

}

TestPanel.prototype.setDuration = function(duration) {

    this.duration = new Duration(duration);

    if (this.dom) {
        this.dom.summary.duration.classList.remove("test-spinner");
        this.dom.summary.duration.innerHTML = this.duration.toMinuteTime();
    }

}

TestPanel.prototype.unitIcon = function() {

    if (this.testType == "Setup")
        return "fa-cog";
    else if (this.testType == "Teardown")
        return "fa-eraser";
    else
        return "fa-check";

}

TestPanel.prototype.createDOM = function() {

    this.dom = dd("div.control.test-panel", {
        summary: dd("div.unit-summary", {
            icon: `span.test-icon.fa.fa-fw.${this.unitIcon()}`,
            name: dd("span.unit-name.test-name", this.testName),
            duration: "span.test-duration"
        })
    })

    if (this.failed)
        this.dom.classList.add("fail");

    this.dom.summary.on("click", toggleCollapsed.bind(this));

    if (this.duration)
        this.dom.summary.duration.innerHTML = this.duration.toMinuteTime();
    else
        this.dom.summary.duration.classList.add("test-spinner");

}

/* Step panel */

var StepPanel = function(options) {
    ReporterPanel.call(this, options);
};

extend(ReporterPanel, StepPanel);

StepPanel.prototype.fail = function(message) {

};

StepPanel.prototype.setDuration = function(duration) {

    this.duration = new Duration(duration);

    if (this.dom) {
        this.dom.summary.duration.classList.remove("test-spinner");
        this.dom.summary.duration.innerHTML = this.duration.toMinuteTime();
    }

};

StepPanel.prototype.createDOM = function() {

    this.dom = dd("div.control.step-panel", {
        summary: dd("div.unit-summary", {
            icon: `span.step-icon.fa.fa-fw.fa-circle-o`,
            name: dd("span.unit-name.step-name", this.testName),
            duration: "span.step-duration"
        })
    });

    if (this.failed)
        this.dom.classList.add("fail");

    this.dom.summary.on("click", toggleCollapsed.bind(this));

    if (this.duration)
        this.dom.summary.duration.innerHTML = this.duration.toMinuteTime();
    else
        this.dom.summary.duration.classList.add("test-spinner");

};

/* ErrorPanel ------------------------------------------------------------------- */

var ErrorPanel = function(options) {
    Control.call(this, options);
}

extend(ReporterPanel, ErrorPanel);

ErrorPanel.prototype.createDOM = function() {
    this.dom = dd("div.control.error-panel", this.message);
}

/* CallPanel ------------------------------------------------------------------------- */

var CallPanel = function(options) {
    Control.call(this, options);
}

extend(ReporterPanel, CallPanel);

CallPanel.prototype.pass = function(result) {

    if (result) {
        this.result = result;
        this.detailPanel.setResult(result);
    }
        
}

CallPanel.prototype.fail = function(message) {

    if (message) {
        this.error = message;
        this.detailPanel.setError(message);
    }
        
}

CallPanel.prototype.setDuration = function(duration) {

    this.duration = new Duration(duration);

    if (this.dom) {
        this.dom.summary.duration.classList.remove("call-spinner");
        this.dom.summary.duration.innerHTML = this.duration.toSecondTime();
    }

}

CallPanel.prototype.createDOM = function() {
    
    var method;
    
    if (this.method == "$sql" || this.method == "$plsql") 

        method = this.params.statement;

    else {

        method = this.method + "(";
        var comma = "";

        for (var param in this.params) {
            method = method + comma + param + ": " + JSON.stringify(this.params[param]);
            comma = ", ";
        }


        method = method + ")";

    }

    this.dom = dd("div.control.call-panel", {
        summary: dd("div.unit-summary", {
            line: dd("span.call-line", this.line + ":"),
            method: dd("span.call-method", method),
            duration: "span.call-duration"
        })
    })

    this.dom.summary.on("click", toggleCollapsed.bind(this));

    if (this.duration)
        this.dom.summary.duration.innerHTML = this.duration.toSecondTime();
    else
        this.dom.summary.duration.classList.add("call-spinner");

}

/* CallDetails --------------------------------------------------- */

var CallDetails = function(options) {
    ReporterPanel.call(this, options);
}

extend(ReporterPanel, CallDetails);

CallDetails.prototype.setResult = function(result) {

    this.result = result;

    if (this.dom)
        this.renderResult();

}

CallDetails.prototype.renderResult = function() {

    if (this.parent.method == "$sql")

        for (var property in this.result) {
            this.dom.result.innerHTML = JSON.stringify(this.result[property], null, "    ");
            break;
        }

    else

        this.dom.result.innerHTML = JSON.stringify(this.result, null, "    ");

};

CallDetails.prototype.setError = function(error) {

    this.error = error;

    if (this.dom)
        this.dom.result.innerHTML = this.error;

};

CallDetails.prototype.createDOM = function() {

    var params; 
    
    if (this.parent.method == "$sql" || this.parent.method == "$plsql") {

        var lines = this.parent.params.statement.split("\n");

        if (lines.length > 1)
            do {
            
                var space = true;

                for (var i = 1; i < lines.length; i++)
                    if (lines[i].charAt(0) != " " && lines[i])
                        space = false;

                if (space)
                    for (var i = 1; i < lines.length; i++)
                        lines[i] = lines[i].substring(1);

            } while (space);

        var params = lines.join("\n");

    } else

        params = JSON.stringify(this.parent.params, null, "    ");

    this.dom = dd("div.control.call-details", {
        params: dd("div.call-params", params),
        result: "div.call-result"
    });

    if (this.result != undefined)
        this.renderResult();
    else if (this.error)
        this.dom.result.innerHTML = this.error;

    this.dom.on("mousewheel", CallDetails.prototype.wheel.bind(this), false);
    this.dom.on("DOMMouseScroll", CallDetails.prototype.wheel.bind(this), false);

}

CallDetails.prototype.wheel = function(event) {

    if (
           ((event.deltaY > 0 || event.detail > 0) && this.dom.scrollTop < this.dom.scrollHeight - this.dom.clientHeight) ||
           ((event.deltaY < 0 || event.detail < 0) && this.dom.scrollTop > 0)
       )
        
        event.stopPropagation();

}

/* InfoPanel ------------------------------------------------------------------------- */

var InfoPanel = function(options) {
    ReporterPanel.call(this, options);
}

extend(ReporterPanel, InfoPanel);

InfoPanel.prototype.createDOM = function() {
    
    this.dom = dd("div.control.info-panel", {
        icon: "div.fa.fa-info-circle.info-icon",
        message: dd("pre.info-panel-text", this.message)
    });

}

/* SummaryPanel ----------------------------------------------------------------------- */

var SummaryPanel = function(options) {

    Control.call(this, options);

    this.container = dd("div.control.summary-panel", {
        setupFailure: dd("div.setup-failure", "!"),
        failCount: dd("div.run-test-count.fail", "0"),
        passCount: dd("div.run-test-count.pass", "0"),
        duration: dd("div.run-duration.run-spinner", "")
    });

}

extend(Control, SummaryPanel);

