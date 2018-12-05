Array.prototype.peek = function() {
    if (this.length > 0)
        return this[this.length - 1];
};

Array.prototype.contains = function(element) {
    return this.indexOf(element) >= 0;
}

function extend(parent, child) {
    child.prototype = Object.create(parent.prototype);
    child.prototype.constructor = child;
}

/* Layout -------------------------------------------------- */

var Layout = function(options) {

    if (options)
        for (var option in options)
            this[option] = options[option];

}

/* FlowLayout ---------------------------------------------- */

var FlowLayout = function(options) {

    Layout.call(this, options);

}

extend(Layout, FlowLayout);

FlowLayout.prototype.add = function(control) {

    control.parent.container.appendChild(control.container);

}

var defaultLayout = new FlowLayout();

/* DockLayout ---------------------------------------------- */

var DockLayout = function(options) {
    
    Layout.call(this, options);

    // Initialise layout option object if not specified
    this.options = options ? options : {};

    // Initialize layout options to default values if not specified
    this.options.gap = this.options.gap ? this.options.gap : "0px";

}

extend(Layout, DockLayout);

DockLayout.prototype.alignDirection = function(align) {

    if (align == "top" || align == "bottom")
        return "column";
    else if (align == "left" || align == "right")
        return "row";
    
}

DockLayout.prototype.init = function(control, direction) {

    if (!direction)
        direction = this.initialDirection;

    if (!direction)
        direction = "row";

    control.container.style.display = "flex";
    control.container.style.flexDirection = direction;

    var center = document.createElement("div");
    center.classList.add(`dock-center-${direction}`);
    
    control.container.appendChild(center);

    control.dockLayout = {
        direction: direction,
        dockStack: [{
            center: center
        }]
    }

}

DockLayout.prototype.getDock = function(control, direction) {

    if (!control.dockLayout)
        this.init(control, direction);

    var dock = control.dockLayout.dockStack.peek();

    if (!direction || control.dockLayout.direction == direction) 

        return dock;

    else {

        dock.center.style.display = "flex";
        dock.center.style.flexDirection = direction;

        var center = document.createElement("div");
        center.classList.add(`dock-center-${direction}`);
        dock.center.appendChild(center);

        dock = {
            center: center
        };

        control.dockLayout.dockStack.push(dock);
        control.dockLayout.direction = direction;

        return dock;

    }

}

DockLayout.prototype.add = function(control) {

    var align = control.align;
    var resizeable = control.resizeable;
    var direction = this.alignDirection(align);

    var dock = this.getDock(control.parent, direction);
    
    if (align == "top" || align == "bottom") {

        control.container.style.width = "100%";
        control.container.style.flexGrow = "0";
        control.container.style.flexShrink = "0";
        control.container.style.height = control.height;

        if (align == "top")
            control.container.style.marginBottom = this.gap;
        else 
            control.container.style.marginTop = this.gap;
        
        if (align == "top")
            dock.center.parentNode.insertBefore(control.container, dock.center);
        else
            dock.center.parentNode.insertBefore(control.container, dock.center.nextSibling);
        
        if (resizeable) 
            control.resizeBar = this.createHorizontalResizeBar(control, align);

    } else if (align == "left" || align == "right") {

        //control.container.style.height = "100%";
        control.container.style.flexGrow = "0";
        control.container.style.flexShrink = "0";
        control.container.style.width = control.width;

        if (align == "left")
            control.container.style.marginRight = this.gap;
        else
            control.container.style.marginLeft = this.gap;

        if (align == "left")
            dock.center.parentNode.insertBefore(control.container, dock.center);
        else
            dock.center.parentNode.insertBefore(control.container, dock.center.nextSibling);
        
        if (resizeable) 
            control.resizeBar = this.createVerticalResizeBar(control, align);
        
    } else if (control.align == "center") {

        //control.container.style.height = "100%";
        //control.container.style.width = "100%";
        control.container.style.position = "absolute";
        control.container.style.top = "0px";
        control.container.style.right = "0px";
        control.container.style.bottom = "0px";
        control.container.style.left = "0px";
        
        dock.center.appendChild(control.container);

    }

}

