const $ = (selector, attributes = {}) => {
    if (selector.startsWith("<") && selector.endsWith(">")) {
        const element = document.createElement(selector.substr(1, selector.length - 2));
        if (typeof attributes === "object" && !Array.isArray(attributes)) {
            Object.keys(attributes).forEach(key => {
                if (key.toLowerCase() === "text")
                    element.innerText = attributes[key];
                else
                    element.setAttribute(key, attributes[key]);
            });
        }
        return element;
    }
    try {
        return document.querySelector(selector);
    } catch (err) {
        return undefined;
    }
};
export default $;