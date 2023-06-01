import {h} from "dom-chef";

export default class ModalElement extends HTMLElement {

    closeable = true;
    removeFromDomOnClose;

    constructor(removeFromDomOnClose = false) {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    left: 0;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #0000009e;
                    z-index: 1001;
                    display: none;
                }
            </style>
            <slot></slot>
        `;

        this.removeFromDomOnClose = removeFromDomOnClose;
        let startElement = null;
        this.addEventListener("mousedown", (e) => {
            startElement = e.target;
        });

        this.addEventListener("mouseup", (e) => {
            if(e.target === startElement && e.target === this && this.isCloseable()) this.close();
            startElement = null;
        });

        this.append(
            <i className="codicon codicon-chrome-close" onclick={() => {
                if(this.isCloseable()) this.close();
            }}/> as HTMLElement
        )

        window.addEventListener("keyup", (e) => {
            if(this.isCloseable() && e.key === "Escape" && !e.ctrlKey && !e.shiftKey && !e.altKey)
                this.close();
        });
    }

    isOpen() {
        return document.body.contains(this) && this.style.display !== "none";
    }

    open() {
        this.style.display = "block";
        if(!document.body.contains(this)) document.body.append(this);
        document.body.style.overflow = "hidden";
        this.dispatchEvent(new Event("open"));
    }

    close() {
        if(this.removeFromDomOnClose) this.remove();
        this.style.display = "";
        document.body.style.overflow = "";
        this.dispatchEvent(new Event("close"));
    }

    isCloseable() {
        return this.closeable;
    }

    setCloseable(toggle) {
        this.closeable = typeof toggle === "boolean" ? toggle : this.closeable;
    }

}