DockLayout.prototype.createVerticalResizeBar = function(control, align) {

    var resizeBar = document.createElement("div");
    resizeBar.classList.add(`resize-bar-row-${align}`);

    var size, position;

    if (this.gap) {
        size = this.gap;
        position = "-" + this.gap;    
    } else {
        size = "8px";
        position = "-4px";
    }

    resizeBar.style.width = size;

    if (align == "left")
        resizeBar.style.right = position;
    else
        resizeBar.style.left = position;

    control.container.append(resizeBar);
    
    return resizeBar;

}

DockLayout.prototype.createHorizontalResizeBar = function(control, align) {

    var resizeBar = document.createElement("div");
    resizeBar.classList.add(`resize-bar-column-${align}`);

    var size, position;

    if (this.gap) {
        size = this.gap;
        position = "-" + this.gap;    
    } else {
        size = "8px";
        position = "-4px";
    }

    resizeBar.style.height = size;

    if (align == "top")
        resizeBar.style.bottom = position;
    else
        resizeBar.style.top = position;

    control.container.append(resizeBar);

    return resizeBar;

}

DockLayout.prototype.refresh = function(control) {

    if (!control.dockLayout)
        return;

    var children = [];
    var child = control.firstChild;

    while (child) {
        children.push(child);
        child = child.nextSibling;
    }

    for (var i = children.length - 1; i >= 0; i--) {
        
        children[i].container.style.width = "";
        children[i].container.style.height = "";
        children[i].container.style.margin = "";

        if (children[i].container.parentNode)
            children[i].container.parentNode.removeChild(children[i].container);

        if (children[i].resizeBar) {
            children[i].resizeBar.parentNode.removeChild(children[i].resizeBar);
            children[i].resizeBar = undefined;
        }

    }

    control.container.removeChild(control.dockLayout.dockStack[0].center);
    control.dockLayout = undefined;

    for (var i = 0; i < children.length; i++)
        this.add(children[i]);

}

DockLayout.prototype.show = function(control) {
    control.container.style.display = control.visibleDisplay;
    control.visibleDisplay = undefined;
}

DockLayout.prototype.hide = function(control) {
    control.visibleDisplay = control.container.style.display;
    control.container.style.display = "none";
}

var resizing;

$(function() {

    $(window).mousedown(function(event) {

        var target = $(event.target);

        if (target.hasClass("resize-bar-row-left"))
            resizing = {
                position: event.clientX,
                direction: "row-left",
                target: target.parent()
            };
        else if (target.hasClass("resize-bar-row-right"))
            resizing = {
                position: event.clientX,
                direction: "row-right",
                target: target.parent()
            };
        else if (target.hasClass("resize-bar-column-top"))
            resizing = {
                position: event.clientY,
                direction: "column-top",
                target: target.parent()
            };
        else if (target.hasClass("resize-bar-column-bottom"))
            resizing = {
                position: event.clientY,
                direction: "column-bottom",
                target: target.parent()
            };
        
    });

    $(window).mouseup(function(event) {
        resizing = undefined;
    })

    $(window).mousemove(function(event) {

        if (resizing) {

            event.preventDefault();

            /* Firefox workaround */
            if (document.selection)
                document.selection.empty();
            else 
                window.getSelection().removeAllRanges();
            
            var dimension, delta, deltaSign;

            if (resizing.direction == "row-left") {
                
                var currentSize = resizing.target.innerWidth();
                
                resizing.target.css("width", `+=${event.clientX - resizing.position}px`);
                resizing.target.css("width", resizing.target.innerWidth() + "px");

                resizing.position += resizing.target.innerWidth() - currentSize;

            } else if (resizing.direction == "row-right") {

                var currentSize = resizing.target.innerWidth();
                
                resizing.target.css("width", `+=${resizing.position - event.clientX}px`);
                resizing.target.css("width", resizing.target.innerWidth() + "px");

                resizing.position += currentSize - resizing.target.innerWidth();

            } else if (resizing.direction == "column-top") {

                var currentSize = resizing.target.height();

                resizing.target.height((currentSize + event.clientY - resizing.position) + "px");

                resizing.position += resizing.target.height() - currentSize;

            } else {

                var currentSize = resizing.target.height();

                resizing.target.height((currentSize + resizing.position - event.clientY) + "px");

                resizing.position += currentSize - resizing.target.height();

            }

        }

    });

});

/* FeedLayout --------------------------------------------------------- */

