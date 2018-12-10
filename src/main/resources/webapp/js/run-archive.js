var RunArchive = function(options) {

    if (!options)
        options = {};

    options.layoutManager = new DockLayout({
        gap: "8px"
    });

    Div.call(this, options);

    this.toolbar = this.add(new Toolbar({
        align: "top",
        classes: ["embedded"]
    }))

    this.displayMonths = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-calendar",
        caption: "Months"
    }));

    this.displayDays = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-calendar-o",
        caption: "Days"
    }));

    this.displayRuns = this.toolbar.add(new ToggleButton({
        align: "left",
        icon: "fa fa-play-circle-o",
        caption: "Runs"
    }));

    this.toggleDisplay = new ToggleGroup([this.displayMonths, this.displayDays, this.displayRuns], this.displayRuns);

    this.toggleDisplay.onchange = function() {

        if (this.toggleDisplay.on == this.displayMonths)
            this.display("months");
        else if (this.toggleDisplay.on == this.displayDays)
            this.display("days");
        else if (this.toggleDisplay.on == this.displayRuns)
            this.display("runs");

    }.bind(this);

    this.toolbar.add(new Button({
        align: "right",
        icon: "fa fa-refresh",
        onclick: function() {
            this.refresh();
        }.bind(this)
    }));

    this.runArchivePanelLayout = new FeedLayout({
        autoRefresh: false,
        autoScroll: false
    });

    this.runArchivePanel = this.add(new Panel({
        layoutManager: this.runArchivePanelLayout,
        align: "center",
        classes: ["embedded", "run-archive-panel"]
    }));

    this.refresh();

}

extend(Div, RunArchive);

RunArchive.prototype.refresh = function() {
    $.get(
        "api/runs",
        function(runs) {
            this.setRuns(runs);
            this.toggleDisplay.onchange();
        }.bind(this));
}

RunArchive.prototype.displayControl = function(control, what) {

    if (what == "months")

        this.runArchivePanelLayout.collapse(control, true);

    else if (what == "days" && (control instanceof DayPanel || control instanceof RunPanel))

        this.runArchivePanelLayout.collapse(control, true);

    else {

        this.runArchivePanelLayout.expand(control);

        var child = control.firstChild;
        while (child) {
            this.displayControl(child, what);
            child = child.nextSibling;
        }

    }

}

RunArchive.prototype.display = function(what) {

    if (this.runArchivePanelLayout.scrollableControls._size == 0)
        return;

    let child = this.runArchivePanel.firstChild;

    while (child) {
        this.displayControl(child, what);
        child = child.nextSibling;
    }

    let rank = this.runArchivePanelLayout.rank;

    if (rank) {

        let topControl = this.runArchivePanelLayout.scrollableControls.getRanked(rank ? rank : 1);

        while (!this.runArchivePanelLayout.scrollableControls.get(topControl.feedLayoutId))
            topControl = topControl.parent;

        this.runArchivePanelLayout.rank = this.runArchivePanelLayout.scrollableControls.rank(topControl.feedLayoutId);

    }

    this.runArchivePanelLayout.refresh();

}

RunArchive.prototype.setRuns = function(months) {

    this.runArchivePanel.clear();

    for (var month = 0; month < months.length; month++) {

        var monthPanel = new MonthPanel({
            month: months[month].month
        })

        this.runArchivePanel.add(monthPanel);
        var days = months[month].days;

        for (var day = 0; day < days.length; day++) {

            var dayPanel = new DayPanel({
                day: days[day].day
            });

            monthPanel.add(dayPanel);
            var runs = days[day].runs;

            for (var run = 0; run < runs.length; run++) {

                var runPanel = new RunPanel({
                    run: runs[run]
                });

                dayPanel.add(runPanel);

            }
        }
    }

    this.runArchivePanelLayout.refresh();

}

// RunArchivePanel

var RunArchivePanel = function(options) {
    Control.call(this, options);
}

extend(Control, RunArchivePanel);

RunArchivePanel.prototype.destroyDOM = function() {

    dd.release(this.dom);
    elementPool.put(this.dom);

    this.dom = undefined;

}

// MonthPanel

var MonthPanel = function(options) {

    RunArchivePanel.call(this, options);

}

extend(RunArchivePanel, MonthPanel);

MonthPanel.prototype.createDOM = function() {

    this.dom = dd("div.control.month-panel", {
        spacer: "div.month-spacer",
        content: dd("div.month-details", {
            summary: dd("div.run-archive-summary", {
                icon: "span.fa.fa-fw.fa-calendar",
                name: dd("span.month-name.run-archive-title", this.month)
            })
        })
    });

    this.dom.content.summary.on("click", toggleCollapsed.bind(this));
    this.content = this.dom.content;

}

// DayPanel

var DayPanel = function(options) {

    RunArchivePanel.call(this, options);

}

extend(RunArchivePanel, DayPanel);

DayPanel.prototype.createDOM = function() {

    this.dom = dd("div.control.day-panel", {
        summary: dd("div.run-archive-summary", {
            icon: "span.fa.fa-fw.fa-calendar-o",
            name: dd("span.day-name.run-archive-title", this.day)
        })
    });

    this.dom.summary.on("click", toggleCollapsed.bind(this));

}

// RunPanel

var RunPanel = function(options) {

    RunArchivePanel.call(this, options);

    this.title = moment(this.run.summary.startTime).format("HH:mm:ss");

    if (this.run.summary.environment) {

        this.title += " " + this.run.summary.environment;

        if (this.run.summary.description)
            this.title += ": ";

    }

    if (this.run.summary.description)
        this.title += " " + this.run.summary.description;

}

extend(RunArchivePanel, RunPanel);

RunPanel.prototype.createDOM = function() {

    this.dom = dd("div.control.run-panel", {
        summary: dd("div.run-archive-summary", {
            icon: "span.fa.fa-fw.fa-play-circle-o",
            name: dd("span.run-name.run-archive-title", this.title),
            failCount: dd("div.run-test-count.fail", this.run.summary.failCount),
            passCount: dd("div.run-test-count.pass", this.run.summary.passCount),
            duration: dd("span.run-duration")
        })
    });

    if (this.run.summary.duration)
        this.dom.summary.duration.innerHTML = new Duration(this.run.summary.duration).toHourTime();
    else
        this.dom.summary.duration.classList.add("run-spinner");

    this.dom.summary.passCount.style.visibility = this.run.summary.passCount != undefined ? "visible" : "hidden";
    this.dom.summary.failCount.style.visibility = this.run.summary.failCount ? "visible" : "hidden";

    this.dom.summary.on("click", function() {
        location.hash = "#runs/" + this.run.id;
    }.bind(this));

}


