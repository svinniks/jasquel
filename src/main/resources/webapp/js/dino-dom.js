/* ElementPool --------------------------------------------- */

var ElementPool = function(options) {

    if (!options)
        options = {};

    if (!options.initial)
        options.initial = {};

    this.pools = {};

    for (var name in options.initial) {

        this.pools[name] = {
            waterMark: -1,
            elements: []
        };

        for (var i = 1; i <= options.initial[name]; i++) {

            var element = document.createElement(name);

            element.clean = true;
            this.pools[name].elements.push(element);

        }

        this.pools[name].waterMark = this.pools[name].elements.length - 1;

    }

}

ElementPool.prototype.get = function(name) {

    if (!this.pools[name])
        this.pools[name] = {
            waterMark: -1,
            elements: []
        };

    if (this.pools[name].waterMark == -1) {

        var element = document.createElement(name);
        element.clean = true;

        return element;

    } else {

        var element = this.pools[name].elements[this.pools[name].waterMark--];

        if (!element.clean) {

            element.setAttribute("class", "");
            element.setAttribute("style", "");
            element.innerHTML = "";

            element.clean = true;

        }

        return element;

    }

}

ElementPool.prototype.put = function(element) {

    var name = element.nodeName.toLowerCase();
    element.clean = false;
    
    if (!this.pools[name])
        this.pools[name] = {
            waterMark: -1,
            elements: []
        };

    if (element.parentNode)
        element.parentNode.removeChild(element);

    if (++this.pools[name].waterMark >= this.pools[name].elements.length)
        this.pools[name].elements.push(element);
    else
        this.pools[name].elements[this.pools[name].waterMark] = element;

}

var elementPool = new ElementPool({
    initial: {
        div: 100,
        span: 100
    }
});

/* DinoDom ------------------------------------------------ */
var dd = function(elementDefinition, content) {

    if (typeof(elementDefinition) == "string") {

        var parts = elementDefinition.split(".");
        var element = elementPool.get(parts[0]);

        for (var i = 1; i < parts.length; i++)
            element.classList.add(parts[i]);

    } else if (typeof(elementDefinition) == "object") {

        if (elementDefinition instanceof HTMLElement)
            element = elementDefinition;

    }

    if (typeof(content) != "undefined")
        dd.addContent(element, element, content)

    element.on = dd.on.bind(element);

    return element;

}

dd.addContent = function(parent, propertyParent, content) {

    if (!parent._dd)
        parent._dd = {
            children: []
        }

    if (typeof(content) == "string")

        parent.innerHTML = content;

    else if (typeof(content) == "number")

        parent.innerHTML = content + "";

    else if (typeof(content) == "object") {

        if (content instanceof HTMLElement) {

            parent.appendChild(content);
            parent._dd.children.push(content);

        } else {

            if (parent == propertyParent)
                parent._dd.properties = [];

            for (var property in content) {

                if (parent == propertyParent)
                    parent._dd.properties.push(property);

                if (typeof(content[property]) == "string") {

                    var value = dd(content[property]);

                    parent.appendChild(value);
                    parent._dd.children.push(value);

                } else if (typeof(content[property]) == "object") {

                    if (content[property] instanceof HTMLElement) {

                        var value = content[property];

                        parent.appendChild(value);
                        parent._dd.children.push(value);

                    } else {

                        var value = {};

                        dd.addContent(parent, value, content[property]);

                    }

                }

                propertyParent[property] = value;

            }

        }

    }

}

dd.release = function(element) {

    if (element._dd) {

        for (var i = 0; i < element._dd.children.length; i++) {
            dd.release(element._dd.children[i]);
            elementPool.put(element._dd.children[i]);
        }

        if (element._dd.properties)
            for (var i = 0; i < element._dd.properties.length; i++) 
                element[element._dd.properties[i]] = undefined;

        if (element._dd.eventListeners)
            for (var i = 0; i < element._dd.eventListeners.length; i++) 
                element.removeEventListener(element._dd.eventListeners[i].event, element._dd.eventListeners[i].fn)

        element._dd = undefined;
        element.on = undefined;

    }
    
}

dd.on = function(event, fn) {

    this.addEventListener(event, fn, false);

    if (!this._dd)
        this._dd = {};

    if (!this._dd.eventListeners)
        this._dd.eventListeners = [];

    this._dd.eventListeners.push({
        event: event,
        fn: fn
    });

}