var FeedLayout = function(options) {

    for (option in options)
        this[option] = options[option];

    this.idGenerator = 0;

    this.scrollableControls = new AvlTree();
    this.visibleControls = new AvlTree();
    
};

FeedLayout.prototype.wheel = function(event) {

    if (event.deltaY > 0 || event.detail > 0)
        this.down();
    else if (event.deltaY < 0 || event.detail < 0) 
        this.up();

}

FeedLayout.prototype.init = function(control) {

    control.getContent().style.display = "flex";
    control.getContent().style.flexDirection = "row";

    this.contentInner = document.createElement("div");
    this.contentInner.classList.add("feed-layout-content-inner");

    this.contentOuter = document.createElement("div");
    this.contentOuter.classList.add("feed-layout-content-outer");

    this.contentOuter.appendChild(this.contentInner);
    control.getContent().appendChild(this.contentOuter);

    this.scrollPanel = document.createElement("div");
    this.scrollPanel.classList.add("feed-layout-scroll-panel");
    
    this.scrollContent = document.createElement("div");
    this.scrollContent.classList.add("feed-layout-scroll-content");
    
    this.scrollPanel.appendChild(this.scrollContent);
    control.getContent().appendChild(this.scrollPanel);

    control.content = this.contentInner;

    this.scrollPanel.addEventListener("scroll", function(event) {

        if (!this.scrolling) {

            var rank = Math.floor(this.scrollPanel.scrollTop / 16) + 1;

            if (this.rank != rank)
                this.scroll(rank, 0);
            
            if (this.onscroll)
                this.onscroll();

        }
        
        this.scrolling = false;

    }.bind(this));

    this.rootControl = control;

    control.feedLayout = {};

    this.contentOuter.addEventListener("mousewheel", FeedLayout.prototype.wheel.bind(this), false);
    this.contentOuter.addEventListener("DOMMouseScroll", FeedLayout.prototype.wheel.bind(this), false);

};

FeedLayout.prototype.add = function(control) {

    if (!control.feedLayoutId)
        control.feedLayoutId = ++this.idGenerator;

    if (this.collapsedParent(control.parent))
        return;
    
    this.scrollableControls.insert(control.feedLayoutId, control);

    if (!control.collapsed)
        this.insertScrollableChildren(control);

    if (this.autoRefresh)
        this.refresh();

};

FeedLayout.prototype.visible = function() {

    if (this.contentInner.offsetParent)
        return true;
    else
        return false;

}

FeedLayout.prototype.refresh = function() {

    if (!this.visible() || this.scrollableControls._size == 0)
        return;

    if (this.autoScroll)
        this.scroll(this.scrollableControls._size, Number.MAX_VALUE);
    else if (this.rank)
        this.scroll(this.rank, this.offset);
    else
        this.scroll(1, 0);

}

FeedLayout.prototype.collapsedParent = function(control, parent) {

    if (control == this.rootControl)
        return parent;
    else if (control.collapsed)
        return this.collapsedParent(control.parent, control);
    else  
        return this.collapsedParent(control.parent, parent);

}

FeedLayout.prototype.controlStack = function(control) {

    if (control == this.rootControl)

        return [];

    else {

        var stack = this.controlStack(control.parent);
        stack.push(control);
    
        return stack;

    }

}

FeedLayout.prototype.controlTop = function(control) {

    var element = control.getContainer();

    var style = window.getComputedStyle(element);
    var result = element.offsetTop - parseFloat(style.marginTop);

    element = element.offsetParent;

    while (element != this.contentInner) {

        style = window.getComputedStyle(element);

        result += parseFloat(style.borderTopWidth) 
                  + element.offsetTop;

        element = element.offsetParent;

    }

    return result;

}

FeedLayout.prototype.renderControl = function(control) {

    var node = this.visibleControls.getNode(control);

    if (!node) {

        node = this.visibleControls.insert(control.feedLayoutId, control);
        var nextControl = node.next ? node.next.value : null;

        if (!control.getContainer() && control.createDOM)
            control.createDOM();

        if (!control.getContainer().parentNode) 
            if (nextControl && nextControl.parent == control.parent)
                control.parent.getContent().insertBefore(control.getContainer(), nextControl.getContainer());
            else
                control.parent.getContent().appendChild(control.getContainer());

    }

}

