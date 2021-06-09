"use strict";
/*
* Restrictions
* ---
* In order to develop a standard for all modern websites,
* We do not take into account positive tabindex (which should be focusable).
* Avoid using tabindex with positive number.
*/
/**
 * @class FocusableElement Defines what's a focusable element.
 */
class FocusableElement {
    constructor() {
        /**
         * The list of the default focusable elements.
         * @type {Array<string>}
         */
        this.defaultFocusableHTMLElements = [
            "a",
            "button",
            "input",
            "textarea",
            "select",
            "summary" // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details
        ];
        /**
         * The query selector of the focusable elements.
         * @type {string}
         */
        this.focusableQuerySelector = this.defaultFocusableHTMLElements.join(",") + ",[tabindex='0']";
        /**
         * The rules that must be respected by an element in order to be focusable.
         * Each rule needs to return `true` in order for the element to be considered as focusable.
         * @type {Array<Function>}
         */
        this.RULES = [
            (el) => (!this.hasStyle(el, "display", "none")),
            (el) => (!this.hasStyle(el, "visibility", "hidden")),
            (el) => (!el.hasAttribute("disabled")),
            (el) => (!el.hasAttribute("hidden")),
            (el) => (el.tagName == "input" ? el.type != "hidden" : true)
        ];
    }
    /**
     * Checks if an element has a specific CSS property and a specific value for this property.
     * @param {HTMLElement} el The HTML Element.
     * @param {string} property The name of the CSS property.
     * @param {string} value The value of the CSS property.
     * @returns {boolean} True if the element has this property & this value for this CSS property.
     */
    hasStyle(el, property, value) {
        const computed = window.getComputedStyle(el); // we must check in both CSS declaration & style attribute.
        return el.style[property] == value || computed.getPropertyValue(property) == value;
    }
    /**
     * Checks if an element is focusable.
     * @param {HTMLElement} el The HTML Element.
     * @returns {boolean} True if the element is focusable.
     */
    isFocusable(el) {
        for (let rule of this.RULES) {
            if (rule(el) === false) {
                return false;
            }
        }
        return true;
    }
    /**
     * Gets all the focusable elements.
     * @param {HTMLElement} parent The parent element. By default `document.body`.
     * @returns {Array<HTMLElement>} All the focusable children of an element.
     */
    getKeyboardFocusableElements(parent = document.body) {
        const children = Array.from(parent.querySelectorAll(this.focusableQuerySelector));
        return children.filter(el => this.isFocusable(el));
    }
}
class JSCarousel {
    constructor(container, options) {
        this.width = 0;
        this.max_index = 0;
        this.current_index = 0;
        this.current_delay = 0;
        this.container = container;
        if (!this.container) {
            throw new Error("The container of the carousel is undefined.");
        }
        this.tabs = this.container.querySelectorAll(".carousel-tablist li");
        this.buttons = [this.container.querySelector(".carousel-prev"), this.container.querySelector(".carousel-next")];
        this.allow_tabs = options ? options.tabs !== undefined ? options.tabs : (this.tabs !== null) : (this.tabs !== null);
        this.allow_autonav = options ? options.autonav !== undefined ? options.autonav : true : true;
        const presence_of_buttons = (this.buttons[0] !== null && this.buttons[1] !== null);
        this.allow_navbuttons = options ? (options.navigations_buttons !== undefined ? options.navigations_buttons : presence_of_buttons) : presence_of_buttons;
        this.autonav_delay = options ? options.autonav_delay || 5000 : 5000;
        this.disable_keyboard_navigation = options ? options.disable_keyboard_navigation || false : false;
        const first_window = this.container.querySelector(".carousel-content");
        if (first_window) {
            this.width = parseFloat(window.getComputedStyle(first_window).width);
        }
        else {
            throw new Error("There is no window in the carousel.");
        }
        // init
        // it's important not to take the computed style every time
        // because if the user is too fast changing the tab,
        // then we'll get the left property during a transition
        // therefore, every window will be shifted.
        // That's why we must set the left property for each window.
        const windows = this.container.querySelectorAll(".carousel-content");
        if (windows) {
            for (let i = 0; i < windows.length; i++) {
                windows[i].style.left = (this.width * i) + "px";
            }
        }
        else {
            throw new Error("There is no window in the carousel.");
        }
        if (this.allow_tabs && this.tabs) {
            this.max_index = this.tabs.length - 1;
        }
        else if (windows) {
            this.max_index = windows.length - 1;
        }
        // events
        if (this.allow_navbuttons)
            this._enable_navigation_buttons();
        if (this.allow_tabs && this.tabs)
            this._enable_tabs_buttons();
        if (!this.disable_keyboard_navigation)
            this._enable_keyboard_navigation();
        // auto nav
        if (this.allow_autonav) {
            window.setInterval(() => {
                if (this.current_delay >= this.autonav_delay) {
                    this.next();
                    this.current_delay = 0;
                }
                else {
                    this.current_delay += 1000;
                }
            }, 1000);
        }
    }
    /**
     * Enables the navigation buttons.
     * @private
     */
    _enable_navigation_buttons() {
        if (this.allow_navbuttons) {
            const prev_button = this.buttons[0];
            const next_button = this.buttons[1];
            if (next_button) {
                next_button.addEventListener("click", () => {
                    this.next();
                    this.current_delay = 0;
                });
            }
            else {
                throw new Error("There is no next button.");
            }
            if (prev_button) {
                prev_button.addEventListener("click", () => {
                    this.previous();
                    this.current_delay = 0;
                });
            }
            else {
                throw new Error("There is no previous button.");
            }
        }
    }
    /**
     * Enables the tabs.
     * @private
     */
    _enable_tabs_buttons() {
        if (this.allow_tabs && this.tabs) {
            for (let i = 0; i < this.tabs.length; i++) {
                const tab = this.tabs[i];
                tab.addEventListener("click", () => {
                    this.active_panel(i);
                    this.current_index = i;
                    this.current_delay = 0;
                });
            }
        }
    }
    /**
     * Enables the keyboard navigation, according to [The digital accessibility recommendations]{@link https://www.accede-web.com/en/guidelines/rich-interface-components/carousels/};
     * @private
     */
    _enable_keyboard_navigation() {
        window.addEventListener("keydown", (e) => {
            const focus_on_tabs = this.has_tabs_focus();
            const focus_in_window = this.has_window_focus();
            const cltr_up_in_window = focus_in_window && e.ctrlKey && (e.key === "ArrowUp" || e.keyCode === 38);
            if (cltr_up_in_window) {
                if (this.tabs)
                    this.tabs[this.current_index].focus();
            }
            if (focus_on_tabs) {
                const is_left = e.key === "ArrowLeft" || e.keyCode === 37;
                const is_right = e.key === "ArrowRight" || e.keyCode === 39;
                if (is_left) {
                    this.previous();
                    this.current_delay = 0;
                }
                else if (is_right) {
                    this.next();
                    this.current_delay = 0;
                }
                if (is_left || is_right) {
                    this.tabs[this.current_index].focus();
                    e.preventDefault();
                }
            }
        });
    }
    /**
     * Checks if one of the tabs has the focus.
     * @protected
     */
    has_tabs_focus() {
        if (this.allow_tabs && this.tabs) {
            for (let tab of Array.from(this.tabs)) {
                if (tab == document.activeElement) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Checks if one of the window has the focus.
     * @protected
     */
    has_window_focus() {
        const windows = this.container.querySelectorAll(".carousel-content");
        if (windows) {
            for (let w of Array.from(windows)) {
                for (let child of Array.from(w.children)) {
                    if (child == document.activeElement) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /**
     * Actives a panel.
     * @param {number} index The index of the window.
     */
    active_panel(index) {
        if (this.tabs) {
            const tab = this.tabs[index];
            if (tab) {
                tab.setAttribute("aria-selected", "true");
                tab.setAttribute("tabindex", "0");
                const pos = tab.querySelector(".pos");
                if (pos) {
                    if (!pos.classList.contains("pos-active"))
                        pos.classList.add("pos-active");
                    for (let t of Array.from(this.tabs)) {
                        if (t == tab)
                            continue;
                        t.setAttribute("aria-selected", "false");
                        t.setAttribute("tabindex", "-1");
                        const t_pos = t.querySelector(".pos");
                        if (t_pos) {
                            t_pos.classList.remove("pos-active");
                        }
                        else {
                            throw new Error("A tab is empty. It needs to contain a div with class `pos`.");
                        }
                    }
                }
                else {
                    throw new Error("A tab is empty. It needs to contain a div with class `pos`.");
                }
            }
        }
        this.move(index);
    }
    /**
     * Moves to the next window.
     */
    next() {
        if (this.current_index < this.max_index) {
            this.active_panel(this.current_index + 1);
            this.current_index += 1;
        }
        else {
            this.active_panel(0);
            this.current_index = 0;
        }
    }
    /**
     * Moves to the previous window.
     */
    previous() {
        if (this.current_index > 0) {
            this.active_panel(this.current_index - 1);
            this.current_index -= 1;
        }
        else {
            this.active_panel(this.max_index);
            this.current_index = this.max_index;
        }
    }
    /**
     * Hides a window.
     * @param {Element} window_content The window to be hidden.
     * @protected
     */
    hide_window(window_content) {
        window_content.setAttribute("aria-hidden", "true");
        const focusHandler = new FocusableElement();
        const focusable_elements = focusHandler.getKeyboardFocusableElements(window_content);
        if (focusable_elements) {
            for (let element of focusable_elements) {
                element.setAttribute("tabindex", "-1");
            }
        }
    }
    /**
     * Shows a window.
     * @param {Element} window_content The window to be shown.
     * @protected
     */
    show_window(window_content) {
        window_content.setAttribute("aria-hidden", "false");
        const focusHandler = new FocusableElement();
        focusHandler.focusableQuerySelector = focusHandler.defaultFocusableHTMLElements.join(",") + ",[tabindex='-1']";
        const focusable_elements = focusHandler.getKeyboardFocusableElements(window_content);
        if (focusable_elements) {
            for (let element of focusable_elements) {
                element.setAttribute("tabindex", "0");
            }
        }
    }
    /**
     * Moves the windows.
     * @param {number} index The index of the targeted window.
     * @protected
     */
    move(index) {
        const all_windows = this.container.querySelectorAll(".carousel-content");
        const distance = this.width * (this.current_index - index);
        const targeted_window = all_windows[index];
        if (distance !== 0) {
            for (let window_content of Array.from(all_windows)) {
                const left_property = window_content.style.left;
                const current_left_pos = parseFloat(left_property);
                window_content.style.left = (current_left_pos + distance) + "px";
                if (window_content != targeted_window) {
                    this.hide_window(window_content);
                }
                else {
                    this.show_window(window_content);
                }
            }
        }
    }
}