FeedLayout.prototype.scroll = function(rank, offset) {

    this.scrolling = true;
    var node = this.scrollableControls.getRankedNode(rank);

    var control = node.value;
    var controlStack = this.controlStack(control);
    
    for (var i = 0; i < controlStack.length; i++)
        this.renderControl(controlStack[i]);

    var controlTop = this.controlTop(control);

    if (offset < 0)

        while (offset < 0 && node.prev) {

            prevControl = control;

            rank--;
            node = node.prev;

            var control = node.value;
            var controlStack = this.controlStack(control);

            for (var i = 0; i < controlStack.length; i++)
                this.renderControl(controlStack[i]);

            offset += this.controlTop(prevControl) - this.controlTop(control);
            controlTop = this.controlTop(control);

        }

    else if (offset > 0) {

        while (node.next) {

            var nextNode = node.next;

            var nextControl = nextNode.value;
            this.renderControl(nextControl);

            if (offset - (this.controlTop(nextControl) - controlTop) < 0)
                break;

            rank++;
            node = nextNode;
            control = nextControl;
            
            offset -= this.controlTop(control) - controlTop;
            controlTop = this.controlTop(control);

        }

    }

    if (offset < 0)
        offset = 0;

    var contentOffset = controlTop + offset;

    this.contentInner.style.bottom = "initial";  
    this.contentInner.style.top = `-${contentOffset}px`;  

    while (controlTop - contentOffset <= this.contentOuter.clientHeight && node.next) {

        node = node.next;
        
        var control = node.value;
        this.renderControl(control);
    
        controlTop = this.controlTop(control);

    }

    if (this.contentInner.offsetHeight - contentOffset < this.contentOuter.clientHeight) {
        
        this.contentInner.style.top = "initial";  
        this.contentInner.style.bottom = "0px";

        rank = this.scrollableControls.rank(control.feedLayoutId);

        while (controlTop + this.contentInner.offsetTop > 0 && node.prev) {

            rank--;
            node = node.prev;

            control = node.value;
            controlStack = this.controlStack(control);

            for (var i = 0; i < controlStack.length; i++)
                this.renderControl(controlStack[i]);

            controlTop = this.controlTop(control);

        }

        offset = - (this.contentInner.offsetTop + controlTop);

        if (offset < 0) {
            offset = 0;
            contentOffset = 0;
        } else 
            contentOffset = - this.contentInner.offsetTop;

        this.contentInner.style.bottom = "initial";  
        this.contentInner.style.top = `-${contentOffset}px`;  

    } 

    node = this.visibleControls.getRankedNode(this.visibleControls._size);

    while (node && this.controlTop(node.value) - contentOffset > this.contentOuter.clientHeight) {

        control = node.value;

        control.parent.getContent().removeChild(control.getContainer());

        if (control.destroyDOM)
            control.destroyDOM();

        node = node.prev;
        this.visibleControls.delete(control.feedLayoutId);

    }

    control = this.scrollableControls.getRanked(rank);
    controlStack = this.controlStack(control);

    node = this.visibleControls.getRankedNode(1);

    while (node.value != control) {

        var visibleControl = node.value;
        
        if (controlStack.indexOf(visibleControl) < 0) {

            visibleControl.getContainer().parentNode.removeChild(visibleControl.getContainer());

            if (visibleControl.destroyDOM)
                visibleControl.destroyDOM();
            
            this.visibleControls.delete(visibleControl.feedLayoutId);
            node = this.visibleControls.getRankedNode(1);

        } else

            node = node.next;        

    }

    var contentOffset = this.controlTop(control) + offset;
    this.contentInner.style.top = `-${contentOffset}px`;  

    this.rank = rank;
    this.offset = offset;

    var bottomRank = this.scrollableControls.rank(
        this.visibleControls.getRanked(this.visibleControls._size).feedLayoutId);

    var scrollContentHeight = 16 * (this.scrollableControls._size - bottomRank + rank - 1);

    if (this.contentInner.offsetHeight - contentOffset > this.contentOuter.clientHeight)
        scrollContentHeight += 16;

    this.scrollContent.style.height = `calc(100% + ${scrollContentHeight}px)`;
    this.scrollPanel.scrollTop = (rank - 1) * 16;

}

FeedLayout.prototype.insertScrollableChildren = function(control) {

    var child = control.firstChild;

    while (child) {

        this.scrollableControls.insert(child.feedLayoutId, child);
   
        if (!child.collapsed)
            this.insertScrollableChildren(child);

        child = child.nextSibling;

    }

}

FeedLayout.prototype.expand = function(control) {

    if (!control.collapsed)
        return;

    control.collapsed = undefined;
    this.insertScrollableChildren(control);

}

FeedLayout.prototype.removeScrollableChildren = function(control, collapse) {

    var child = control.firstChild;

    while (child) {

        this.scrollableControls.delete(child.feedLayoutId);

        if (collapse)
            this.collapse(child, true);
        else if (!child.collapsed)
            this.removeScrollableChildren(child, false);

        if (this.visibleControls.get(child.feedLayoutId)) {

            control.getContent().removeChild(child.getContainer());

            if (child.destroyDOM)
                child.destroyDOM();

            this.visibleControls.delete(child.feedLayoutId);

        }

        child = child.nextSibling;

    }

}

FeedLayout.prototype.collapse = function(control, recursive) {

    if (control.collapsed && !recursive)
        return;

    control.collapsed = true;
    this.removeScrollableChildren(control, recursive);
    
}

FeedLayout.prototype.down = function() {

    if (this.rank)
        this.scroll(this.rank, this.offset + 32);

    if (this.onscroll)
        this.onscroll();
    
}

FeedLayout.prototype.up = function() {

    if (this.rank)
        this.scroll(this.rank, this.offset - 32);

    if (this.onscroll)
        this.onscroll();

}

FeedLayout.prototype.clear = function() {

    this.scrolling = true;

    var node = this.visibleControls.getRankedNode(this.visibleControls._size);

    while (node) {

        var control = node.value;

        control.getContainer().parentNode.removeChild(control.getContainer());

        if (control.destroyDOM)
            control.destroyDOM();

        node = node.prev;

    }

    this.visibleControls = new AvlTree();
    this.scrollableControls = new AvlTree();
    this.offset = undefined;
    this.rank = undefined;

    this.scrollContent.style.height = "0px";
    this.scrollPanel.scrollTop = 0;

}

/* Control ------------------------------------------------------------ */

var Control = function(options) {

    if (options)
        for (var option in options)
            this[option] = options[option];

    if (this.container)
        this.container.classList.add("control");

    if (this.layoutManager && typeof(this.layoutManager.init) == "function")
        this.layoutManager.init(this);

}

Control.prototype.getContainer = function() {

    if (this.dom)
        return this.dom;
    else if (this.container)
        return this.container;

}

Control.prototype.getContent = function() {

    if(this.content)
        return this.content;
    else
        return this.getContainer();

}

Control.prototype.add = function(control) {

    control.parent = this;

    if (!this.firstChild) {
        this.firstChild = control;
        this.lastChild = control;
    } else {
        this.lastChild.nextSibling = control;
        this.lastChild = control;
    }

    var layoutManager = this.getLayoutManager();

    if (layoutManager)
        layoutManager.add(control);

    return control;

}

Control.prototype.getLayoutManager = function() {

    if (this.layoutManager != undefined)
        return this.layoutManager;

    if (this.parent)
        return this.parent.getLayoutManager();
    else
        return defaultLayout;

}

Control.prototype.hide = function() {

    if (this.hidden)
        return;

    var layoutManager = this.getLayoutManager();

    if (layoutManager && typeof(layoutManager.hide) == "function")
        layoutManager.hide(this);

    this.hidden = true;

}

Control.prototype.show = function() {

    if (!this.hidden)
        return;

    var layoutManager = this.getLayoutManager();

    if (layoutManager && typeof(layoutManager.show) == "function")
        layoutManager.show(this);

    this.hidden = undefined;

}

Control.prototype.refreshLayout = function() {
    this.getLayoutManager().refresh(this);
}

Control.prototype.clear = function() {

    if (this.layoutManager)
        this.layoutManager.clear();

    var control = this.firstChild;

    while (control) {

        var nextControl = control.nextSibling;

        control.nextChild = undefined;
        control.prevChild = undefined;
        control.parent = undefined;

        control = nextControl;

    }

    this.firstChild = undefined;
    this.lastChild = undefined;

    this.refreshLayout();

}

