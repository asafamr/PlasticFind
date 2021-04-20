
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __spreadArray(to, from) {
        for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
            to[j] = from[i];
        return to;
    }

    /**
     * Copyright (c) 2016 shogogg <shogo@studofly.net>
     *
     * This software is released under the MIT License.
     * http://opensource.org/licenses/mit-license.php
     */
    /** @class */ ((function () {
        function Deferred() {
            var _this = this;
            this.resolve = function (value) {
                _this._resolve(value);
            };
            this.reject = function (reason) {
                _this._reject(reason);
            };
            this._resolve = function (x) { return setTimeout(function () { return _this._resolve(x); }); };
            this._reject = function (x) { return setTimeout(function () { return _this._reject(x); }); };
            this._promise = new Promise(function (resolve, reject) {
                _this._resolve = resolve;
                _this._reject = reject;
            });
        }
        Object.defineProperty(Deferred.prototype, "promise", {
            get: function () {
                return this._promise;
            },
            enumerable: false,
            configurable: true
        });
        return Deferred;
    })());

    // export const IN_PROGRESS = Symbol("IN_PROGRESS");
    var LRU = /** @class */ (function () {
        function LRU(size) {
            if (size === void 0) { size = 10; }
            this.size = size;
            this.items = [];
            this.inprogress = {};
        }
        LRU.prototype.get = function (key, onMissGetter) {
            return __awaiter(this, void 0, void 0, function () {
                var found, promise;
                var _this = this;
                return __generator(this, function (_a) {
                    found = this.items.find(function (x) { return x.key === key; });
                    if (found)
                        return [2 /*return*/, found.value];
                    if (this.inprogress[key]) {
                        return [2 /*return*/, this.inprogress[key]];
                    }
                    promise = onMissGetter()
                        .then(function (res) {
                        _this.items = __spreadArray([{ key: key, value: res }], _this.items).slice(0, _this.size);
                        return res;
                    })
                        .finally(function () {
                        if (_this.inprogress[key])
                            delete _this.inprogress[key];
                    });
                    this.inprogress[key] = promise;
                    return [2 /*return*/, promise];
                });
            });
        };
        return LRU;
    }());

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    function commonjsRequire (target) {
    	throw new Error('Could not dynamically require "' + target + '". Please configure the dynamicRequireTargets option of @rollup/plugin-commonjs appropriately for this require call to behave properly.');
    }

    /*
    WHAT: SublimeText-like Fuzzy Search

    USAGE:
      fuzzysort.single('fs', 'Fuzzy Search') // {score: -16}
      fuzzysort.single('test', 'test') // {score: 0}
      fuzzysort.single('doesnt exist', 'target') // null

      fuzzysort.go('mr', ['Monitor.cpp', 'MeshRenderer.cpp'])
      // [{score: -18, target: "MeshRenderer.cpp"}, {score: -6009, target: "Monitor.cpp"}]

      fuzzysort.highlight(fuzzysort.single('fs', 'Fuzzy Search'), '<b>', '</b>')
      // <b>F</b>uzzy <b>S</b>earch
    */

    var fuzzysort = createCommonjsModule(function (module) {
    (function(root, UMD) {
      if(module.exports) module.exports = UMD();
      else root.fuzzysort = UMD();
    })(commonjsGlobal, function UMD() { function fuzzysortNew(instanceOptions) {

      var fuzzysort = {

        single: function(search, target, options) {
          if(!search) return null
          if(!isObj(search)) search = fuzzysort.getPreparedSearch(search);

          if(!target) return null
          if(!isObj(target)) target = fuzzysort.getPrepared(target);

          var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
            : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo
            : true;
          var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo;
          return algorithm(search, target, search[0])
          // var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991
          // var result = algorithm(search, target, search[0])
          // if(result === null) return null
          // if(result.score < threshold) return null
          // return result
        },

        go: function(search, targets, options) {
          if(!search) return noResults
          search = fuzzysort.prepareSearch(search);
          var searchLowerCode = search[0];

          var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991;
          var limit = options && options.limit || instanceOptions && instanceOptions.limit || 9007199254740991;
          var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
            : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo
            : true;
          var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo;
          var resultsLen = 0; var limitedCount = 0;
          var targetsLen = targets.length;

          // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

          // options.keys
          if(options && options.keys) {
            var scoreFn = options.scoreFn || defaultScoreFn;
            var keys = options.keys;
            var keysLen = keys.length;
            for(var i = targetsLen - 1; i >= 0; --i) { var obj = targets[i];
              var objResults = new Array(keysLen);
              for (var keyI = keysLen - 1; keyI >= 0; --keyI) {
                var key = keys[keyI];
                var target = getValue(obj, key);
                if(!target) { objResults[keyI] = null; continue }
                if(!isObj(target)) target = fuzzysort.getPrepared(target);

                objResults[keyI] = algorithm(search, target, searchLowerCode);
              }
              objResults.obj = obj; // before scoreFn so scoreFn can use it
              var score = scoreFn(objResults);
              if(score === null) continue
              if(score < threshold) continue
              objResults.score = score;
              if(resultsLen < limit) { q.add(objResults); ++resultsLen; }
              else {
                ++limitedCount;
                if(score > q.peek().score) q.replaceTop(objResults);
              }
            }

          // options.key
          } else if(options && options.key) {
            var key = options.key;
            for(var i = targetsLen - 1; i >= 0; --i) { var obj = targets[i];
              var target = getValue(obj, key);
              if(!target) continue
              if(!isObj(target)) target = fuzzysort.getPrepared(target);

              var result = algorithm(search, target, searchLowerCode);
              if(result === null) continue
              if(result.score < threshold) continue

              // have to clone result so duplicate targets from different obj can each reference the correct obj
              result = {target:result.target, _targetLowerCodes:null, _nextBeginningIndexes:null, score:result.score, indexes:result.indexes, obj:obj}; // hidden

              if(resultsLen < limit) { q.add(result); ++resultsLen; }
              else {
                ++limitedCount;
                if(result.score > q.peek().score) q.replaceTop(result);
              }
            }

          // no keys
          } else {
            for(var i = targetsLen - 1; i >= 0; --i) { var target = targets[i];
              if(!target) continue
              if(!isObj(target)) target = fuzzysort.getPrepared(target);

              var result = algorithm(search, target, searchLowerCode);
              if(result === null) continue
              if(result.score < threshold) continue
              if(resultsLen < limit) { q.add(result); ++resultsLen; }
              else {
                ++limitedCount;
                if(result.score > q.peek().score) q.replaceTop(result);
              }
            }
          }

          if(resultsLen === 0) return noResults
          var results = new Array(resultsLen);
          for(var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll();
          results.total = resultsLen + limitedCount;
          return results
        },

        goAsync: function(search, targets, options) {
          var canceled = false;
          var p = new Promise(function(resolve, reject) {
            if(!search) return resolve(noResults)
            search = fuzzysort.prepareSearch(search);
            var searchLowerCode = search[0];

            var q = fastpriorityqueue();
            var iCurrent = targets.length - 1;
            var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991;
            var limit = options && options.limit || instanceOptions && instanceOptions.limit || 9007199254740991;
            var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
              : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo
              : true;
            var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo;
            var resultsLen = 0; var limitedCount = 0;
            function step() {
              if(canceled) return reject('canceled')

              var startMs = Date.now();

              // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

              // options.keys
              if(options && options.keys) {
                var scoreFn = options.scoreFn || defaultScoreFn;
                var keys = options.keys;
                var keysLen = keys.length;
                for(; iCurrent >= 0; --iCurrent) { var obj = targets[iCurrent];
                  var objResults = new Array(keysLen);
                  for (var keyI = keysLen - 1; keyI >= 0; --keyI) {
                    var key = keys[keyI];
                    var target = getValue(obj, key);
                    if(!target) { objResults[keyI] = null; continue }
                    if(!isObj(target)) target = fuzzysort.getPrepared(target);

                    objResults[keyI] = algorithm(search, target, searchLowerCode);
                  }
                  objResults.obj = obj; // before scoreFn so scoreFn can use it
                  var score = scoreFn(objResults);
                  if(score === null) continue
                  if(score < threshold) continue
                  objResults.score = score;
                  if(resultsLen < limit) { q.add(objResults); ++resultsLen; }
                  else {
                    ++limitedCount;
                    if(score > q.peek().score) q.replaceTop(objResults);
                  }

                  if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                    if(Date.now() - startMs >= 10/*asyncInterval*/) {
                      isNode?setImmediate(step):setTimeout(step);
                      return
                    }
                  }
                }

              // options.key
              } else if(options && options.key) {
                var key = options.key;
                for(; iCurrent >= 0; --iCurrent) { var obj = targets[iCurrent];
                  var target = getValue(obj, key);
                  if(!target) continue
                  if(!isObj(target)) target = fuzzysort.getPrepared(target);

                  var result = algorithm(search, target, searchLowerCode);
                  if(result === null) continue
                  if(result.score < threshold) continue

                  // have to clone result so duplicate targets from different obj can each reference the correct obj
                  result = {target:result.target, _targetLowerCodes:null, _nextBeginningIndexes:null, score:result.score, indexes:result.indexes, obj:obj}; // hidden

                  if(resultsLen < limit) { q.add(result); ++resultsLen; }
                  else {
                    ++limitedCount;
                    if(result.score > q.peek().score) q.replaceTop(result);
                  }

                  if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                    if(Date.now() - startMs >= 10/*asyncInterval*/) {
                      isNode?setImmediate(step):setTimeout(step);
                      return
                    }
                  }
                }

              // no keys
              } else {
                for(; iCurrent >= 0; --iCurrent) { var target = targets[iCurrent];
                  if(!target) continue
                  if(!isObj(target)) target = fuzzysort.getPrepared(target);

                  var result = algorithm(search, target, searchLowerCode);
                  if(result === null) continue
                  if(result.score < threshold) continue
                  if(resultsLen < limit) { q.add(result); ++resultsLen; }
                  else {
                    ++limitedCount;
                    if(result.score > q.peek().score) q.replaceTop(result);
                  }

                  if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                    if(Date.now() - startMs >= 10/*asyncInterval*/) {
                      isNode?setImmediate(step):setTimeout(step);
                      return
                    }
                  }
                }
              }

              if(resultsLen === 0) return resolve(noResults)
              var results = new Array(resultsLen);
              for(var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll();
              results.total = resultsLen + limitedCount;
              resolve(results);
            }

            isNode?setImmediate(step):step();
          });
          p.cancel = function() { canceled = true; };
          return p
        },

        highlight: function(result, hOpen, hClose) {
          if(result === null) return null
          if(hOpen === undefined) hOpen = '<b>';
          if(hClose === undefined) hClose = '</b>';
          var highlighted = '';
          var matchesIndex = 0;
          var opened = false;
          var target = result.target;
          var targetLen = target.length;
          var matchesBest = result.indexes;
          for(var i = 0; i < targetLen; ++i) { var char = target[i];
            if(matchesBest[matchesIndex] === i) {
              ++matchesIndex;
              if(!opened) { opened = true;
                highlighted += hOpen;
              }

              if(matchesIndex === matchesBest.length) {
                highlighted += char + hClose + target.substr(i+1);
                break
              }
            } else {
              if(opened) { opened = false;
                highlighted += hClose;
              }
            }
            highlighted += char;
          }

          return highlighted
        },

        prepare: function(target) {
          if(!target) return
          return {target:target, _targetLowerCodes:fuzzysort.prepareLowerCodes(target), _nextBeginningIndexes:null, score:null, indexes:null, obj:null} // hidden
        },
        prepareSlow: function(target) {
          if(!target) return
          return {target:target, _targetLowerCodes:fuzzysort.prepareLowerCodes(target), _nextBeginningIndexes:fuzzysort.prepareNextBeginningIndexes(target), score:null, indexes:null, obj:null} // hidden
        },
        prepareSearch: function(search) {
          if(!search) return
          return fuzzysort.prepareLowerCodes(search)
        },



        // Below this point is only internal code
        // Below this point is only internal code
        // Below this point is only internal code
        // Below this point is only internal code



        getPrepared: function(target) {
          if(target.length > 999) return fuzzysort.prepare(target) // don't cache huge targets
          var targetPrepared = preparedCache.get(target);
          if(targetPrepared !== undefined) return targetPrepared
          targetPrepared = fuzzysort.prepare(target);
          preparedCache.set(target, targetPrepared);
          return targetPrepared
        },
        getPreparedSearch: function(search) {
          if(search.length > 999) return fuzzysort.prepareSearch(search) // don't cache huge searches
          var searchPrepared = preparedSearchCache.get(search);
          if(searchPrepared !== undefined) return searchPrepared
          searchPrepared = fuzzysort.prepareSearch(search);
          preparedSearchCache.set(search, searchPrepared);
          return searchPrepared
        },

        algorithm: function(searchLowerCodes, prepared, searchLowerCode) {
          var targetLowerCodes = prepared._targetLowerCodes;
          var searchLen = searchLowerCodes.length;
          var targetLen = targetLowerCodes.length;
          var searchI = 0; // where we at
          var targetI = 0; // where you at
          var typoSimpleI = 0;
          var matchesSimpleLen = 0;

          // very basic fuzzy match; to remove non-matching targets ASAP!
          // walk through target. find sequential matches.
          // if all chars aren't found then exit
          for(;;) {
            var isMatch = searchLowerCode === targetLowerCodes[targetI];
            if(isMatch) {
              matchesSimple[matchesSimpleLen++] = targetI;
              ++searchI; if(searchI === searchLen) break
              searchLowerCode = searchLowerCodes[typoSimpleI===0?searchI : (typoSimpleI===searchI?searchI+1 : (typoSimpleI===searchI-1?searchI-1 : searchI))];
            }

            ++targetI; if(targetI >= targetLen) { // Failed to find searchI
              // Check for typo or exit
              // we go as far as possible before trying to transpose
              // then we transpose backwards until we reach the beginning
              for(;;) {
                if(searchI <= 1) return null // not allowed to transpose first char
                if(typoSimpleI === 0) { // we haven't tried to transpose yet
                  --searchI;
                  var searchLowerCodeNew = searchLowerCodes[searchI];
                  if(searchLowerCode === searchLowerCodeNew) continue // doesn't make sense to transpose a repeat char
                  typoSimpleI = searchI;
                } else {
                  if(typoSimpleI === 1) return null // reached the end of the line for transposing
                  --typoSimpleI;
                  searchI = typoSimpleI;
                  searchLowerCode = searchLowerCodes[searchI + 1];
                  var searchLowerCodeNew = searchLowerCodes[searchI];
                  if(searchLowerCode === searchLowerCodeNew) continue // doesn't make sense to transpose a repeat char
                }
                matchesSimpleLen = searchI;
                targetI = matchesSimple[matchesSimpleLen - 1] + 1;
                break
              }
            }
          }

          var searchI = 0;
          var typoStrictI = 0;
          var successStrict = false;
          var matchesStrictLen = 0;

          var nextBeginningIndexes = prepared._nextBeginningIndexes;
          if(nextBeginningIndexes === null) nextBeginningIndexes = prepared._nextBeginningIndexes = fuzzysort.prepareNextBeginningIndexes(prepared.target);
          var firstPossibleI = targetI = matchesSimple[0]===0 ? 0 : nextBeginningIndexes[matchesSimple[0]-1];

          // Our target string successfully matched all characters in sequence!
          // Let's try a more advanced and strict test to improve the score
          // only count it as a match if it's consecutive or a beginning character!
          if(targetI !== targetLen) for(;;) {
            if(targetI >= targetLen) {
              // We failed to find a good spot for this search char, go back to the previous search char and force it forward
              if(searchI <= 0) { // We failed to push chars forward for a better match
                // transpose, starting from the beginning
                ++typoStrictI; if(typoStrictI > searchLen-2) break
                if(searchLowerCodes[typoStrictI] === searchLowerCodes[typoStrictI+1]) continue // doesn't make sense to transpose a repeat char
                targetI = firstPossibleI;
                continue
              }

              --searchI;
              var lastMatch = matchesStrict[--matchesStrictLen];
              targetI = nextBeginningIndexes[lastMatch];

            } else {
              var isMatch = searchLowerCodes[typoStrictI===0?searchI : (typoStrictI===searchI?searchI+1 : (typoStrictI===searchI-1?searchI-1 : searchI))] === targetLowerCodes[targetI];
              if(isMatch) {
                matchesStrict[matchesStrictLen++] = targetI;
                ++searchI; if(searchI === searchLen) { successStrict = true; break }
                ++targetI;
              } else {
                targetI = nextBeginningIndexes[targetI];
              }
            }
          }

          { // tally up the score & keep track of matches for highlighting later
            if(successStrict) { var matchesBest = matchesStrict; var matchesBestLen = matchesStrictLen; }
            else { var matchesBest = matchesSimple; var matchesBestLen = matchesSimpleLen; }
            var score = 0;
            var lastTargetI = -1;
            for(var i = 0; i < searchLen; ++i) { var targetI = matchesBest[i];
              // score only goes down if they're not consecutive
              if(lastTargetI !== targetI - 1) score -= targetI;
              lastTargetI = targetI;
            }
            if(!successStrict) {
              score *= 1000;
              if(typoSimpleI !== 0) score += -20;/*typoPenalty*/
            } else {
              if(typoStrictI !== 0) score += -20;/*typoPenalty*/
            }
            score -= targetLen - searchLen;
            prepared.score = score;
            prepared.indexes = new Array(matchesBestLen); for(var i = matchesBestLen - 1; i >= 0; --i) prepared.indexes[i] = matchesBest[i];

            return prepared
          }
        },

        algorithmNoTypo: function(searchLowerCodes, prepared, searchLowerCode) {
          var targetLowerCodes = prepared._targetLowerCodes;
          var searchLen = searchLowerCodes.length;
          var targetLen = targetLowerCodes.length;
          var searchI = 0; // where we at
          var targetI = 0; // where you at
          var matchesSimpleLen = 0;

          // very basic fuzzy match; to remove non-matching targets ASAP!
          // walk through target. find sequential matches.
          // if all chars aren't found then exit
          for(;;) {
            var isMatch = searchLowerCode === targetLowerCodes[targetI];
            if(isMatch) {
              matchesSimple[matchesSimpleLen++] = targetI;
              ++searchI; if(searchI === searchLen) break
              searchLowerCode = searchLowerCodes[searchI];
            }
            ++targetI; if(targetI >= targetLen) return null // Failed to find searchI
          }

          var searchI = 0;
          var successStrict = false;
          var matchesStrictLen = 0;

          var nextBeginningIndexes = prepared._nextBeginningIndexes;
          if(nextBeginningIndexes === null) nextBeginningIndexes = prepared._nextBeginningIndexes = fuzzysort.prepareNextBeginningIndexes(prepared.target);
          targetI = matchesSimple[0]===0 ? 0 : nextBeginningIndexes[matchesSimple[0]-1];

          // Our target string successfully matched all characters in sequence!
          // Let's try a more advanced and strict test to improve the score
          // only count it as a match if it's consecutive or a beginning character!
          if(targetI !== targetLen) for(;;) {
            if(targetI >= targetLen) {
              // We failed to find a good spot for this search char, go back to the previous search char and force it forward
              if(searchI <= 0) break // We failed to push chars forward for a better match

              --searchI;
              var lastMatch = matchesStrict[--matchesStrictLen];
              targetI = nextBeginningIndexes[lastMatch];

            } else {
              var isMatch = searchLowerCodes[searchI] === targetLowerCodes[targetI];
              if(isMatch) {
                matchesStrict[matchesStrictLen++] = targetI;
                ++searchI; if(searchI === searchLen) { successStrict = true; break }
                ++targetI;
              } else {
                targetI = nextBeginningIndexes[targetI];
              }
            }
          }

          { // tally up the score & keep track of matches for highlighting later
            if(successStrict) { var matchesBest = matchesStrict; var matchesBestLen = matchesStrictLen; }
            else { var matchesBest = matchesSimple; var matchesBestLen = matchesSimpleLen; }
            var score = 0;
            var lastTargetI = -1;
            for(var i = 0; i < searchLen; ++i) { var targetI = matchesBest[i];
              // score only goes down if they're not consecutive
              if(lastTargetI !== targetI - 1) score -= targetI;
              lastTargetI = targetI;
            }
            if(!successStrict) score *= 1000;
            score -= targetLen - searchLen;
            prepared.score = score;
            prepared.indexes = new Array(matchesBestLen); for(var i = matchesBestLen - 1; i >= 0; --i) prepared.indexes[i] = matchesBest[i];

            return prepared
          }
        },

        prepareLowerCodes: function(str) {
          var strLen = str.length;
          var lowerCodes = []; // new Array(strLen)    sparse array is too slow
          var lower = str.toLowerCase();
          for(var i = 0; i < strLen; ++i) lowerCodes[i] = lower.charCodeAt(i);
          return lowerCodes
        },
        prepareBeginningIndexes: function(target) {
          var targetLen = target.length;
          var beginningIndexes = []; var beginningIndexesLen = 0;
          var wasUpper = false;
          var wasAlphanum = false;
          for(var i = 0; i < targetLen; ++i) {
            var targetCode = target.charCodeAt(i);
            var isUpper = targetCode>=65&&targetCode<=90;
            var isAlphanum = isUpper || targetCode>=97&&targetCode<=122 || targetCode>=48&&targetCode<=57;
            var isBeginning = isUpper && !wasUpper || !wasAlphanum || !isAlphanum;
            wasUpper = isUpper;
            wasAlphanum = isAlphanum;
            if(isBeginning) beginningIndexes[beginningIndexesLen++] = i;
          }
          return beginningIndexes
        },
        prepareNextBeginningIndexes: function(target) {
          var targetLen = target.length;
          var beginningIndexes = fuzzysort.prepareBeginningIndexes(target);
          var nextBeginningIndexes = []; // new Array(targetLen)     sparse array is too slow
          var lastIsBeginning = beginningIndexes[0];
          var lastIsBeginningI = 0;
          for(var i = 0; i < targetLen; ++i) {
            if(lastIsBeginning > i) {
              nextBeginningIndexes[i] = lastIsBeginning;
            } else {
              lastIsBeginning = beginningIndexes[++lastIsBeginningI];
              nextBeginningIndexes[i] = lastIsBeginning===undefined ? targetLen : lastIsBeginning;
            }
          }
          return nextBeginningIndexes
        },

        cleanup: cleanup,
        new: fuzzysortNew,
      };
      return fuzzysort
    } // fuzzysortNew

    // This stuff is outside fuzzysortNew, because it's shared with instances of fuzzysort.new()
    var isNode = typeof commonjsRequire !== 'undefined' && typeof window === 'undefined';
    // var MAX_INT = Number.MAX_SAFE_INTEGER
    // var MIN_INT = Number.MIN_VALUE
    var preparedCache = new Map();
    var preparedSearchCache = new Map();
    var noResults = []; noResults.total = 0;
    var matchesSimple = []; var matchesStrict = [];
    function cleanup() { preparedCache.clear(); preparedSearchCache.clear(); matchesSimple = []; matchesStrict = []; }
    function defaultScoreFn(a) {
      var max = -9007199254740991;
      for (var i = a.length - 1; i >= 0; --i) {
        var result = a[i]; if(result === null) continue
        var score = result.score;
        if(score > max) max = score;
      }
      if(max === -9007199254740991) return null
      return max
    }

    // prop = 'key'              2.5ms optimized for this case, seems to be about as fast as direct obj[prop]
    // prop = 'key1.key2'        10ms
    // prop = ['key1', 'key2']   27ms
    function getValue(obj, prop) {
      var tmp = obj[prop]; if(tmp !== undefined) return tmp
      var segs = prop;
      if(!Array.isArray(prop)) segs = prop.split('.');
      var len = segs.length;
      var i = -1;
      while (obj && (++i < len)) obj = obj[segs[i]];
      return obj
    }

    function isObj(x) { return typeof x === 'object' } // faster as a function

    // Hacked version of https://github.com/lemire/FastPriorityQueue.js
    var fastpriorityqueue=function(){var r=[],o=0,e={};function n(){for(var e=0,n=r[e],c=1;c<o;){var f=c+1;e=c,f<o&&r[f].score<r[c].score&&(e=f),r[e-1>>1]=r[e],c=1+(e<<1);}for(var a=e-1>>1;e>0&&n.score<r[a].score;a=(e=a)-1>>1)r[e]=r[a];r[e]=n;}return e.add=function(e){var n=o;r[o++]=e;for(var c=n-1>>1;n>0&&e.score<r[c].score;c=(n=c)-1>>1)r[n]=r[c];r[n]=e;},e.poll=function(){if(0!==o){var e=r[0];return r[0]=r[--o],n(),e}},e.peek=function(e){if(0!==o)return r[0]},e.replaceTop=function(o){r[0]=o,n();},e};
    var q = fastpriorityqueue(); // reuse this, except for async, it needs to make its own

    return fuzzysortNew()
    }); // UMD

    // TODO: (performance) wasm version!?

    // TODO: (performance) layout memory in an optimal way to go fast by avoiding cache misses

    // TODO: (performance) preparedCache is a memory leak

    // TODO: (like sublime) backslash === forwardslash

    // TODO: (performance) i have no idea how well optizmied the allowing typos algorithm is
    });

    /**
     * create fuzzy completions from a subset of vocabulary strings
     * many FuzzyCorpus are handled by one FuzzyVocabProvider (e.g. by prefix)
     */
    var FuzzyCorpus = /** @class */ (function () {
        function FuzzyCorpus(strs) {
            this.prepArr = strs.map(fuzzysort.prepare);
        }
        FuzzyCorpus.mergeSuggestions = function () {
            var sug = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                sug[_i] = arguments[_i];
            }
            var found = {};
            for (var _a = 0, _b = [].concat.apply([], sug.map(function (x) { return x !== null && x !== void 0 ? x : []; })); _a < _b.length; _a++) {
                var s = _b[_a];
                if (!found[s.word] || found[s.word].score < s.score) {
                    found[s.word] = s;
                }
            }
            // found[subword] = { word: subword, score: 1.0 };
            return Object.values(found).sort(function (a, b) { return b.score - a.score; });
        };
        FuzzyCorpus.prototype.getCompletions = function (prefix, _a) {
            var _b = _a.count, count = _b === void 0 ? 3 : _b, _c = _a.scoreFactor, scoreFactor = _c === void 0 ? 1 : _c;
            return __awaiter(this, void 0, void 0, function () {
                var matches;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, fuzzysort.goAsync(prefix, this.prepArr, {
                                allowTypo: true,
                                limit: count,
                            })];
                        case 1:
                            matches = _d.sent();
                            return [2 /*return*/, matches.map(function (x) {
                                    return { word: x.target, score: (1 + x.score / 10000) * scoreFactor };
                                })];
                    }
                });
            });
        };
        return FuzzyCorpus;
    }());

    /**
     * fetches fuzzy corpora data by prefix, creates and handles FuzzyCorpus instances
     */
    var FuzzyVocabProvider = /** @class */ (function () {
        function FuzzyVocabProvider(requestManager, prefixUrl, frequentVocabUrl, nCompletions, lruSize) {
            if (nCompletions === void 0) { nCompletions = 3; }
            if (lruSize === void 0) { lruSize = 10; }
            this.requestManager = requestManager;
            this.prefixUrl = prefixUrl;
            this.nCompletions = nCompletions;
            this.completerLRU = new LRU(lruSize);
            this.suggestionLRU = new LRU(lruSize);
            this.frequentVocabCompleter = requestManager
                .getJson(frequentVocabUrl, { retries: 20, retryDelay: 50 })
                .then(function (res) { return new FuzzyCorpus(res); });
            this.suggestionLRU = new LRU(lruSize);
        }
        FuzzyVocabProvider.prototype.getCompletionsForWord = function (word) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.suggestionLRU.get(word, function () { return _this.createCompletions(word); })];
                });
            });
        };
        FuzzyVocabProvider.prototype.createCompletions = function (word) {
            return __awaiter(this, void 0, void 0, function () {
                var suggestionPromises, freqPromise, prefix_1, prefixPromise, res;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            suggestionPromises = [
                            // Promise.resolve([originalWordSuggestion]),
                            ];
                            freqPromise = this.frequentVocabCompleter.then(function (comp) {
                                return comp.getCompletions(word, { count: _this.nCompletions, scoreFactor: 0.9 });
                            });
                            suggestionPromises.push(freqPromise);
                            if (word.length >= 2) {
                                prefix_1 = word.slice(0, 2).toLowerCase();
                                prefixPromise = this.completerLRU
                                    .get(prefix_1, function () { return _this.getPrefixCompleter(prefix_1); })
                                    .then(function (comp) {
                                    return comp.getCompletions(word, {
                                        count: _this.nCompletions,
                                        scoreFactor: 0.8,
                                    });
                                });
                                suggestionPromises.push(prefixPromise);
                            }
                            return [4 /*yield*/, Promise.allSettled(suggestionPromises)];
                        case 1:
                            res = _a.sent();
                            return [2 /*return*/, FuzzyCorpus.mergeSuggestions(res.flatMap(function (x) { return (x.status === "fulfilled" ? x.value : []); })).slice(0, this.nCompletions)];
                    }
                });
            });
        };
        FuzzyVocabProvider.prototype.getPrefixCompleter = function (prefix) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.requestManager
                            .getJson(this.prefixUrl + "/" + prefix + ".json", { retries: 1, timeoutMs: 1000 })
                            .then(function (res) { return new FuzzyCorpus(res); })];
                });
            });
        };
        return FuzzyVocabProvider;
    }());

    var WHITELIST = [
    	'ETIMEDOUT',
    	'ECONNRESET',
    	'EADDRINUSE',
    	'ESOCKETTIMEDOUT',
    	'ECONNREFUSED',
    	'EPIPE',
    	'EHOSTUNREACH',
    	'EAI_AGAIN'
    ];

    var BLACKLIST = [
    	'ENOTFOUND',
    	'ENETUNREACH',

    	// SSL errors from https://github.com/nodejs/node/blob/ed3d8b13ee9a705d89f9e0397d9e96519e7e47ac/src/node_crypto.cc#L1950
    	'UNABLE_TO_GET_ISSUER_CERT',
    	'UNABLE_TO_GET_CRL',
    	'UNABLE_TO_DECRYPT_CERT_SIGNATURE',
    	'UNABLE_TO_DECRYPT_CRL_SIGNATURE',
    	'UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY',
    	'CERT_SIGNATURE_FAILURE',
    	'CRL_SIGNATURE_FAILURE',
    	'CERT_NOT_YET_VALID',
    	'CERT_HAS_EXPIRED',
    	'CRL_NOT_YET_VALID',
    	'CRL_HAS_EXPIRED',
    	'ERROR_IN_CERT_NOT_BEFORE_FIELD',
    	'ERROR_IN_CERT_NOT_AFTER_FIELD',
    	'ERROR_IN_CRL_LAST_UPDATE_FIELD',
    	'ERROR_IN_CRL_NEXT_UPDATE_FIELD',
    	'OUT_OF_MEM',
    	'DEPTH_ZERO_SELF_SIGNED_CERT',
    	'SELF_SIGNED_CERT_IN_CHAIN',
    	'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    	'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    	'CERT_CHAIN_TOO_LONG',
    	'CERT_REVOKED',
    	'INVALID_CA',
    	'PATH_LENGTH_EXCEEDED',
    	'INVALID_PURPOSE',
    	'CERT_UNTRUSTED',
    	'CERT_REJECTED'
    ];

    var isRetryAllowed = function (err) {
    	if (!err || !err.code) {
    		return true;
    	}

    	if (WHITELIST.indexOf(err.code) !== -1) {
    		return true;
    	}

    	if (BLACKLIST.indexOf(err.code) !== -1) {
    		return false;
    	}

    	return true;
    };

    var isNetworkError_1 = isNetworkError;
    var isRetryableError_1 = isRetryableError;
    var isSafeRequestError_1 = isSafeRequestError;
    var isIdempotentRequestError_1 = isIdempotentRequestError;
    var isNetworkOrIdempotentRequestError_1 = isNetworkOrIdempotentRequestError;
    var exponentialDelay_1 = exponentialDelay;
    var _default$1 = axiosRetry$1;



    var _isRetryAllowed2 = _interopRequireDefault(isRetryAllowed);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var namespace = 'axios-retry';

    /**
     * @param  {Error}  error
     * @return {boolean}
     */
    function isNetworkError(error) {
      return !error.response && Boolean(error.code) && // Prevents retrying cancelled requests
      error.code !== 'ECONNABORTED' && // Prevents retrying timed out requests
      (0, _isRetryAllowed2.default)(error); // Prevents retrying unsafe errors
    }

    var SAFE_HTTP_METHODS = ['get', 'head', 'options'];
    var IDEMPOTENT_HTTP_METHODS = SAFE_HTTP_METHODS.concat(['put', 'delete']);

    /**
     * @param  {Error}  error
     * @return {boolean}
     */
    function isRetryableError(error) {
      return error.code !== 'ECONNABORTED' && (!error.response || error.response.status >= 500 && error.response.status <= 599);
    }

    /**
     * @param  {Error}  error
     * @return {boolean}
     */
    function isSafeRequestError(error) {
      if (!error.config) {
        // Cannot determine if the request can be retried
        return false;
      }

      return isRetryableError(error) && SAFE_HTTP_METHODS.indexOf(error.config.method) !== -1;
    }

    /**
     * @param  {Error}  error
     * @return {boolean}
     */
    function isIdempotentRequestError(error) {
      if (!error.config) {
        // Cannot determine if the request can be retried
        return false;
      }

      return isRetryableError(error) && IDEMPOTENT_HTTP_METHODS.indexOf(error.config.method) !== -1;
    }

    /**
     * @param  {Error}  error
     * @return {boolean}
     */
    function isNetworkOrIdempotentRequestError(error) {
      return isNetworkError(error) || isIdempotentRequestError(error);
    }

    /**
     * @return {number} - delay in milliseconds, always 0
     */
    function noDelay() {
      return 0;
    }

    /**
     * @param  {number} [retryNumber=0]
     * @return {number} - delay in milliseconds
     */
    function exponentialDelay() {
      var retryNumber = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      var delay = Math.pow(2, retryNumber) * 100;
      var randomSum = delay * 0.2 * Math.random(); // 0-20% of the delay
      return delay + randomSum;
    }

    /**
     * Initializes and returns the retry state for the given request/config
     * @param  {AxiosRequestConfig} config
     * @return {Object}
     */
    function getCurrentState(config) {
      var currentState = config[namespace] || {};
      currentState.retryCount = currentState.retryCount || 0;
      config[namespace] = currentState;
      return currentState;
    }

    /**
     * Returns the axios-retry options for the current request
     * @param  {AxiosRequestConfig} config
     * @param  {AxiosRetryConfig} defaultOptions
     * @return {AxiosRetryConfig}
     */
    function getRequestOptions(config, defaultOptions) {
      return Object.assign({}, defaultOptions, config[namespace]);
    }

    /**
     * @param  {Axios} axios
     * @param  {AxiosRequestConfig} config
     */
    function fixConfig(axios, config) {
      if (axios.defaults.agent === config.agent) {
        delete config.agent;
      }
      if (axios.defaults.httpAgent === config.httpAgent) {
        delete config.httpAgent;
      }
      if (axios.defaults.httpsAgent === config.httpsAgent) {
        delete config.httpsAgent;
      }
    }

    /**
     * Adds response interceptors to an axios instance to retry requests failed due to network issues
     *
     * @example
     *
     * import axios from 'axios';
     *
     * axiosRetry(axios, { retries: 3 });
     *
     * axios.get('http://example.com/test') // The first request fails and the second returns 'ok'
     *   .then(result => {
     *     result.data; // 'ok'
     *   });
     *
     * // Exponential back-off retry delay between requests
     * axiosRetry(axios, { retryDelay : axiosRetry.exponentialDelay});
     *
     * // Custom retry delay
     * axiosRetry(axios, { retryDelay : (retryCount) => {
     *   return retryCount * 1000;
     * }});
     *
     * // Also works with custom axios instances
     * const client = axios.create({ baseURL: 'http://example.com' });
     * axiosRetry(client, { retries: 3 });
     *
     * client.get('/test') // The first request fails and the second returns 'ok'
     *   .then(result => {
     *     result.data; // 'ok'
     *   });
     *
     * // Allows request-specific configuration
     * client
     *   .get('/test', {
     *     'axios-retry': {
     *       retries: 0
     *     }
     *   })
     *   .catch(error => { // The first request fails
     *     error !== undefined
     *   });
     *
     * @param {Axios} axios An axios instance (the axios object or one created from axios.create)
     * @param {Object} [defaultOptions]
     * @param {number} [defaultOptions.retries=3] Number of retries
     * @param {boolean} [defaultOptions.shouldResetTimeout=false]
     *        Defines if the timeout should be reset between retries
     * @param {Function} [defaultOptions.retryCondition=isNetworkOrIdempotentRequestError]
     *        A function to determine if the error can be retried
     * @param {Function} [defaultOptions.retryDelay=noDelay]
     *        A function to determine the delay between retry requests
     */
    function axiosRetry$1(axios, defaultOptions) {
      axios.interceptors.request.use(function (config) {
        var currentState = getCurrentState(config);
        currentState.lastRequestTime = Date.now();
        return config;
      });

      axios.interceptors.response.use(null, function (error) {
        var config = error.config;

        // If we have no information to retry the request
        if (!config) {
          return Promise.reject(error);
        }

        var _getRequestOptions = getRequestOptions(config, defaultOptions),
            _getRequestOptions$re = _getRequestOptions.retries,
            retries = _getRequestOptions$re === undefined ? 3 : _getRequestOptions$re,
            _getRequestOptions$re2 = _getRequestOptions.retryCondition,
            retryCondition = _getRequestOptions$re2 === undefined ? isNetworkOrIdempotentRequestError : _getRequestOptions$re2,
            _getRequestOptions$re3 = _getRequestOptions.retryDelay,
            retryDelay = _getRequestOptions$re3 === undefined ? noDelay : _getRequestOptions$re3,
            _getRequestOptions$sh = _getRequestOptions.shouldResetTimeout,
            shouldResetTimeout = _getRequestOptions$sh === undefined ? false : _getRequestOptions$sh;

        var currentState = getCurrentState(config);

        var shouldRetry = retryCondition(error) && currentState.retryCount < retries;

        if (shouldRetry) {
          currentState.retryCount += 1;
          var delay = retryDelay(currentState.retryCount, error);

          // Axios fails merging this configuration to the default configuration because it has an issue
          // with circular structures: https://github.com/mzabriskie/axios/issues/370
          fixConfig(axios, config);

          if (!shouldResetTimeout && config.timeout && currentState.lastRequestTime) {
            var lastRequestDuration = Date.now() - currentState.lastRequestTime;
            // Minimum 1ms timeout (passing 0 or less to XHR means no timeout)
            config.timeout = Math.max(config.timeout - lastRequestDuration - delay, 1);
          }

          config.transformRequest = [function (data) {
            return data;
          }];

          return new Promise(function (resolve) {
            return setTimeout(function () {
              return resolve(axios(config));
            }, delay);
          });
        }

        return Promise.reject(error);
      });
    }

    // Compatibility with CommonJS
    axiosRetry$1.isNetworkError = isNetworkError;
    axiosRetry$1.isSafeRequestError = isSafeRequestError;
    axiosRetry$1.isIdempotentRequestError = isIdempotentRequestError;
    axiosRetry$1.isNetworkOrIdempotentRequestError = isNetworkOrIdempotentRequestError;
    axiosRetry$1.exponentialDelay = exponentialDelay;
    axiosRetry$1.isRetryableError = isRetryableError;


    var lib = /*#__PURE__*/Object.defineProperty({
    	isNetworkError: isNetworkError_1,
    	isRetryableError: isRetryableError_1,
    	isSafeRequestError: isSafeRequestError_1,
    	isIdempotentRequestError: isIdempotentRequestError_1,
    	isNetworkOrIdempotentRequestError: isNetworkOrIdempotentRequestError_1,
    	exponentialDelay: exponentialDelay_1,
    	default: _default$1
    }, '__esModule', {value: true});

    var axiosRetry = lib.default;

    var bind = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return toString.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (toString.call(val) !== '[object Object]') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code
        };
      };
      return error;
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        // Listen for ready state
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
            return;
          }

          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(resolve, reject, response);

          // Clean up request
          request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
            // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
            if (config.responseType !== 'json') {
              throw e;
            }
          }
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken) {
          // Handle cancellation
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }

            request.abort();
            reject(cancel);
            // Clean up request
            request = null;
          });
        }

        if (!requestData) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    var defaults = {
      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');
        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data)) {
          setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
          return JSON.stringify(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        /*eslint no-param-reassign:0*/
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) { /* Ignore */ }
        }
        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };

    defaults.headers = {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      var valueFromConfig2Keys = ['url', 'method', 'data'];
      var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
      var defaultToConfig2Keys = [
        'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
        'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
        'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
      ];
      var directMergeKeys = ['validateStatus'];

      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      }

      utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        }
      });

      utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

      utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      utils.forEach(directMergeKeys, function merge(prop) {
        if (prop in config2) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      var axiosKeys = valueFromConfig2Keys
        .concat(mergeDeepPropertiesKeys)
        .concat(defaultToConfig2Keys)
        .concat(directMergeKeys);

      var otherKeys = Object
        .keys(config1)
        .concat(Object.keys(config2))
        .filter(function filterAxiosKeys(key) {
          return axiosKeys.indexOf(key) === -1;
        });

      utils.forEach(otherKeys, mergeDeepProperties);

      return config;
    };

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: (config || {}).data
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    var isAxiosError = function isAxiosError(payload) {
      return (typeof payload === 'object') && (payload.isAxiosError === true);
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios$1 = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios$1.Axios = Axios_1;

    // Factory for creating new instances
    axios$1.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios$1.defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios$1.Cancel = Cancel_1;
    axios$1.CancelToken = CancelToken_1;
    axios$1.isCancel = isCancel;

    // Expose all/spread
    axios$1.all = function all(promises) {
      return Promise.all(promises);
    };
    axios$1.spread = spread;

    // Expose isAxiosError
    axios$1.isAxiosError = isAxiosError;

    var axios_1 = axios$1;

    // Allow use of default import syntax in TypeScript
    var _default = axios$1;
    axios_1.default = _default;

    var axios = axios_1;

    var RequestManager = /** @class */ (function () {
        function RequestManager(cacheInvalidationVersion) {
            this.cacheInvalidationVersion = cacheInvalidationVersion;
        }
        return RequestManager;
    }());
    var RequestManagerImp = /** @class */ (function (_super) {
        __extends(RequestManagerImp, _super);
        function RequestManagerImp(cacheInvalidationVersion) {
            var _this = _super.call(this, cacheInvalidationVersion) || this;
            _this.cacheInvalidationVersion = cacheInvalidationVersion;
            axiosRetry(axios, { retries: 3, retryDelay: function () { return 30; } });
            return _this;
        }
        RequestManagerImp.prototype.setVersionCacheInvalidation = function (version) {
            this.version = version;
        };
        RequestManagerImp.prototype.getJson = function (url, _a) {
            var _b = _a.retries, retries = _b === void 0 ? 0 : _b, _c = _a.timeoutMs, timeoutMs = _c === void 0 ? 0 : _c, _d = _a.retryDelay, retryDelay = _d === void 0 ? 30 : _d;
            return __awaiter(this, void 0, void 0, function () {
                var abort, timeoutHandle;
                return __generator(this, function (_e) {
                    abort = axios.CancelToken.source();
                    timeoutHandle = timeoutMs &&
                        setTimeout(function () { return abort.cancel("Timeout of " + timeoutMs + "ms."); }, timeoutMs);
                    return [2 /*return*/, axios
                            .get(url + (this.cacheInvalidationVersion ? "?v=" + this.cacheInvalidationVersion : ""), {
                            cancelToken: abort.token,
                            "axios-retry": {
                                retryDelay: function () { return retryDelay; },
                                retries: retries,
                            },
                        })
                            .then(function (res) {
                            if (timeoutHandle)
                                clearTimeout(timeoutHandle);
                            return res.data;
                        })];
                });
            });
        };
        return RequestManagerImp;
    }(RequestManager));

    var extendedPictographic = /^[\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9-\u21AA\u231A-\u231B\u2328\u2388\u23CF\u23E9-\u23EC\u23ED-\u23EE\u23EF\u23F0\u23F1-\u23F2\u23F3\u23F8-\u23FA\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2601\u2602-\u2603\u2604\u2605\u2607-\u260D\u260E\u260F-\u2610\u2611\u2612\u2614-\u2615\u2616-\u2617\u2618\u2619-\u261C\u261D\u261E-\u261F\u2620\u2621\u2622-\u2623\u2624-\u2625\u2626\u2627-\u2629\u262A\u262B-\u262D\u262E\u262F\u2630-\u2637\u2638-\u2639\u263A\u263B-\u263F\u2640\u2641\u2642\u2643-\u2647\u2648-\u2653\u2654-\u265E\u265F\u2660\u2661-\u2662\u2663\u2664\u2665-\u2666\u2667\u2668\u2669-\u267A\u267B\u267C-\u267D\u267E\u267F\u2680-\u2685\u2690-\u2691\u2692\u2693\u2694\u2695\u2696-\u2697\u2698\u2699\u269A\u269B-\u269C\u269D-\u269F\u26A0-\u26A1\u26A2-\u26A6\u26A7\u26A8-\u26A9\u26AA-\u26AB\u26AC-\u26AF\u26B0-\u26B1\u26B2-\u26BC\u26BD-\u26BE\u26BF-\u26C3\u26C4-\u26C5\u26C6-\u26C7\u26C8\u26C9-\u26CD\u26CE\u26CF\u26D0\u26D1\u26D2\u26D3\u26D4\u26D5-\u26E8\u26E9\u26EA\u26EB-\u26EF\u26F0-\u26F1\u26F2-\u26F3\u26F4\u26F5\u26F6\u26F7-\u26F9\u26FA\u26FB-\u26FC\u26FD\u26FE-\u2701\u2702\u2703-\u2704\u2705\u2708-\u270C\u270D\u270E\u270F\u2710-\u2711\u2712\u2714\u2716\u271D\u2721\u2728\u2733-\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2765-\u2767\u2795-\u2797\u27A1\u27B0\u27BF\u2934-\u2935\u2B05-\u2B07\u2B1B-\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299\u{01F000}-\u{01F003}\u{01F004}\u{01F005}-\u{01F0CE}\u{01F0CF}\u{01F0D0}-\u{01F0FF}\u{01F10D}-\u{01F10F}\u{01F12F}\u{01F16C}-\u{01F16F}\u{01F170}-\u{01F171}\u{01F17E}-\u{01F17F}\u{01F18E}\u{01F191}-\u{01F19A}\u{01F1AD}-\u{01F1E5}\u{01F201}-\u{01F202}\u{01F203}-\u{01F20F}\u{01F21A}\u{01F22F}\u{01F232}-\u{01F23A}\u{01F23C}-\u{01F23F}\u{01F249}-\u{01F24F}\u{01F250}-\u{01F251}\u{01F252}-\u{01F2FF}\u{01F300}-\u{01F30C}\u{01F30D}-\u{01F30E}\u{01F30F}\u{01F310}\u{01F311}\u{01F312}\u{01F313}-\u{01F315}\u{01F316}-\u{01F318}\u{01F319}\u{01F31A}\u{01F31B}\u{01F31C}\u{01F31D}-\u{01F31E}\u{01F31F}-\u{01F320}\u{01F321}\u{01F322}-\u{01F323}\u{01F324}-\u{01F32C}\u{01F32D}-\u{01F32F}\u{01F330}-\u{01F331}\u{01F332}-\u{01F333}\u{01F334}-\u{01F335}\u{01F336}\u{01F337}-\u{01F34A}\u{01F34B}\u{01F34C}-\u{01F34F}\u{01F350}\u{01F351}-\u{01F37B}\u{01F37C}\u{01F37D}\u{01F37E}-\u{01F37F}\u{01F380}-\u{01F393}\u{01F394}-\u{01F395}\u{01F396}-\u{01F397}\u{01F398}\u{01F399}-\u{01F39B}\u{01F39C}-\u{01F39D}\u{01F39E}-\u{01F39F}\u{01F3A0}-\u{01F3C4}\u{01F3C5}\u{01F3C6}\u{01F3C7}\u{01F3C8}\u{01F3C9}\u{01F3CA}\u{01F3CB}-\u{01F3CE}\u{01F3CF}-\u{01F3D3}\u{01F3D4}-\u{01F3DF}\u{01F3E0}-\u{01F3E3}\u{01F3E4}\u{01F3E5}-\u{01F3F0}\u{01F3F1}-\u{01F3F2}\u{01F3F3}\u{01F3F4}\u{01F3F5}\u{01F3F6}\u{01F3F7}\u{01F3F8}-\u{01F3FA}\u{01F400}-\u{01F407}\u{01F408}\u{01F409}-\u{01F40B}\u{01F40C}-\u{01F40E}\u{01F40F}-\u{01F410}\u{01F411}-\u{01F412}\u{01F413}\u{01F414}\u{01F415}\u{01F416}\u{01F417}-\u{01F429}\u{01F42A}\u{01F42B}-\u{01F43E}\u{01F43F}\u{01F440}\u{01F441}\u{01F442}-\u{01F464}\u{01F465}\u{01F466}-\u{01F46B}\u{01F46C}-\u{01F46D}\u{01F46E}-\u{01F4AC}\u{01F4AD}\u{01F4AE}-\u{01F4B5}\u{01F4B6}-\u{01F4B7}\u{01F4B8}-\u{01F4EB}\u{01F4EC}-\u{01F4ED}\u{01F4EE}\u{01F4EF}\u{01F4F0}-\u{01F4F4}\u{01F4F5}\u{01F4F6}-\u{01F4F7}\u{01F4F8}\u{01F4F9}-\u{01F4FC}\u{01F4FD}\u{01F4FE}\u{01F4FF}-\u{01F502}\u{01F503}\u{01F504}-\u{01F507}\u{01F508}\u{01F509}\u{01F50A}-\u{01F514}\u{01F515}\u{01F516}-\u{01F52B}\u{01F52C}-\u{01F52D}\u{01F52E}-\u{01F53D}\u{01F546}-\u{01F548}\u{01F549}-\u{01F54A}\u{01F54B}-\u{01F54E}\u{01F54F}\u{01F550}-\u{01F55B}\u{01F55C}-\u{01F567}\u{01F568}-\u{01F56E}\u{01F56F}-\u{01F570}\u{01F571}-\u{01F572}\u{01F573}-\u{01F579}\u{01F57A}\u{01F57B}-\u{01F586}\u{01F587}\u{01F588}-\u{01F589}\u{01F58A}-\u{01F58D}\u{01F58E}-\u{01F58F}\u{01F590}\u{01F591}-\u{01F594}\u{01F595}-\u{01F596}\u{01F597}-\u{01F5A3}\u{01F5A4}\u{01F5A5}\u{01F5A6}-\u{01F5A7}\u{01F5A8}\u{01F5A9}-\u{01F5B0}\u{01F5B1}-\u{01F5B2}\u{01F5B3}-\u{01F5BB}\u{01F5BC}\u{01F5BD}-\u{01F5C1}\u{01F5C2}-\u{01F5C4}\u{01F5C5}-\u{01F5D0}\u{01F5D1}-\u{01F5D3}\u{01F5D4}-\u{01F5DB}\u{01F5DC}-\u{01F5DE}\u{01F5DF}-\u{01F5E0}\u{01F5E1}\u{01F5E2}\u{01F5E3}\u{01F5E4}-\u{01F5E7}\u{01F5E8}\u{01F5E9}-\u{01F5EE}\u{01F5EF}\u{01F5F0}-\u{01F5F2}\u{01F5F3}\u{01F5F4}-\u{01F5F9}\u{01F5FA}\u{01F5FB}-\u{01F5FF}\u{01F600}\u{01F601}-\u{01F606}\u{01F607}-\u{01F608}\u{01F609}-\u{01F60D}\u{01F60E}\u{01F60F}\u{01F610}\u{01F611}\u{01F612}-\u{01F614}\u{01F615}\u{01F616}\u{01F617}\u{01F618}\u{01F619}\u{01F61A}\u{01F61B}\u{01F61C}-\u{01F61E}\u{01F61F}\u{01F620}-\u{01F625}\u{01F626}-\u{01F627}\u{01F628}-\u{01F62B}\u{01F62C}\u{01F62D}\u{01F62E}-\u{01F62F}\u{01F630}-\u{01F633}\u{01F634}\u{01F635}\u{01F636}\u{01F637}-\u{01F640}\u{01F641}-\u{01F644}\u{01F645}-\u{01F64F}\u{01F680}\u{01F681}-\u{01F682}\u{01F683}-\u{01F685}\u{01F686}\u{01F687}\u{01F688}\u{01F689}\u{01F68A}-\u{01F68B}\u{01F68C}\u{01F68D}\u{01F68E}\u{01F68F}\u{01F690}\u{01F691}-\u{01F693}\u{01F694}\u{01F695}\u{01F696}\u{01F697}\u{01F698}\u{01F699}-\u{01F69A}\u{01F69B}-\u{01F6A1}\u{01F6A2}\u{01F6A3}\u{01F6A4}-\u{01F6A5}\u{01F6A6}\u{01F6A7}-\u{01F6AD}\u{01F6AE}-\u{01F6B1}\u{01F6B2}\u{01F6B3}-\u{01F6B5}\u{01F6B6}\u{01F6B7}-\u{01F6B8}\u{01F6B9}-\u{01F6BE}\u{01F6BF}\u{01F6C0}\u{01F6C1}-\u{01F6C5}\u{01F6C6}-\u{01F6CA}\u{01F6CB}\u{01F6CC}\u{01F6CD}-\u{01F6CF}\u{01F6D0}\u{01F6D1}-\u{01F6D2}\u{01F6D3}-\u{01F6D4}\u{01F6D5}\u{01F6D6}-\u{01F6D7}\u{01F6D8}-\u{01F6DF}\u{01F6E0}-\u{01F6E5}\u{01F6E6}-\u{01F6E8}\u{01F6E9}\u{01F6EA}\u{01F6EB}-\u{01F6EC}\u{01F6ED}-\u{01F6EF}\u{01F6F0}\u{01F6F1}-\u{01F6F2}\u{01F6F3}\u{01F6F4}-\u{01F6F6}\u{01F6F7}-\u{01F6F8}\u{01F6F9}\u{01F6FA}\u{01F6FB}-\u{01F6FC}\u{01F6FD}-\u{01F6FF}\u{01F774}-\u{01F77F}\u{01F7D5}-\u{01F7DF}\u{01F7E0}-\u{01F7EB}\u{01F7EC}-\u{01F7FF}\u{01F80C}-\u{01F80F}\u{01F848}-\u{01F84F}\u{01F85A}-\u{01F85F}\u{01F888}-\u{01F88F}\u{01F8AE}-\u{01F8FF}\u{01F90C}\u{01F90D}-\u{01F90F}\u{01F910}-\u{01F918}\u{01F919}-\u{01F91E}\u{01F91F}\u{01F920}-\u{01F927}\u{01F928}-\u{01F92F}\u{01F930}\u{01F931}-\u{01F932}\u{01F933}-\u{01F93A}\u{01F93C}-\u{01F93E}\u{01F93F}\u{01F940}-\u{01F945}\u{01F947}-\u{01F94B}\u{01F94C}\u{01F94D}-\u{01F94F}\u{01F950}-\u{01F95E}\u{01F95F}-\u{01F96B}\u{01F96C}-\u{01F970}\u{01F971}\u{01F972}\u{01F973}-\u{01F976}\u{01F977}-\u{01F978}\u{01F979}\u{01F97A}\u{01F97B}\u{01F97C}-\u{01F97F}\u{01F980}-\u{01F984}\u{01F985}-\u{01F991}\u{01F992}-\u{01F997}\u{01F998}-\u{01F9A2}\u{01F9A3}-\u{01F9A4}\u{01F9A5}-\u{01F9AA}\u{01F9AB}-\u{01F9AD}\u{01F9AE}-\u{01F9AF}\u{01F9B0}-\u{01F9B9}\u{01F9BA}-\u{01F9BF}\u{01F9C0}\u{01F9C1}-\u{01F9C2}\u{01F9C3}-\u{01F9CA}\u{01F9CB}\u{01F9CC}\u{01F9CD}-\u{01F9CF}\u{01F9D0}-\u{01F9E6}\u{01F9E7}-\u{01F9FF}\u{01FA00}-\u{01FA6F}\u{01FA70}-\u{01FA73}\u{01FA74}\u{01FA75}-\u{01FA77}\u{01FA78}-\u{01FA7A}\u{01FA7B}-\u{01FA7F}\u{01FA80}-\u{01FA82}\u{01FA83}-\u{01FA86}\u{01FA87}-\u{01FA8F}\u{01FA90}-\u{01FA95}\u{01FA96}-\u{01FAA8}\u{01FAA9}-\u{01FAAF}\u{01FAB0}-\u{01FAB6}\u{01FAB7}-\u{01FABF}\u{01FAC0}-\u{01FAC2}\u{01FAC3}-\u{01FACF}\u{01FAD0}-\u{01FAD6}\u{01FAD7}-\u{01FAFF}\u{01FC00}-\u{01FFFD}]/u;
    var WORD_BREAK_PROPERTY = [
        [/*start*/ 0x0, 0 /* Other */],
        [/*start*/ 0xA, 1 /* LF */],
        [/*start*/ 0xB, 2 /* Newline */],
        [/*start*/ 0xD, 3 /* CR */],
        [/*start*/ 0xE, 0 /* Other */],
        [/*start*/ 0x20, 4 /* WSegSpace */],
        [/*start*/ 0x21, 0 /* Other */],
        [/*start*/ 0x22, 5 /* Double_Quote */],
        [/*start*/ 0x23, 0 /* Other */],
        [/*start*/ 0x27, 6 /* Single_Quote */],
        [/*start*/ 0x28, 0 /* Other */],
        [/*start*/ 0x2C, 7 /* MidNum */],
        [/*start*/ 0x2D, 0 /* Other */],
        [/*start*/ 0x2E, 8 /* MidNumLet */],
        [/*start*/ 0x2F, 0 /* Other */],
        [/*start*/ 0x30, 9 /* Numeric */],
        [/*start*/ 0x3A, 10 /* MidLetter */],
        [/*start*/ 0x3B, 7 /* MidNum */],
        [/*start*/ 0x3C, 0 /* Other */],
        [/*start*/ 0x41, 11 /* ALetter */],
        [/*start*/ 0x5B, 0 /* Other */],
        [/*start*/ 0x5F, 12 /* ExtendNumLet */],
        [/*start*/ 0x60, 0 /* Other */],
        [/*start*/ 0x61, 11 /* ALetter */],
        [/*start*/ 0x7B, 0 /* Other */],
        [/*start*/ 0x85, 2 /* Newline */],
        [/*start*/ 0x86, 0 /* Other */],
        [/*start*/ 0xAA, 11 /* ALetter */],
        [/*start*/ 0xAB, 0 /* Other */],
        [/*start*/ 0xAD, 13 /* Format */],
        [/*start*/ 0xAE, 0 /* Other */],
        [/*start*/ 0xB5, 11 /* ALetter */],
        [/*start*/ 0xB6, 0 /* Other */],
        [/*start*/ 0xB7, 10 /* MidLetter */],
        [/*start*/ 0xB8, 0 /* Other */],
        [/*start*/ 0xBA, 11 /* ALetter */],
        [/*start*/ 0xBB, 0 /* Other */],
        [/*start*/ 0xC0, 11 /* ALetter */],
        [/*start*/ 0xD7, 0 /* Other */],
        [/*start*/ 0xD8, 11 /* ALetter */],
        [/*start*/ 0xF7, 0 /* Other */],
        [/*start*/ 0xF8, 11 /* ALetter */],
        [/*start*/ 0x2D8, 0 /* Other */],
        [/*start*/ 0x2DE, 11 /* ALetter */],
        [/*start*/ 0x300, 14 /* Extend */],
        [/*start*/ 0x370, 11 /* ALetter */],
        [/*start*/ 0x375, 0 /* Other */],
        [/*start*/ 0x376, 11 /* ALetter */],
        [/*start*/ 0x378, 0 /* Other */],
        [/*start*/ 0x37A, 11 /* ALetter */],
        [/*start*/ 0x37E, 7 /* MidNum */],
        [/*start*/ 0x37F, 11 /* ALetter */],
        [/*start*/ 0x380, 0 /* Other */],
        [/*start*/ 0x386, 11 /* ALetter */],
        [/*start*/ 0x387, 10 /* MidLetter */],
        [/*start*/ 0x388, 11 /* ALetter */],
        [/*start*/ 0x38B, 0 /* Other */],
        [/*start*/ 0x38C, 11 /* ALetter */],
        [/*start*/ 0x38D, 0 /* Other */],
        [/*start*/ 0x38E, 11 /* ALetter */],
        [/*start*/ 0x3A2, 0 /* Other */],
        [/*start*/ 0x3A3, 11 /* ALetter */],
        [/*start*/ 0x3F6, 0 /* Other */],
        [/*start*/ 0x3F7, 11 /* ALetter */],
        [/*start*/ 0x482, 0 /* Other */],
        [/*start*/ 0x483, 14 /* Extend */],
        [/*start*/ 0x48A, 11 /* ALetter */],
        [/*start*/ 0x530, 0 /* Other */],
        [/*start*/ 0x531, 11 /* ALetter */],
        [/*start*/ 0x557, 0 /* Other */],
        [/*start*/ 0x559, 11 /* ALetter */],
        [/*start*/ 0x55D, 0 /* Other */],
        [/*start*/ 0x55E, 11 /* ALetter */],
        [/*start*/ 0x55F, 10 /* MidLetter */],
        [/*start*/ 0x560, 11 /* ALetter */],
        [/*start*/ 0x589, 7 /* MidNum */],
        [/*start*/ 0x58A, 11 /* ALetter */],
        [/*start*/ 0x58B, 0 /* Other */],
        [/*start*/ 0x591, 14 /* Extend */],
        [/*start*/ 0x5BE, 0 /* Other */],
        [/*start*/ 0x5BF, 14 /* Extend */],
        [/*start*/ 0x5C0, 0 /* Other */],
        [/*start*/ 0x5C1, 14 /* Extend */],
        [/*start*/ 0x5C3, 0 /* Other */],
        [/*start*/ 0x5C4, 14 /* Extend */],
        [/*start*/ 0x5C6, 0 /* Other */],
        [/*start*/ 0x5C7, 14 /* Extend */],
        [/*start*/ 0x5C8, 0 /* Other */],
        [/*start*/ 0x5D0, 15 /* Hebrew_Letter */],
        [/*start*/ 0x5EB, 0 /* Other */],
        [/*start*/ 0x5EF, 15 /* Hebrew_Letter */],
        [/*start*/ 0x5F3, 11 /* ALetter */],
        [/*start*/ 0x5F4, 10 /* MidLetter */],
        [/*start*/ 0x5F5, 0 /* Other */],
        [/*start*/ 0x600, 13 /* Format */],
        [/*start*/ 0x606, 0 /* Other */],
        [/*start*/ 0x60C, 7 /* MidNum */],
        [/*start*/ 0x60E, 0 /* Other */],
        [/*start*/ 0x610, 14 /* Extend */],
        [/*start*/ 0x61B, 0 /* Other */],
        [/*start*/ 0x61C, 13 /* Format */],
        [/*start*/ 0x61D, 0 /* Other */],
        [/*start*/ 0x620, 11 /* ALetter */],
        [/*start*/ 0x64B, 14 /* Extend */],
        [/*start*/ 0x660, 9 /* Numeric */],
        [/*start*/ 0x66A, 0 /* Other */],
        [/*start*/ 0x66B, 9 /* Numeric */],
        [/*start*/ 0x66C, 7 /* MidNum */],
        [/*start*/ 0x66D, 0 /* Other */],
        [/*start*/ 0x66E, 11 /* ALetter */],
        [/*start*/ 0x670, 14 /* Extend */],
        [/*start*/ 0x671, 11 /* ALetter */],
        [/*start*/ 0x6D4, 0 /* Other */],
        [/*start*/ 0x6D5, 11 /* ALetter */],
        [/*start*/ 0x6D6, 14 /* Extend */],
        [/*start*/ 0x6DD, 13 /* Format */],
        [/*start*/ 0x6DE, 0 /* Other */],
        [/*start*/ 0x6DF, 14 /* Extend */],
        [/*start*/ 0x6E5, 11 /* ALetter */],
        [/*start*/ 0x6E7, 14 /* Extend */],
        [/*start*/ 0x6E9, 0 /* Other */],
        [/*start*/ 0x6EA, 14 /* Extend */],
        [/*start*/ 0x6EE, 11 /* ALetter */],
        [/*start*/ 0x6F0, 9 /* Numeric */],
        [/*start*/ 0x6FA, 11 /* ALetter */],
        [/*start*/ 0x6FD, 0 /* Other */],
        [/*start*/ 0x6FF, 11 /* ALetter */],
        [/*start*/ 0x700, 0 /* Other */],
        [/*start*/ 0x70F, 13 /* Format */],
        [/*start*/ 0x710, 11 /* ALetter */],
        [/*start*/ 0x711, 14 /* Extend */],
        [/*start*/ 0x712, 11 /* ALetter */],
        [/*start*/ 0x730, 14 /* Extend */],
        [/*start*/ 0x74B, 0 /* Other */],
        [/*start*/ 0x74D, 11 /* ALetter */],
        [/*start*/ 0x7A6, 14 /* Extend */],
        [/*start*/ 0x7B1, 11 /* ALetter */],
        [/*start*/ 0x7B2, 0 /* Other */],
        [/*start*/ 0x7C0, 9 /* Numeric */],
        [/*start*/ 0x7CA, 11 /* ALetter */],
        [/*start*/ 0x7EB, 14 /* Extend */],
        [/*start*/ 0x7F4, 11 /* ALetter */],
        [/*start*/ 0x7F6, 0 /* Other */],
        [/*start*/ 0x7F8, 7 /* MidNum */],
        [/*start*/ 0x7F9, 0 /* Other */],
        [/*start*/ 0x7FA, 11 /* ALetter */],
        [/*start*/ 0x7FB, 0 /* Other */],
        [/*start*/ 0x7FD, 14 /* Extend */],
        [/*start*/ 0x7FE, 0 /* Other */],
        [/*start*/ 0x800, 11 /* ALetter */],
        [/*start*/ 0x816, 14 /* Extend */],
        [/*start*/ 0x81A, 11 /* ALetter */],
        [/*start*/ 0x81B, 14 /* Extend */],
        [/*start*/ 0x824, 11 /* ALetter */],
        [/*start*/ 0x825, 14 /* Extend */],
        [/*start*/ 0x828, 11 /* ALetter */],
        [/*start*/ 0x829, 14 /* Extend */],
        [/*start*/ 0x82E, 0 /* Other */],
        [/*start*/ 0x840, 11 /* ALetter */],
        [/*start*/ 0x859, 14 /* Extend */],
        [/*start*/ 0x85C, 0 /* Other */],
        [/*start*/ 0x860, 11 /* ALetter */],
        [/*start*/ 0x86B, 0 /* Other */],
        [/*start*/ 0x8A0, 11 /* ALetter */],
        [/*start*/ 0x8B5, 0 /* Other */],
        [/*start*/ 0x8B6, 11 /* ALetter */],
        [/*start*/ 0x8C8, 0 /* Other */],
        [/*start*/ 0x8D3, 14 /* Extend */],
        [/*start*/ 0x8E2, 13 /* Format */],
        [/*start*/ 0x8E3, 14 /* Extend */],
        [/*start*/ 0x904, 11 /* ALetter */],
        [/*start*/ 0x93A, 14 /* Extend */],
        [/*start*/ 0x93D, 11 /* ALetter */],
        [/*start*/ 0x93E, 14 /* Extend */],
        [/*start*/ 0x950, 11 /* ALetter */],
        [/*start*/ 0x951, 14 /* Extend */],
        [/*start*/ 0x958, 11 /* ALetter */],
        [/*start*/ 0x962, 14 /* Extend */],
        [/*start*/ 0x964, 0 /* Other */],
        [/*start*/ 0x966, 9 /* Numeric */],
        [/*start*/ 0x970, 0 /* Other */],
        [/*start*/ 0x971, 11 /* ALetter */],
        [/*start*/ 0x981, 14 /* Extend */],
        [/*start*/ 0x984, 0 /* Other */],
        [/*start*/ 0x985, 11 /* ALetter */],
        [/*start*/ 0x98D, 0 /* Other */],
        [/*start*/ 0x98F, 11 /* ALetter */],
        [/*start*/ 0x991, 0 /* Other */],
        [/*start*/ 0x993, 11 /* ALetter */],
        [/*start*/ 0x9A9, 0 /* Other */],
        [/*start*/ 0x9AA, 11 /* ALetter */],
        [/*start*/ 0x9B1, 0 /* Other */],
        [/*start*/ 0x9B2, 11 /* ALetter */],
        [/*start*/ 0x9B3, 0 /* Other */],
        [/*start*/ 0x9B6, 11 /* ALetter */],
        [/*start*/ 0x9BA, 0 /* Other */],
        [/*start*/ 0x9BC, 14 /* Extend */],
        [/*start*/ 0x9BD, 11 /* ALetter */],
        [/*start*/ 0x9BE, 14 /* Extend */],
        [/*start*/ 0x9C5, 0 /* Other */],
        [/*start*/ 0x9C7, 14 /* Extend */],
        [/*start*/ 0x9C9, 0 /* Other */],
        [/*start*/ 0x9CB, 14 /* Extend */],
        [/*start*/ 0x9CE, 11 /* ALetter */],
        [/*start*/ 0x9CF, 0 /* Other */],
        [/*start*/ 0x9D7, 14 /* Extend */],
        [/*start*/ 0x9D8, 0 /* Other */],
        [/*start*/ 0x9DC, 11 /* ALetter */],
        [/*start*/ 0x9DE, 0 /* Other */],
        [/*start*/ 0x9DF, 11 /* ALetter */],
        [/*start*/ 0x9E2, 14 /* Extend */],
        [/*start*/ 0x9E4, 0 /* Other */],
        [/*start*/ 0x9E6, 9 /* Numeric */],
        [/*start*/ 0x9F0, 11 /* ALetter */],
        [/*start*/ 0x9F2, 0 /* Other */],
        [/*start*/ 0x9FC, 11 /* ALetter */],
        [/*start*/ 0x9FD, 0 /* Other */],
        [/*start*/ 0x9FE, 14 /* Extend */],
        [/*start*/ 0x9FF, 0 /* Other */],
        [/*start*/ 0xA01, 14 /* Extend */],
        [/*start*/ 0xA04, 0 /* Other */],
        [/*start*/ 0xA05, 11 /* ALetter */],
        [/*start*/ 0xA0B, 0 /* Other */],
        [/*start*/ 0xA0F, 11 /* ALetter */],
        [/*start*/ 0xA11, 0 /* Other */],
        [/*start*/ 0xA13, 11 /* ALetter */],
        [/*start*/ 0xA29, 0 /* Other */],
        [/*start*/ 0xA2A, 11 /* ALetter */],
        [/*start*/ 0xA31, 0 /* Other */],
        [/*start*/ 0xA32, 11 /* ALetter */],
        [/*start*/ 0xA34, 0 /* Other */],
        [/*start*/ 0xA35, 11 /* ALetter */],
        [/*start*/ 0xA37, 0 /* Other */],
        [/*start*/ 0xA38, 11 /* ALetter */],
        [/*start*/ 0xA3A, 0 /* Other */],
        [/*start*/ 0xA3C, 14 /* Extend */],
        [/*start*/ 0xA3D, 0 /* Other */],
        [/*start*/ 0xA3E, 14 /* Extend */],
        [/*start*/ 0xA43, 0 /* Other */],
        [/*start*/ 0xA47, 14 /* Extend */],
        [/*start*/ 0xA49, 0 /* Other */],
        [/*start*/ 0xA4B, 14 /* Extend */],
        [/*start*/ 0xA4E, 0 /* Other */],
        [/*start*/ 0xA51, 14 /* Extend */],
        [/*start*/ 0xA52, 0 /* Other */],
        [/*start*/ 0xA59, 11 /* ALetter */],
        [/*start*/ 0xA5D, 0 /* Other */],
        [/*start*/ 0xA5E, 11 /* ALetter */],
        [/*start*/ 0xA5F, 0 /* Other */],
        [/*start*/ 0xA66, 9 /* Numeric */],
        [/*start*/ 0xA70, 14 /* Extend */],
        [/*start*/ 0xA72, 11 /* ALetter */],
        [/*start*/ 0xA75, 14 /* Extend */],
        [/*start*/ 0xA76, 0 /* Other */],
        [/*start*/ 0xA81, 14 /* Extend */],
        [/*start*/ 0xA84, 0 /* Other */],
        [/*start*/ 0xA85, 11 /* ALetter */],
        [/*start*/ 0xA8E, 0 /* Other */],
        [/*start*/ 0xA8F, 11 /* ALetter */],
        [/*start*/ 0xA92, 0 /* Other */],
        [/*start*/ 0xA93, 11 /* ALetter */],
        [/*start*/ 0xAA9, 0 /* Other */],
        [/*start*/ 0xAAA, 11 /* ALetter */],
        [/*start*/ 0xAB1, 0 /* Other */],
        [/*start*/ 0xAB2, 11 /* ALetter */],
        [/*start*/ 0xAB4, 0 /* Other */],
        [/*start*/ 0xAB5, 11 /* ALetter */],
        [/*start*/ 0xABA, 0 /* Other */],
        [/*start*/ 0xABC, 14 /* Extend */],
        [/*start*/ 0xABD, 11 /* ALetter */],
        [/*start*/ 0xABE, 14 /* Extend */],
        [/*start*/ 0xAC6, 0 /* Other */],
        [/*start*/ 0xAC7, 14 /* Extend */],
        [/*start*/ 0xACA, 0 /* Other */],
        [/*start*/ 0xACB, 14 /* Extend */],
        [/*start*/ 0xACE, 0 /* Other */],
        [/*start*/ 0xAD0, 11 /* ALetter */],
        [/*start*/ 0xAD1, 0 /* Other */],
        [/*start*/ 0xAE0, 11 /* ALetter */],
        [/*start*/ 0xAE2, 14 /* Extend */],
        [/*start*/ 0xAE4, 0 /* Other */],
        [/*start*/ 0xAE6, 9 /* Numeric */],
        [/*start*/ 0xAF0, 0 /* Other */],
        [/*start*/ 0xAF9, 11 /* ALetter */],
        [/*start*/ 0xAFA, 14 /* Extend */],
        [/*start*/ 0xB00, 0 /* Other */],
        [/*start*/ 0xB01, 14 /* Extend */],
        [/*start*/ 0xB04, 0 /* Other */],
        [/*start*/ 0xB05, 11 /* ALetter */],
        [/*start*/ 0xB0D, 0 /* Other */],
        [/*start*/ 0xB0F, 11 /* ALetter */],
        [/*start*/ 0xB11, 0 /* Other */],
        [/*start*/ 0xB13, 11 /* ALetter */],
        [/*start*/ 0xB29, 0 /* Other */],
        [/*start*/ 0xB2A, 11 /* ALetter */],
        [/*start*/ 0xB31, 0 /* Other */],
        [/*start*/ 0xB32, 11 /* ALetter */],
        [/*start*/ 0xB34, 0 /* Other */],
        [/*start*/ 0xB35, 11 /* ALetter */],
        [/*start*/ 0xB3A, 0 /* Other */],
        [/*start*/ 0xB3C, 14 /* Extend */],
        [/*start*/ 0xB3D, 11 /* ALetter */],
        [/*start*/ 0xB3E, 14 /* Extend */],
        [/*start*/ 0xB45, 0 /* Other */],
        [/*start*/ 0xB47, 14 /* Extend */],
        [/*start*/ 0xB49, 0 /* Other */],
        [/*start*/ 0xB4B, 14 /* Extend */],
        [/*start*/ 0xB4E, 0 /* Other */],
        [/*start*/ 0xB55, 14 /* Extend */],
        [/*start*/ 0xB58, 0 /* Other */],
        [/*start*/ 0xB5C, 11 /* ALetter */],
        [/*start*/ 0xB5E, 0 /* Other */],
        [/*start*/ 0xB5F, 11 /* ALetter */],
        [/*start*/ 0xB62, 14 /* Extend */],
        [/*start*/ 0xB64, 0 /* Other */],
        [/*start*/ 0xB66, 9 /* Numeric */],
        [/*start*/ 0xB70, 0 /* Other */],
        [/*start*/ 0xB71, 11 /* ALetter */],
        [/*start*/ 0xB72, 0 /* Other */],
        [/*start*/ 0xB82, 14 /* Extend */],
        [/*start*/ 0xB83, 11 /* ALetter */],
        [/*start*/ 0xB84, 0 /* Other */],
        [/*start*/ 0xB85, 11 /* ALetter */],
        [/*start*/ 0xB8B, 0 /* Other */],
        [/*start*/ 0xB8E, 11 /* ALetter */],
        [/*start*/ 0xB91, 0 /* Other */],
        [/*start*/ 0xB92, 11 /* ALetter */],
        [/*start*/ 0xB96, 0 /* Other */],
        [/*start*/ 0xB99, 11 /* ALetter */],
        [/*start*/ 0xB9B, 0 /* Other */],
        [/*start*/ 0xB9C, 11 /* ALetter */],
        [/*start*/ 0xB9D, 0 /* Other */],
        [/*start*/ 0xB9E, 11 /* ALetter */],
        [/*start*/ 0xBA0, 0 /* Other */],
        [/*start*/ 0xBA3, 11 /* ALetter */],
        [/*start*/ 0xBA5, 0 /* Other */],
        [/*start*/ 0xBA8, 11 /* ALetter */],
        [/*start*/ 0xBAB, 0 /* Other */],
        [/*start*/ 0xBAE, 11 /* ALetter */],
        [/*start*/ 0xBBA, 0 /* Other */],
        [/*start*/ 0xBBE, 14 /* Extend */],
        [/*start*/ 0xBC3, 0 /* Other */],
        [/*start*/ 0xBC6, 14 /* Extend */],
        [/*start*/ 0xBC9, 0 /* Other */],
        [/*start*/ 0xBCA, 14 /* Extend */],
        [/*start*/ 0xBCE, 0 /* Other */],
        [/*start*/ 0xBD0, 11 /* ALetter */],
        [/*start*/ 0xBD1, 0 /* Other */],
        [/*start*/ 0xBD7, 14 /* Extend */],
        [/*start*/ 0xBD8, 0 /* Other */],
        [/*start*/ 0xBE6, 9 /* Numeric */],
        [/*start*/ 0xBF0, 0 /* Other */],
        [/*start*/ 0xC00, 14 /* Extend */],
        [/*start*/ 0xC05, 11 /* ALetter */],
        [/*start*/ 0xC0D, 0 /* Other */],
        [/*start*/ 0xC0E, 11 /* ALetter */],
        [/*start*/ 0xC11, 0 /* Other */],
        [/*start*/ 0xC12, 11 /* ALetter */],
        [/*start*/ 0xC29, 0 /* Other */],
        [/*start*/ 0xC2A, 11 /* ALetter */],
        [/*start*/ 0xC3A, 0 /* Other */],
        [/*start*/ 0xC3D, 11 /* ALetter */],
        [/*start*/ 0xC3E, 14 /* Extend */],
        [/*start*/ 0xC45, 0 /* Other */],
        [/*start*/ 0xC46, 14 /* Extend */],
        [/*start*/ 0xC49, 0 /* Other */],
        [/*start*/ 0xC4A, 14 /* Extend */],
        [/*start*/ 0xC4E, 0 /* Other */],
        [/*start*/ 0xC55, 14 /* Extend */],
        [/*start*/ 0xC57, 0 /* Other */],
        [/*start*/ 0xC58, 11 /* ALetter */],
        [/*start*/ 0xC5B, 0 /* Other */],
        [/*start*/ 0xC60, 11 /* ALetter */],
        [/*start*/ 0xC62, 14 /* Extend */],
        [/*start*/ 0xC64, 0 /* Other */],
        [/*start*/ 0xC66, 9 /* Numeric */],
        [/*start*/ 0xC70, 0 /* Other */],
        [/*start*/ 0xC80, 11 /* ALetter */],
        [/*start*/ 0xC81, 14 /* Extend */],
        [/*start*/ 0xC84, 0 /* Other */],
        [/*start*/ 0xC85, 11 /* ALetter */],
        [/*start*/ 0xC8D, 0 /* Other */],
        [/*start*/ 0xC8E, 11 /* ALetter */],
        [/*start*/ 0xC91, 0 /* Other */],
        [/*start*/ 0xC92, 11 /* ALetter */],
        [/*start*/ 0xCA9, 0 /* Other */],
        [/*start*/ 0xCAA, 11 /* ALetter */],
        [/*start*/ 0xCB4, 0 /* Other */],
        [/*start*/ 0xCB5, 11 /* ALetter */],
        [/*start*/ 0xCBA, 0 /* Other */],
        [/*start*/ 0xCBC, 14 /* Extend */],
        [/*start*/ 0xCBD, 11 /* ALetter */],
        [/*start*/ 0xCBE, 14 /* Extend */],
        [/*start*/ 0xCC5, 0 /* Other */],
        [/*start*/ 0xCC6, 14 /* Extend */],
        [/*start*/ 0xCC9, 0 /* Other */],
        [/*start*/ 0xCCA, 14 /* Extend */],
        [/*start*/ 0xCCE, 0 /* Other */],
        [/*start*/ 0xCD5, 14 /* Extend */],
        [/*start*/ 0xCD7, 0 /* Other */],
        [/*start*/ 0xCDE, 11 /* ALetter */],
        [/*start*/ 0xCDF, 0 /* Other */],
        [/*start*/ 0xCE0, 11 /* ALetter */],
        [/*start*/ 0xCE2, 14 /* Extend */],
        [/*start*/ 0xCE4, 0 /* Other */],
        [/*start*/ 0xCE6, 9 /* Numeric */],
        [/*start*/ 0xCF0, 0 /* Other */],
        [/*start*/ 0xCF1, 11 /* ALetter */],
        [/*start*/ 0xCF3, 0 /* Other */],
        [/*start*/ 0xD00, 14 /* Extend */],
        [/*start*/ 0xD04, 11 /* ALetter */],
        [/*start*/ 0xD0D, 0 /* Other */],
        [/*start*/ 0xD0E, 11 /* ALetter */],
        [/*start*/ 0xD11, 0 /* Other */],
        [/*start*/ 0xD12, 11 /* ALetter */],
        [/*start*/ 0xD3B, 14 /* Extend */],
        [/*start*/ 0xD3D, 11 /* ALetter */],
        [/*start*/ 0xD3E, 14 /* Extend */],
        [/*start*/ 0xD45, 0 /* Other */],
        [/*start*/ 0xD46, 14 /* Extend */],
        [/*start*/ 0xD49, 0 /* Other */],
        [/*start*/ 0xD4A, 14 /* Extend */],
        [/*start*/ 0xD4E, 11 /* ALetter */],
        [/*start*/ 0xD4F, 0 /* Other */],
        [/*start*/ 0xD54, 11 /* ALetter */],
        [/*start*/ 0xD57, 14 /* Extend */],
        [/*start*/ 0xD58, 0 /* Other */],
        [/*start*/ 0xD5F, 11 /* ALetter */],
        [/*start*/ 0xD62, 14 /* Extend */],
        [/*start*/ 0xD64, 0 /* Other */],
        [/*start*/ 0xD66, 9 /* Numeric */],
        [/*start*/ 0xD70, 0 /* Other */],
        [/*start*/ 0xD7A, 11 /* ALetter */],
        [/*start*/ 0xD80, 0 /* Other */],
        [/*start*/ 0xD81, 14 /* Extend */],
        [/*start*/ 0xD84, 0 /* Other */],
        [/*start*/ 0xD85, 11 /* ALetter */],
        [/*start*/ 0xD97, 0 /* Other */],
        [/*start*/ 0xD9A, 11 /* ALetter */],
        [/*start*/ 0xDB2, 0 /* Other */],
        [/*start*/ 0xDB3, 11 /* ALetter */],
        [/*start*/ 0xDBC, 0 /* Other */],
        [/*start*/ 0xDBD, 11 /* ALetter */],
        [/*start*/ 0xDBE, 0 /* Other */],
        [/*start*/ 0xDC0, 11 /* ALetter */],
        [/*start*/ 0xDC7, 0 /* Other */],
        [/*start*/ 0xDCA, 14 /* Extend */],
        [/*start*/ 0xDCB, 0 /* Other */],
        [/*start*/ 0xDCF, 14 /* Extend */],
        [/*start*/ 0xDD5, 0 /* Other */],
        [/*start*/ 0xDD6, 14 /* Extend */],
        [/*start*/ 0xDD7, 0 /* Other */],
        [/*start*/ 0xDD8, 14 /* Extend */],
        [/*start*/ 0xDE0, 0 /* Other */],
        [/*start*/ 0xDE6, 9 /* Numeric */],
        [/*start*/ 0xDF0, 0 /* Other */],
        [/*start*/ 0xDF2, 14 /* Extend */],
        [/*start*/ 0xDF4, 0 /* Other */],
        [/*start*/ 0xE31, 14 /* Extend */],
        [/*start*/ 0xE32, 0 /* Other */],
        [/*start*/ 0xE34, 14 /* Extend */],
        [/*start*/ 0xE3B, 0 /* Other */],
        [/*start*/ 0xE47, 14 /* Extend */],
        [/*start*/ 0xE4F, 0 /* Other */],
        [/*start*/ 0xE50, 9 /* Numeric */],
        [/*start*/ 0xE5A, 0 /* Other */],
        [/*start*/ 0xEB1, 14 /* Extend */],
        [/*start*/ 0xEB2, 0 /* Other */],
        [/*start*/ 0xEB4, 14 /* Extend */],
        [/*start*/ 0xEBD, 0 /* Other */],
        [/*start*/ 0xEC8, 14 /* Extend */],
        [/*start*/ 0xECE, 0 /* Other */],
        [/*start*/ 0xED0, 9 /* Numeric */],
        [/*start*/ 0xEDA, 0 /* Other */],
        [/*start*/ 0xF00, 11 /* ALetter */],
        [/*start*/ 0xF01, 0 /* Other */],
        [/*start*/ 0xF18, 14 /* Extend */],
        [/*start*/ 0xF1A, 0 /* Other */],
        [/*start*/ 0xF20, 9 /* Numeric */],
        [/*start*/ 0xF2A, 0 /* Other */],
        [/*start*/ 0xF35, 14 /* Extend */],
        [/*start*/ 0xF36, 0 /* Other */],
        [/*start*/ 0xF37, 14 /* Extend */],
        [/*start*/ 0xF38, 0 /* Other */],
        [/*start*/ 0xF39, 14 /* Extend */],
        [/*start*/ 0xF3A, 0 /* Other */],
        [/*start*/ 0xF3E, 14 /* Extend */],
        [/*start*/ 0xF40, 11 /* ALetter */],
        [/*start*/ 0xF48, 0 /* Other */],
        [/*start*/ 0xF49, 11 /* ALetter */],
        [/*start*/ 0xF6D, 0 /* Other */],
        [/*start*/ 0xF71, 14 /* Extend */],
        [/*start*/ 0xF85, 0 /* Other */],
        [/*start*/ 0xF86, 14 /* Extend */],
        [/*start*/ 0xF88, 11 /* ALetter */],
        [/*start*/ 0xF8D, 14 /* Extend */],
        [/*start*/ 0xF98, 0 /* Other */],
        [/*start*/ 0xF99, 14 /* Extend */],
        [/*start*/ 0xFBD, 0 /* Other */],
        [/*start*/ 0xFC6, 14 /* Extend */],
        [/*start*/ 0xFC7, 0 /* Other */],
        [/*start*/ 0x102B, 14 /* Extend */],
        [/*start*/ 0x103F, 0 /* Other */],
        [/*start*/ 0x1040, 9 /* Numeric */],
        [/*start*/ 0x104A, 0 /* Other */],
        [/*start*/ 0x1056, 14 /* Extend */],
        [/*start*/ 0x105A, 0 /* Other */],
        [/*start*/ 0x105E, 14 /* Extend */],
        [/*start*/ 0x1061, 0 /* Other */],
        [/*start*/ 0x1062, 14 /* Extend */],
        [/*start*/ 0x1065, 0 /* Other */],
        [/*start*/ 0x1067, 14 /* Extend */],
        [/*start*/ 0x106E, 0 /* Other */],
        [/*start*/ 0x1071, 14 /* Extend */],
        [/*start*/ 0x1075, 0 /* Other */],
        [/*start*/ 0x1082, 14 /* Extend */],
        [/*start*/ 0x108E, 0 /* Other */],
        [/*start*/ 0x108F, 14 /* Extend */],
        [/*start*/ 0x1090, 9 /* Numeric */],
        [/*start*/ 0x109A, 14 /* Extend */],
        [/*start*/ 0x109E, 0 /* Other */],
        [/*start*/ 0x10A0, 11 /* ALetter */],
        [/*start*/ 0x10C6, 0 /* Other */],
        [/*start*/ 0x10C7, 11 /* ALetter */],
        [/*start*/ 0x10C8, 0 /* Other */],
        [/*start*/ 0x10CD, 11 /* ALetter */],
        [/*start*/ 0x10CE, 0 /* Other */],
        [/*start*/ 0x10D0, 11 /* ALetter */],
        [/*start*/ 0x10FB, 0 /* Other */],
        [/*start*/ 0x10FC, 11 /* ALetter */],
        [/*start*/ 0x1249, 0 /* Other */],
        [/*start*/ 0x124A, 11 /* ALetter */],
        [/*start*/ 0x124E, 0 /* Other */],
        [/*start*/ 0x1250, 11 /* ALetter */],
        [/*start*/ 0x1257, 0 /* Other */],
        [/*start*/ 0x1258, 11 /* ALetter */],
        [/*start*/ 0x1259, 0 /* Other */],
        [/*start*/ 0x125A, 11 /* ALetter */],
        [/*start*/ 0x125E, 0 /* Other */],
        [/*start*/ 0x1260, 11 /* ALetter */],
        [/*start*/ 0x1289, 0 /* Other */],
        [/*start*/ 0x128A, 11 /* ALetter */],
        [/*start*/ 0x128E, 0 /* Other */],
        [/*start*/ 0x1290, 11 /* ALetter */],
        [/*start*/ 0x12B1, 0 /* Other */],
        [/*start*/ 0x12B2, 11 /* ALetter */],
        [/*start*/ 0x12B6, 0 /* Other */],
        [/*start*/ 0x12B8, 11 /* ALetter */],
        [/*start*/ 0x12BF, 0 /* Other */],
        [/*start*/ 0x12C0, 11 /* ALetter */],
        [/*start*/ 0x12C1, 0 /* Other */],
        [/*start*/ 0x12C2, 11 /* ALetter */],
        [/*start*/ 0x12C6, 0 /* Other */],
        [/*start*/ 0x12C8, 11 /* ALetter */],
        [/*start*/ 0x12D7, 0 /* Other */],
        [/*start*/ 0x12D8, 11 /* ALetter */],
        [/*start*/ 0x1311, 0 /* Other */],
        [/*start*/ 0x1312, 11 /* ALetter */],
        [/*start*/ 0x1316, 0 /* Other */],
        [/*start*/ 0x1318, 11 /* ALetter */],
        [/*start*/ 0x135B, 0 /* Other */],
        [/*start*/ 0x135D, 14 /* Extend */],
        [/*start*/ 0x1360, 0 /* Other */],
        [/*start*/ 0x1380, 11 /* ALetter */],
        [/*start*/ 0x1390, 0 /* Other */],
        [/*start*/ 0x13A0, 11 /* ALetter */],
        [/*start*/ 0x13F6, 0 /* Other */],
        [/*start*/ 0x13F8, 11 /* ALetter */],
        [/*start*/ 0x13FE, 0 /* Other */],
        [/*start*/ 0x1401, 11 /* ALetter */],
        [/*start*/ 0x166D, 0 /* Other */],
        [/*start*/ 0x166F, 11 /* ALetter */],
        [/*start*/ 0x1680, 4 /* WSegSpace */],
        [/*start*/ 0x1681, 11 /* ALetter */],
        [/*start*/ 0x169B, 0 /* Other */],
        [/*start*/ 0x16A0, 11 /* ALetter */],
        [/*start*/ 0x16EB, 0 /* Other */],
        [/*start*/ 0x16EE, 11 /* ALetter */],
        [/*start*/ 0x16F9, 0 /* Other */],
        [/*start*/ 0x1700, 11 /* ALetter */],
        [/*start*/ 0x170D, 0 /* Other */],
        [/*start*/ 0x170E, 11 /* ALetter */],
        [/*start*/ 0x1712, 14 /* Extend */],
        [/*start*/ 0x1715, 0 /* Other */],
        [/*start*/ 0x1720, 11 /* ALetter */],
        [/*start*/ 0x1732, 14 /* Extend */],
        [/*start*/ 0x1735, 0 /* Other */],
        [/*start*/ 0x1740, 11 /* ALetter */],
        [/*start*/ 0x1752, 14 /* Extend */],
        [/*start*/ 0x1754, 0 /* Other */],
        [/*start*/ 0x1760, 11 /* ALetter */],
        [/*start*/ 0x176D, 0 /* Other */],
        [/*start*/ 0x176E, 11 /* ALetter */],
        [/*start*/ 0x1771, 0 /* Other */],
        [/*start*/ 0x1772, 14 /* Extend */],
        [/*start*/ 0x1774, 0 /* Other */],
        [/*start*/ 0x17B4, 14 /* Extend */],
        [/*start*/ 0x17D4, 0 /* Other */],
        [/*start*/ 0x17DD, 14 /* Extend */],
        [/*start*/ 0x17DE, 0 /* Other */],
        [/*start*/ 0x17E0, 9 /* Numeric */],
        [/*start*/ 0x17EA, 0 /* Other */],
        [/*start*/ 0x180B, 14 /* Extend */],
        [/*start*/ 0x180E, 13 /* Format */],
        [/*start*/ 0x180F, 0 /* Other */],
        [/*start*/ 0x1810, 9 /* Numeric */],
        [/*start*/ 0x181A, 0 /* Other */],
        [/*start*/ 0x1820, 11 /* ALetter */],
        [/*start*/ 0x1879, 0 /* Other */],
        [/*start*/ 0x1880, 11 /* ALetter */],
        [/*start*/ 0x1885, 14 /* Extend */],
        [/*start*/ 0x1887, 11 /* ALetter */],
        [/*start*/ 0x18A9, 14 /* Extend */],
        [/*start*/ 0x18AA, 11 /* ALetter */],
        [/*start*/ 0x18AB, 0 /* Other */],
        [/*start*/ 0x18B0, 11 /* ALetter */],
        [/*start*/ 0x18F6, 0 /* Other */],
        [/*start*/ 0x1900, 11 /* ALetter */],
        [/*start*/ 0x191F, 0 /* Other */],
        [/*start*/ 0x1920, 14 /* Extend */],
        [/*start*/ 0x192C, 0 /* Other */],
        [/*start*/ 0x1930, 14 /* Extend */],
        [/*start*/ 0x193C, 0 /* Other */],
        [/*start*/ 0x1946, 9 /* Numeric */],
        [/*start*/ 0x1950, 0 /* Other */],
        [/*start*/ 0x19D0, 9 /* Numeric */],
        [/*start*/ 0x19DA, 0 /* Other */],
        [/*start*/ 0x1A00, 11 /* ALetter */],
        [/*start*/ 0x1A17, 14 /* Extend */],
        [/*start*/ 0x1A1C, 0 /* Other */],
        [/*start*/ 0x1A55, 14 /* Extend */],
        [/*start*/ 0x1A5F, 0 /* Other */],
        [/*start*/ 0x1A60, 14 /* Extend */],
        [/*start*/ 0x1A7D, 0 /* Other */],
        [/*start*/ 0x1A7F, 14 /* Extend */],
        [/*start*/ 0x1A80, 9 /* Numeric */],
        [/*start*/ 0x1A8A, 0 /* Other */],
        [/*start*/ 0x1A90, 9 /* Numeric */],
        [/*start*/ 0x1A9A, 0 /* Other */],
        [/*start*/ 0x1AB0, 14 /* Extend */],
        [/*start*/ 0x1AC1, 0 /* Other */],
        [/*start*/ 0x1B00, 14 /* Extend */],
        [/*start*/ 0x1B05, 11 /* ALetter */],
        [/*start*/ 0x1B34, 14 /* Extend */],
        [/*start*/ 0x1B45, 11 /* ALetter */],
        [/*start*/ 0x1B4C, 0 /* Other */],
        [/*start*/ 0x1B50, 9 /* Numeric */],
        [/*start*/ 0x1B5A, 0 /* Other */],
        [/*start*/ 0x1B6B, 14 /* Extend */],
        [/*start*/ 0x1B74, 0 /* Other */],
        [/*start*/ 0x1B80, 14 /* Extend */],
        [/*start*/ 0x1B83, 11 /* ALetter */],
        [/*start*/ 0x1BA1, 14 /* Extend */],
        [/*start*/ 0x1BAE, 11 /* ALetter */],
        [/*start*/ 0x1BB0, 9 /* Numeric */],
        [/*start*/ 0x1BBA, 11 /* ALetter */],
        [/*start*/ 0x1BE6, 14 /* Extend */],
        [/*start*/ 0x1BF4, 0 /* Other */],
        [/*start*/ 0x1C00, 11 /* ALetter */],
        [/*start*/ 0x1C24, 14 /* Extend */],
        [/*start*/ 0x1C38, 0 /* Other */],
        [/*start*/ 0x1C40, 9 /* Numeric */],
        [/*start*/ 0x1C4A, 0 /* Other */],
        [/*start*/ 0x1C4D, 11 /* ALetter */],
        [/*start*/ 0x1C50, 9 /* Numeric */],
        [/*start*/ 0x1C5A, 11 /* ALetter */],
        [/*start*/ 0x1C7E, 0 /* Other */],
        [/*start*/ 0x1C80, 11 /* ALetter */],
        [/*start*/ 0x1C89, 0 /* Other */],
        [/*start*/ 0x1C90, 11 /* ALetter */],
        [/*start*/ 0x1CBB, 0 /* Other */],
        [/*start*/ 0x1CBD, 11 /* ALetter */],
        [/*start*/ 0x1CC0, 0 /* Other */],
        [/*start*/ 0x1CD0, 14 /* Extend */],
        [/*start*/ 0x1CD3, 0 /* Other */],
        [/*start*/ 0x1CD4, 14 /* Extend */],
        [/*start*/ 0x1CE9, 11 /* ALetter */],
        [/*start*/ 0x1CED, 14 /* Extend */],
        [/*start*/ 0x1CEE, 11 /* ALetter */],
        [/*start*/ 0x1CF4, 14 /* Extend */],
        [/*start*/ 0x1CF5, 11 /* ALetter */],
        [/*start*/ 0x1CF7, 14 /* Extend */],
        [/*start*/ 0x1CFA, 11 /* ALetter */],
        [/*start*/ 0x1CFB, 0 /* Other */],
        [/*start*/ 0x1D00, 11 /* ALetter */],
        [/*start*/ 0x1DC0, 14 /* Extend */],
        [/*start*/ 0x1DFA, 0 /* Other */],
        [/*start*/ 0x1DFB, 14 /* Extend */],
        [/*start*/ 0x1E00, 11 /* ALetter */],
        [/*start*/ 0x1F16, 0 /* Other */],
        [/*start*/ 0x1F18, 11 /* ALetter */],
        [/*start*/ 0x1F1E, 0 /* Other */],
        [/*start*/ 0x1F20, 11 /* ALetter */],
        [/*start*/ 0x1F46, 0 /* Other */],
        [/*start*/ 0x1F48, 11 /* ALetter */],
        [/*start*/ 0x1F4E, 0 /* Other */],
        [/*start*/ 0x1F50, 11 /* ALetter */],
        [/*start*/ 0x1F58, 0 /* Other */],
        [/*start*/ 0x1F59, 11 /* ALetter */],
        [/*start*/ 0x1F5A, 0 /* Other */],
        [/*start*/ 0x1F5B, 11 /* ALetter */],
        [/*start*/ 0x1F5C, 0 /* Other */],
        [/*start*/ 0x1F5D, 11 /* ALetter */],
        [/*start*/ 0x1F5E, 0 /* Other */],
        [/*start*/ 0x1F5F, 11 /* ALetter */],
        [/*start*/ 0x1F7E, 0 /* Other */],
        [/*start*/ 0x1F80, 11 /* ALetter */],
        [/*start*/ 0x1FB5, 0 /* Other */],
        [/*start*/ 0x1FB6, 11 /* ALetter */],
        [/*start*/ 0x1FBD, 0 /* Other */],
        [/*start*/ 0x1FBE, 11 /* ALetter */],
        [/*start*/ 0x1FBF, 0 /* Other */],
        [/*start*/ 0x1FC2, 11 /* ALetter */],
        [/*start*/ 0x1FC5, 0 /* Other */],
        [/*start*/ 0x1FC6, 11 /* ALetter */],
        [/*start*/ 0x1FCD, 0 /* Other */],
        [/*start*/ 0x1FD0, 11 /* ALetter */],
        [/*start*/ 0x1FD4, 0 /* Other */],
        [/*start*/ 0x1FD6, 11 /* ALetter */],
        [/*start*/ 0x1FDC, 0 /* Other */],
        [/*start*/ 0x1FE0, 11 /* ALetter */],
        [/*start*/ 0x1FED, 0 /* Other */],
        [/*start*/ 0x1FF2, 11 /* ALetter */],
        [/*start*/ 0x1FF5, 0 /* Other */],
        [/*start*/ 0x1FF6, 11 /* ALetter */],
        [/*start*/ 0x1FFD, 0 /* Other */],
        [/*start*/ 0x2000, 4 /* WSegSpace */],
        [/*start*/ 0x2007, 0 /* Other */],
        [/*start*/ 0x2008, 4 /* WSegSpace */],
        [/*start*/ 0x200B, 0 /* Other */],
        [/*start*/ 0x200C, 14 /* Extend */],
        [/*start*/ 0x200D, 16 /* ZWJ */],
        [/*start*/ 0x200E, 13 /* Format */],
        [/*start*/ 0x2010, 0 /* Other */],
        [/*start*/ 0x2018, 8 /* MidNumLet */],
        [/*start*/ 0x201A, 0 /* Other */],
        [/*start*/ 0x2024, 8 /* MidNumLet */],
        [/*start*/ 0x2025, 0 /* Other */],
        [/*start*/ 0x2027, 10 /* MidLetter */],
        [/*start*/ 0x2028, 2 /* Newline */],
        [/*start*/ 0x202A, 13 /* Format */],
        [/*start*/ 0x202F, 12 /* ExtendNumLet */],
        [/*start*/ 0x2030, 0 /* Other */],
        [/*start*/ 0x203F, 12 /* ExtendNumLet */],
        [/*start*/ 0x2041, 0 /* Other */],
        [/*start*/ 0x2044, 7 /* MidNum */],
        [/*start*/ 0x2045, 0 /* Other */],
        [/*start*/ 0x2054, 12 /* ExtendNumLet */],
        [/*start*/ 0x2055, 0 /* Other */],
        [/*start*/ 0x205F, 4 /* WSegSpace */],
        [/*start*/ 0x2060, 13 /* Format */],
        [/*start*/ 0x2065, 0 /* Other */],
        [/*start*/ 0x2066, 13 /* Format */],
        [/*start*/ 0x2070, 0 /* Other */],
        [/*start*/ 0x2071, 11 /* ALetter */],
        [/*start*/ 0x2072, 0 /* Other */],
        [/*start*/ 0x207F, 11 /* ALetter */],
        [/*start*/ 0x2080, 0 /* Other */],
        [/*start*/ 0x2090, 11 /* ALetter */],
        [/*start*/ 0x209D, 0 /* Other */],
        [/*start*/ 0x20D0, 14 /* Extend */],
        [/*start*/ 0x20F1, 0 /* Other */],
        [/*start*/ 0x2102, 11 /* ALetter */],
        [/*start*/ 0x2103, 0 /* Other */],
        [/*start*/ 0x2107, 11 /* ALetter */],
        [/*start*/ 0x2108, 0 /* Other */],
        [/*start*/ 0x210A, 11 /* ALetter */],
        [/*start*/ 0x2114, 0 /* Other */],
        [/*start*/ 0x2115, 11 /* ALetter */],
        [/*start*/ 0x2116, 0 /* Other */],
        [/*start*/ 0x2119, 11 /* ALetter */],
        [/*start*/ 0x211E, 0 /* Other */],
        [/*start*/ 0x2124, 11 /* ALetter */],
        [/*start*/ 0x2125, 0 /* Other */],
        [/*start*/ 0x2126, 11 /* ALetter */],
        [/*start*/ 0x2127, 0 /* Other */],
        [/*start*/ 0x2128, 11 /* ALetter */],
        [/*start*/ 0x2129, 0 /* Other */],
        [/*start*/ 0x212A, 11 /* ALetter */],
        [/*start*/ 0x212E, 0 /* Other */],
        [/*start*/ 0x212F, 11 /* ALetter */],
        [/*start*/ 0x213A, 0 /* Other */],
        [/*start*/ 0x213C, 11 /* ALetter */],
        [/*start*/ 0x2140, 0 /* Other */],
        [/*start*/ 0x2145, 11 /* ALetter */],
        [/*start*/ 0x214A, 0 /* Other */],
        [/*start*/ 0x214E, 11 /* ALetter */],
        [/*start*/ 0x214F, 0 /* Other */],
        [/*start*/ 0x2160, 11 /* ALetter */],
        [/*start*/ 0x2189, 0 /* Other */],
        [/*start*/ 0x24B6, 11 /* ALetter */],
        [/*start*/ 0x24EA, 0 /* Other */],
        [/*start*/ 0x2C00, 11 /* ALetter */],
        [/*start*/ 0x2C2F, 0 /* Other */],
        [/*start*/ 0x2C30, 11 /* ALetter */],
        [/*start*/ 0x2C5F, 0 /* Other */],
        [/*start*/ 0x2C60, 11 /* ALetter */],
        [/*start*/ 0x2CE5, 0 /* Other */],
        [/*start*/ 0x2CEB, 11 /* ALetter */],
        [/*start*/ 0x2CEF, 14 /* Extend */],
        [/*start*/ 0x2CF2, 11 /* ALetter */],
        [/*start*/ 0x2CF4, 0 /* Other */],
        [/*start*/ 0x2D00, 11 /* ALetter */],
        [/*start*/ 0x2D26, 0 /* Other */],
        [/*start*/ 0x2D27, 11 /* ALetter */],
        [/*start*/ 0x2D28, 0 /* Other */],
        [/*start*/ 0x2D2D, 11 /* ALetter */],
        [/*start*/ 0x2D2E, 0 /* Other */],
        [/*start*/ 0x2D30, 11 /* ALetter */],
        [/*start*/ 0x2D68, 0 /* Other */],
        [/*start*/ 0x2D6F, 11 /* ALetter */],
        [/*start*/ 0x2D70, 0 /* Other */],
        [/*start*/ 0x2D7F, 14 /* Extend */],
        [/*start*/ 0x2D80, 11 /* ALetter */],
        [/*start*/ 0x2D97, 0 /* Other */],
        [/*start*/ 0x2DA0, 11 /* ALetter */],
        [/*start*/ 0x2DA7, 0 /* Other */],
        [/*start*/ 0x2DA8, 11 /* ALetter */],
        [/*start*/ 0x2DAF, 0 /* Other */],
        [/*start*/ 0x2DB0, 11 /* ALetter */],
        [/*start*/ 0x2DB7, 0 /* Other */],
        [/*start*/ 0x2DB8, 11 /* ALetter */],
        [/*start*/ 0x2DBF, 0 /* Other */],
        [/*start*/ 0x2DC0, 11 /* ALetter */],
        [/*start*/ 0x2DC7, 0 /* Other */],
        [/*start*/ 0x2DC8, 11 /* ALetter */],
        [/*start*/ 0x2DCF, 0 /* Other */],
        [/*start*/ 0x2DD0, 11 /* ALetter */],
        [/*start*/ 0x2DD7, 0 /* Other */],
        [/*start*/ 0x2DD8, 11 /* ALetter */],
        [/*start*/ 0x2DDF, 0 /* Other */],
        [/*start*/ 0x2DE0, 14 /* Extend */],
        [/*start*/ 0x2E00, 0 /* Other */],
        [/*start*/ 0x2E2F, 11 /* ALetter */],
        [/*start*/ 0x2E30, 0 /* Other */],
        [/*start*/ 0x3000, 4 /* WSegSpace */],
        [/*start*/ 0x3001, 0 /* Other */],
        [/*start*/ 0x3005, 11 /* ALetter */],
        [/*start*/ 0x3006, 0 /* Other */],
        [/*start*/ 0x302A, 14 /* Extend */],
        [/*start*/ 0x3030, 0 /* Other */],
        [/*start*/ 0x3031, 17 /* Katakana */],
        [/*start*/ 0x3036, 0 /* Other */],
        [/*start*/ 0x303B, 11 /* ALetter */],
        [/*start*/ 0x303D, 0 /* Other */],
        [/*start*/ 0x3099, 14 /* Extend */],
        [/*start*/ 0x309B, 17 /* Katakana */],
        [/*start*/ 0x309D, 0 /* Other */],
        [/*start*/ 0x30A0, 17 /* Katakana */],
        [/*start*/ 0x30FB, 0 /* Other */],
        [/*start*/ 0x30FC, 17 /* Katakana */],
        [/*start*/ 0x3100, 0 /* Other */],
        [/*start*/ 0x3105, 11 /* ALetter */],
        [/*start*/ 0x3130, 0 /* Other */],
        [/*start*/ 0x3131, 11 /* ALetter */],
        [/*start*/ 0x318F, 0 /* Other */],
        [/*start*/ 0x31A0, 11 /* ALetter */],
        [/*start*/ 0x31C0, 0 /* Other */],
        [/*start*/ 0x31F0, 17 /* Katakana */],
        [/*start*/ 0x3200, 0 /* Other */],
        [/*start*/ 0x32D0, 17 /* Katakana */],
        [/*start*/ 0x32FF, 0 /* Other */],
        [/*start*/ 0x3300, 17 /* Katakana */],
        [/*start*/ 0x3358, 0 /* Other */],
        [/*start*/ 0xA000, 11 /* ALetter */],
        [/*start*/ 0xA48D, 0 /* Other */],
        [/*start*/ 0xA4D0, 11 /* ALetter */],
        [/*start*/ 0xA4FE, 0 /* Other */],
        [/*start*/ 0xA500, 11 /* ALetter */],
        [/*start*/ 0xA60D, 0 /* Other */],
        [/*start*/ 0xA610, 11 /* ALetter */],
        [/*start*/ 0xA620, 9 /* Numeric */],
        [/*start*/ 0xA62A, 11 /* ALetter */],
        [/*start*/ 0xA62C, 0 /* Other */],
        [/*start*/ 0xA640, 11 /* ALetter */],
        [/*start*/ 0xA66F, 14 /* Extend */],
        [/*start*/ 0xA673, 0 /* Other */],
        [/*start*/ 0xA674, 14 /* Extend */],
        [/*start*/ 0xA67E, 0 /* Other */],
        [/*start*/ 0xA67F, 11 /* ALetter */],
        [/*start*/ 0xA69E, 14 /* Extend */],
        [/*start*/ 0xA6A0, 11 /* ALetter */],
        [/*start*/ 0xA6F0, 14 /* Extend */],
        [/*start*/ 0xA6F2, 0 /* Other */],
        [/*start*/ 0xA708, 11 /* ALetter */],
        [/*start*/ 0xA7C0, 0 /* Other */],
        [/*start*/ 0xA7C2, 11 /* ALetter */],
        [/*start*/ 0xA7CB, 0 /* Other */],
        [/*start*/ 0xA7F5, 11 /* ALetter */],
        [/*start*/ 0xA802, 14 /* Extend */],
        [/*start*/ 0xA803, 11 /* ALetter */],
        [/*start*/ 0xA806, 14 /* Extend */],
        [/*start*/ 0xA807, 11 /* ALetter */],
        [/*start*/ 0xA80B, 14 /* Extend */],
        [/*start*/ 0xA80C, 11 /* ALetter */],
        [/*start*/ 0xA823, 14 /* Extend */],
        [/*start*/ 0xA828, 0 /* Other */],
        [/*start*/ 0xA82C, 14 /* Extend */],
        [/*start*/ 0xA82D, 0 /* Other */],
        [/*start*/ 0xA840, 11 /* ALetter */],
        [/*start*/ 0xA874, 0 /* Other */],
        [/*start*/ 0xA880, 14 /* Extend */],
        [/*start*/ 0xA882, 11 /* ALetter */],
        [/*start*/ 0xA8B4, 14 /* Extend */],
        [/*start*/ 0xA8C6, 0 /* Other */],
        [/*start*/ 0xA8D0, 9 /* Numeric */],
        [/*start*/ 0xA8DA, 0 /* Other */],
        [/*start*/ 0xA8E0, 14 /* Extend */],
        [/*start*/ 0xA8F2, 11 /* ALetter */],
        [/*start*/ 0xA8F8, 0 /* Other */],
        [/*start*/ 0xA8FB, 11 /* ALetter */],
        [/*start*/ 0xA8FC, 0 /* Other */],
        [/*start*/ 0xA8FD, 11 /* ALetter */],
        [/*start*/ 0xA8FF, 14 /* Extend */],
        [/*start*/ 0xA900, 9 /* Numeric */],
        [/*start*/ 0xA90A, 11 /* ALetter */],
        [/*start*/ 0xA926, 14 /* Extend */],
        [/*start*/ 0xA92E, 0 /* Other */],
        [/*start*/ 0xA930, 11 /* ALetter */],
        [/*start*/ 0xA947, 14 /* Extend */],
        [/*start*/ 0xA954, 0 /* Other */],
        [/*start*/ 0xA960, 11 /* ALetter */],
        [/*start*/ 0xA97D, 0 /* Other */],
        [/*start*/ 0xA980, 14 /* Extend */],
        [/*start*/ 0xA984, 11 /* ALetter */],
        [/*start*/ 0xA9B3, 14 /* Extend */],
        [/*start*/ 0xA9C1, 0 /* Other */],
        [/*start*/ 0xA9CF, 11 /* ALetter */],
        [/*start*/ 0xA9D0, 9 /* Numeric */],
        [/*start*/ 0xA9DA, 0 /* Other */],
        [/*start*/ 0xA9E5, 14 /* Extend */],
        [/*start*/ 0xA9E6, 0 /* Other */],
        [/*start*/ 0xA9F0, 9 /* Numeric */],
        [/*start*/ 0xA9FA, 0 /* Other */],
        [/*start*/ 0xAA00, 11 /* ALetter */],
        [/*start*/ 0xAA29, 14 /* Extend */],
        [/*start*/ 0xAA37, 0 /* Other */],
        [/*start*/ 0xAA40, 11 /* ALetter */],
        [/*start*/ 0xAA43, 14 /* Extend */],
        [/*start*/ 0xAA44, 11 /* ALetter */],
        [/*start*/ 0xAA4C, 14 /* Extend */],
        [/*start*/ 0xAA4E, 0 /* Other */],
        [/*start*/ 0xAA50, 9 /* Numeric */],
        [/*start*/ 0xAA5A, 0 /* Other */],
        [/*start*/ 0xAA7B, 14 /* Extend */],
        [/*start*/ 0xAA7E, 0 /* Other */],
        [/*start*/ 0xAAB0, 14 /* Extend */],
        [/*start*/ 0xAAB1, 0 /* Other */],
        [/*start*/ 0xAAB2, 14 /* Extend */],
        [/*start*/ 0xAAB5, 0 /* Other */],
        [/*start*/ 0xAAB7, 14 /* Extend */],
        [/*start*/ 0xAAB9, 0 /* Other */],
        [/*start*/ 0xAABE, 14 /* Extend */],
        [/*start*/ 0xAAC0, 0 /* Other */],
        [/*start*/ 0xAAC1, 14 /* Extend */],
        [/*start*/ 0xAAC2, 0 /* Other */],
        [/*start*/ 0xAAE0, 11 /* ALetter */],
        [/*start*/ 0xAAEB, 14 /* Extend */],
        [/*start*/ 0xAAF0, 0 /* Other */],
        [/*start*/ 0xAAF2, 11 /* ALetter */],
        [/*start*/ 0xAAF5, 14 /* Extend */],
        [/*start*/ 0xAAF7, 0 /* Other */],
        [/*start*/ 0xAB01, 11 /* ALetter */],
        [/*start*/ 0xAB07, 0 /* Other */],
        [/*start*/ 0xAB09, 11 /* ALetter */],
        [/*start*/ 0xAB0F, 0 /* Other */],
        [/*start*/ 0xAB11, 11 /* ALetter */],
        [/*start*/ 0xAB17, 0 /* Other */],
        [/*start*/ 0xAB20, 11 /* ALetter */],
        [/*start*/ 0xAB27, 0 /* Other */],
        [/*start*/ 0xAB28, 11 /* ALetter */],
        [/*start*/ 0xAB2F, 0 /* Other */],
        [/*start*/ 0xAB30, 11 /* ALetter */],
        [/*start*/ 0xAB6A, 0 /* Other */],
        [/*start*/ 0xAB70, 11 /* ALetter */],
        [/*start*/ 0xABE3, 14 /* Extend */],
        [/*start*/ 0xABEB, 0 /* Other */],
        [/*start*/ 0xABEC, 14 /* Extend */],
        [/*start*/ 0xABEE, 0 /* Other */],
        [/*start*/ 0xABF0, 9 /* Numeric */],
        [/*start*/ 0xABFA, 0 /* Other */],
        [/*start*/ 0xAC00, 11 /* ALetter */],
        [/*start*/ 0xD7A4, 0 /* Other */],
        [/*start*/ 0xD7B0, 11 /* ALetter */],
        [/*start*/ 0xD7C7, 0 /* Other */],
        [/*start*/ 0xD7CB, 11 /* ALetter */],
        [/*start*/ 0xD7FC, 0 /* Other */],
        [/*start*/ 0xFB00, 11 /* ALetter */],
        [/*start*/ 0xFB07, 0 /* Other */],
        [/*start*/ 0xFB13, 11 /* ALetter */],
        [/*start*/ 0xFB18, 0 /* Other */],
        [/*start*/ 0xFB1D, 15 /* Hebrew_Letter */],
        [/*start*/ 0xFB1E, 14 /* Extend */],
        [/*start*/ 0xFB1F, 15 /* Hebrew_Letter */],
        [/*start*/ 0xFB29, 0 /* Other */],
        [/*start*/ 0xFB2A, 15 /* Hebrew_Letter */],
        [/*start*/ 0xFB37, 0 /* Other */],
        [/*start*/ 0xFB38, 15 /* Hebrew_Letter */],
        [/*start*/ 0xFB3D, 0 /* Other */],
        [/*start*/ 0xFB3E, 15 /* Hebrew_Letter */],
        [/*start*/ 0xFB3F, 0 /* Other */],
        [/*start*/ 0xFB40, 15 /* Hebrew_Letter */],
        [/*start*/ 0xFB42, 0 /* Other */],
        [/*start*/ 0xFB43, 15 /* Hebrew_Letter */],
        [/*start*/ 0xFB45, 0 /* Other */],
        [/*start*/ 0xFB46, 15 /* Hebrew_Letter */],
        [/*start*/ 0xFB50, 11 /* ALetter */],
        [/*start*/ 0xFBB2, 0 /* Other */],
        [/*start*/ 0xFBD3, 11 /* ALetter */],
        [/*start*/ 0xFD3E, 0 /* Other */],
        [/*start*/ 0xFD50, 11 /* ALetter */],
        [/*start*/ 0xFD90, 0 /* Other */],
        [/*start*/ 0xFD92, 11 /* ALetter */],
        [/*start*/ 0xFDC8, 0 /* Other */],
        [/*start*/ 0xFDF0, 11 /* ALetter */],
        [/*start*/ 0xFDFC, 0 /* Other */],
        [/*start*/ 0xFE00, 14 /* Extend */],
        [/*start*/ 0xFE10, 7 /* MidNum */],
        [/*start*/ 0xFE11, 0 /* Other */],
        [/*start*/ 0xFE13, 10 /* MidLetter */],
        [/*start*/ 0xFE14, 7 /* MidNum */],
        [/*start*/ 0xFE15, 0 /* Other */],
        [/*start*/ 0xFE20, 14 /* Extend */],
        [/*start*/ 0xFE30, 0 /* Other */],
        [/*start*/ 0xFE33, 12 /* ExtendNumLet */],
        [/*start*/ 0xFE35, 0 /* Other */],
        [/*start*/ 0xFE4D, 12 /* ExtendNumLet */],
        [/*start*/ 0xFE50, 7 /* MidNum */],
        [/*start*/ 0xFE51, 0 /* Other */],
        [/*start*/ 0xFE52, 8 /* MidNumLet */],
        [/*start*/ 0xFE53, 0 /* Other */],
        [/*start*/ 0xFE54, 7 /* MidNum */],
        [/*start*/ 0xFE55, 10 /* MidLetter */],
        [/*start*/ 0xFE56, 0 /* Other */],
        [/*start*/ 0xFE70, 11 /* ALetter */],
        [/*start*/ 0xFE75, 0 /* Other */],
        [/*start*/ 0xFE76, 11 /* ALetter */],
        [/*start*/ 0xFEFD, 0 /* Other */],
        [/*start*/ 0xFEFF, 13 /* Format */],
        [/*start*/ 0xFF00, 0 /* Other */],
        [/*start*/ 0xFF07, 8 /* MidNumLet */],
        [/*start*/ 0xFF08, 0 /* Other */],
        [/*start*/ 0xFF0C, 7 /* MidNum */],
        [/*start*/ 0xFF0D, 0 /* Other */],
        [/*start*/ 0xFF0E, 8 /* MidNumLet */],
        [/*start*/ 0xFF0F, 0 /* Other */],
        [/*start*/ 0xFF10, 9 /* Numeric */],
        [/*start*/ 0xFF1A, 10 /* MidLetter */],
        [/*start*/ 0xFF1B, 7 /* MidNum */],
        [/*start*/ 0xFF1C, 0 /* Other */],
        [/*start*/ 0xFF21, 11 /* ALetter */],
        [/*start*/ 0xFF3B, 0 /* Other */],
        [/*start*/ 0xFF3F, 12 /* ExtendNumLet */],
        [/*start*/ 0xFF40, 0 /* Other */],
        [/*start*/ 0xFF41, 11 /* ALetter */],
        [/*start*/ 0xFF5B, 0 /* Other */],
        [/*start*/ 0xFF66, 17 /* Katakana */],
        [/*start*/ 0xFF9E, 14 /* Extend */],
        [/*start*/ 0xFFA0, 11 /* ALetter */],
        [/*start*/ 0xFFBF, 0 /* Other */],
        [/*start*/ 0xFFC2, 11 /* ALetter */],
        [/*start*/ 0xFFC8, 0 /* Other */],
        [/*start*/ 0xFFCA, 11 /* ALetter */],
        [/*start*/ 0xFFD0, 0 /* Other */],
        [/*start*/ 0xFFD2, 11 /* ALetter */],
        [/*start*/ 0xFFD8, 0 /* Other */],
        [/*start*/ 0xFFDA, 11 /* ALetter */],
        [/*start*/ 0xFFDD, 0 /* Other */],
        [/*start*/ 0xFFF9, 13 /* Format */],
        [/*start*/ 0xFFFC, 0 /* Other */],
        [/*start*/ 0x10000, 11 /* ALetter */],
        [/*start*/ 0x1000C, 0 /* Other */],
        [/*start*/ 0x1000D, 11 /* ALetter */],
        [/*start*/ 0x10027, 0 /* Other */],
        [/*start*/ 0x10028, 11 /* ALetter */],
        [/*start*/ 0x1003B, 0 /* Other */],
        [/*start*/ 0x1003C, 11 /* ALetter */],
        [/*start*/ 0x1003E, 0 /* Other */],
        [/*start*/ 0x1003F, 11 /* ALetter */],
        [/*start*/ 0x1004E, 0 /* Other */],
        [/*start*/ 0x10050, 11 /* ALetter */],
        [/*start*/ 0x1005E, 0 /* Other */],
        [/*start*/ 0x10080, 11 /* ALetter */],
        [/*start*/ 0x100FB, 0 /* Other */],
        [/*start*/ 0x10140, 11 /* ALetter */],
        [/*start*/ 0x10175, 0 /* Other */],
        [/*start*/ 0x101FD, 14 /* Extend */],
        [/*start*/ 0x101FE, 0 /* Other */],
        [/*start*/ 0x10280, 11 /* ALetter */],
        [/*start*/ 0x1029D, 0 /* Other */],
        [/*start*/ 0x102A0, 11 /* ALetter */],
        [/*start*/ 0x102D1, 0 /* Other */],
        [/*start*/ 0x102E0, 14 /* Extend */],
        [/*start*/ 0x102E1, 0 /* Other */],
        [/*start*/ 0x10300, 11 /* ALetter */],
        [/*start*/ 0x10320, 0 /* Other */],
        [/*start*/ 0x1032D, 11 /* ALetter */],
        [/*start*/ 0x1034B, 0 /* Other */],
        [/*start*/ 0x10350, 11 /* ALetter */],
        [/*start*/ 0x10376, 14 /* Extend */],
        [/*start*/ 0x1037B, 0 /* Other */],
        [/*start*/ 0x10380, 11 /* ALetter */],
        [/*start*/ 0x1039E, 0 /* Other */],
        [/*start*/ 0x103A0, 11 /* ALetter */],
        [/*start*/ 0x103C4, 0 /* Other */],
        [/*start*/ 0x103C8, 11 /* ALetter */],
        [/*start*/ 0x103D0, 0 /* Other */],
        [/*start*/ 0x103D1, 11 /* ALetter */],
        [/*start*/ 0x103D6, 0 /* Other */],
        [/*start*/ 0x10400, 11 /* ALetter */],
        [/*start*/ 0x1049E, 0 /* Other */],
        [/*start*/ 0x104A0, 9 /* Numeric */],
        [/*start*/ 0x104AA, 0 /* Other */],
        [/*start*/ 0x104B0, 11 /* ALetter */],
        [/*start*/ 0x104D4, 0 /* Other */],
        [/*start*/ 0x104D8, 11 /* ALetter */],
        [/*start*/ 0x104FC, 0 /* Other */],
        [/*start*/ 0x10500, 11 /* ALetter */],
        [/*start*/ 0x10528, 0 /* Other */],
        [/*start*/ 0x10530, 11 /* ALetter */],
        [/*start*/ 0x10564, 0 /* Other */],
        [/*start*/ 0x10600, 11 /* ALetter */],
        [/*start*/ 0x10737, 0 /* Other */],
        [/*start*/ 0x10740, 11 /* ALetter */],
        [/*start*/ 0x10756, 0 /* Other */],
        [/*start*/ 0x10760, 11 /* ALetter */],
        [/*start*/ 0x10768, 0 /* Other */],
        [/*start*/ 0x10800, 11 /* ALetter */],
        [/*start*/ 0x10806, 0 /* Other */],
        [/*start*/ 0x10808, 11 /* ALetter */],
        [/*start*/ 0x10809, 0 /* Other */],
        [/*start*/ 0x1080A, 11 /* ALetter */],
        [/*start*/ 0x10836, 0 /* Other */],
        [/*start*/ 0x10837, 11 /* ALetter */],
        [/*start*/ 0x10839, 0 /* Other */],
        [/*start*/ 0x1083C, 11 /* ALetter */],
        [/*start*/ 0x1083D, 0 /* Other */],
        [/*start*/ 0x1083F, 11 /* ALetter */],
        [/*start*/ 0x10856, 0 /* Other */],
        [/*start*/ 0x10860, 11 /* ALetter */],
        [/*start*/ 0x10877, 0 /* Other */],
        [/*start*/ 0x10880, 11 /* ALetter */],
        [/*start*/ 0x1089F, 0 /* Other */],
        [/*start*/ 0x108E0, 11 /* ALetter */],
        [/*start*/ 0x108F3, 0 /* Other */],
        [/*start*/ 0x108F4, 11 /* ALetter */],
        [/*start*/ 0x108F6, 0 /* Other */],
        [/*start*/ 0x10900, 11 /* ALetter */],
        [/*start*/ 0x10916, 0 /* Other */],
        [/*start*/ 0x10920, 11 /* ALetter */],
        [/*start*/ 0x1093A, 0 /* Other */],
        [/*start*/ 0x10980, 11 /* ALetter */],
        [/*start*/ 0x109B8, 0 /* Other */],
        [/*start*/ 0x109BE, 11 /* ALetter */],
        [/*start*/ 0x109C0, 0 /* Other */],
        [/*start*/ 0x10A00, 11 /* ALetter */],
        [/*start*/ 0x10A01, 14 /* Extend */],
        [/*start*/ 0x10A04, 0 /* Other */],
        [/*start*/ 0x10A05, 14 /* Extend */],
        [/*start*/ 0x10A07, 0 /* Other */],
        [/*start*/ 0x10A0C, 14 /* Extend */],
        [/*start*/ 0x10A10, 11 /* ALetter */],
        [/*start*/ 0x10A14, 0 /* Other */],
        [/*start*/ 0x10A15, 11 /* ALetter */],
        [/*start*/ 0x10A18, 0 /* Other */],
        [/*start*/ 0x10A19, 11 /* ALetter */],
        [/*start*/ 0x10A36, 0 /* Other */],
        [/*start*/ 0x10A38, 14 /* Extend */],
        [/*start*/ 0x10A3B, 0 /* Other */],
        [/*start*/ 0x10A3F, 14 /* Extend */],
        [/*start*/ 0x10A40, 0 /* Other */],
        [/*start*/ 0x10A60, 11 /* ALetter */],
        [/*start*/ 0x10A7D, 0 /* Other */],
        [/*start*/ 0x10A80, 11 /* ALetter */],
        [/*start*/ 0x10A9D, 0 /* Other */],
        [/*start*/ 0x10AC0, 11 /* ALetter */],
        [/*start*/ 0x10AC8, 0 /* Other */],
        [/*start*/ 0x10AC9, 11 /* ALetter */],
        [/*start*/ 0x10AE5, 14 /* Extend */],
        [/*start*/ 0x10AE7, 0 /* Other */],
        [/*start*/ 0x10B00, 11 /* ALetter */],
        [/*start*/ 0x10B36, 0 /* Other */],
        [/*start*/ 0x10B40, 11 /* ALetter */],
        [/*start*/ 0x10B56, 0 /* Other */],
        [/*start*/ 0x10B60, 11 /* ALetter */],
        [/*start*/ 0x10B73, 0 /* Other */],
        [/*start*/ 0x10B80, 11 /* ALetter */],
        [/*start*/ 0x10B92, 0 /* Other */],
        [/*start*/ 0x10C00, 11 /* ALetter */],
        [/*start*/ 0x10C49, 0 /* Other */],
        [/*start*/ 0x10C80, 11 /* ALetter */],
        [/*start*/ 0x10CB3, 0 /* Other */],
        [/*start*/ 0x10CC0, 11 /* ALetter */],
        [/*start*/ 0x10CF3, 0 /* Other */],
        [/*start*/ 0x10D00, 11 /* ALetter */],
        [/*start*/ 0x10D24, 14 /* Extend */],
        [/*start*/ 0x10D28, 0 /* Other */],
        [/*start*/ 0x10D30, 9 /* Numeric */],
        [/*start*/ 0x10D3A, 0 /* Other */],
        [/*start*/ 0x10E80, 11 /* ALetter */],
        [/*start*/ 0x10EAA, 0 /* Other */],
        [/*start*/ 0x10EAB, 14 /* Extend */],
        [/*start*/ 0x10EAD, 0 /* Other */],
        [/*start*/ 0x10EB0, 11 /* ALetter */],
        [/*start*/ 0x10EB2, 0 /* Other */],
        [/*start*/ 0x10F00, 11 /* ALetter */],
        [/*start*/ 0x10F1D, 0 /* Other */],
        [/*start*/ 0x10F27, 11 /* ALetter */],
        [/*start*/ 0x10F28, 0 /* Other */],
        [/*start*/ 0x10F30, 11 /* ALetter */],
        [/*start*/ 0x10F46, 14 /* Extend */],
        [/*start*/ 0x10F51, 0 /* Other */],
        [/*start*/ 0x10FB0, 11 /* ALetter */],
        [/*start*/ 0x10FC5, 0 /* Other */],
        [/*start*/ 0x10FE0, 11 /* ALetter */],
        [/*start*/ 0x10FF7, 0 /* Other */],
        [/*start*/ 0x11000, 14 /* Extend */],
        [/*start*/ 0x11003, 11 /* ALetter */],
        [/*start*/ 0x11038, 14 /* Extend */],
        [/*start*/ 0x11047, 0 /* Other */],
        [/*start*/ 0x11066, 9 /* Numeric */],
        [/*start*/ 0x11070, 0 /* Other */],
        [/*start*/ 0x1107F, 14 /* Extend */],
        [/*start*/ 0x11083, 11 /* ALetter */],
        [/*start*/ 0x110B0, 14 /* Extend */],
        [/*start*/ 0x110BB, 0 /* Other */],
        [/*start*/ 0x110BD, 13 /* Format */],
        [/*start*/ 0x110BE, 0 /* Other */],
        [/*start*/ 0x110CD, 13 /* Format */],
        [/*start*/ 0x110CE, 0 /* Other */],
        [/*start*/ 0x110D0, 11 /* ALetter */],
        [/*start*/ 0x110E9, 0 /* Other */],
        [/*start*/ 0x110F0, 9 /* Numeric */],
        [/*start*/ 0x110FA, 0 /* Other */],
        [/*start*/ 0x11100, 14 /* Extend */],
        [/*start*/ 0x11103, 11 /* ALetter */],
        [/*start*/ 0x11127, 14 /* Extend */],
        [/*start*/ 0x11135, 0 /* Other */],
        [/*start*/ 0x11136, 9 /* Numeric */],
        [/*start*/ 0x11140, 0 /* Other */],
        [/*start*/ 0x11144, 11 /* ALetter */],
        [/*start*/ 0x11145, 14 /* Extend */],
        [/*start*/ 0x11147, 11 /* ALetter */],
        [/*start*/ 0x11148, 0 /* Other */],
        [/*start*/ 0x11150, 11 /* ALetter */],
        [/*start*/ 0x11173, 14 /* Extend */],
        [/*start*/ 0x11174, 0 /* Other */],
        [/*start*/ 0x11176, 11 /* ALetter */],
        [/*start*/ 0x11177, 0 /* Other */],
        [/*start*/ 0x11180, 14 /* Extend */],
        [/*start*/ 0x11183, 11 /* ALetter */],
        [/*start*/ 0x111B3, 14 /* Extend */],
        [/*start*/ 0x111C1, 11 /* ALetter */],
        [/*start*/ 0x111C5, 0 /* Other */],
        [/*start*/ 0x111C9, 14 /* Extend */],
        [/*start*/ 0x111CD, 0 /* Other */],
        [/*start*/ 0x111CE, 14 /* Extend */],
        [/*start*/ 0x111D0, 9 /* Numeric */],
        [/*start*/ 0x111DA, 11 /* ALetter */],
        [/*start*/ 0x111DB, 0 /* Other */],
        [/*start*/ 0x111DC, 11 /* ALetter */],
        [/*start*/ 0x111DD, 0 /* Other */],
        [/*start*/ 0x11200, 11 /* ALetter */],
        [/*start*/ 0x11212, 0 /* Other */],
        [/*start*/ 0x11213, 11 /* ALetter */],
        [/*start*/ 0x1122C, 14 /* Extend */],
        [/*start*/ 0x11238, 0 /* Other */],
        [/*start*/ 0x1123E, 14 /* Extend */],
        [/*start*/ 0x1123F, 0 /* Other */],
        [/*start*/ 0x11280, 11 /* ALetter */],
        [/*start*/ 0x11287, 0 /* Other */],
        [/*start*/ 0x11288, 11 /* ALetter */],
        [/*start*/ 0x11289, 0 /* Other */],
        [/*start*/ 0x1128A, 11 /* ALetter */],
        [/*start*/ 0x1128E, 0 /* Other */],
        [/*start*/ 0x1128F, 11 /* ALetter */],
        [/*start*/ 0x1129E, 0 /* Other */],
        [/*start*/ 0x1129F, 11 /* ALetter */],
        [/*start*/ 0x112A9, 0 /* Other */],
        [/*start*/ 0x112B0, 11 /* ALetter */],
        [/*start*/ 0x112DF, 14 /* Extend */],
        [/*start*/ 0x112EB, 0 /* Other */],
        [/*start*/ 0x112F0, 9 /* Numeric */],
        [/*start*/ 0x112FA, 0 /* Other */],
        [/*start*/ 0x11300, 14 /* Extend */],
        [/*start*/ 0x11304, 0 /* Other */],
        [/*start*/ 0x11305, 11 /* ALetter */],
        [/*start*/ 0x1130D, 0 /* Other */],
        [/*start*/ 0x1130F, 11 /* ALetter */],
        [/*start*/ 0x11311, 0 /* Other */],
        [/*start*/ 0x11313, 11 /* ALetter */],
        [/*start*/ 0x11329, 0 /* Other */],
        [/*start*/ 0x1132A, 11 /* ALetter */],
        [/*start*/ 0x11331, 0 /* Other */],
        [/*start*/ 0x11332, 11 /* ALetter */],
        [/*start*/ 0x11334, 0 /* Other */],
        [/*start*/ 0x11335, 11 /* ALetter */],
        [/*start*/ 0x1133A, 0 /* Other */],
        [/*start*/ 0x1133B, 14 /* Extend */],
        [/*start*/ 0x1133D, 11 /* ALetter */],
        [/*start*/ 0x1133E, 14 /* Extend */],
        [/*start*/ 0x11345, 0 /* Other */],
        [/*start*/ 0x11347, 14 /* Extend */],
        [/*start*/ 0x11349, 0 /* Other */],
        [/*start*/ 0x1134B, 14 /* Extend */],
        [/*start*/ 0x1134E, 0 /* Other */],
        [/*start*/ 0x11350, 11 /* ALetter */],
        [/*start*/ 0x11351, 0 /* Other */],
        [/*start*/ 0x11357, 14 /* Extend */],
        [/*start*/ 0x11358, 0 /* Other */],
        [/*start*/ 0x1135D, 11 /* ALetter */],
        [/*start*/ 0x11362, 14 /* Extend */],
        [/*start*/ 0x11364, 0 /* Other */],
        [/*start*/ 0x11366, 14 /* Extend */],
        [/*start*/ 0x1136D, 0 /* Other */],
        [/*start*/ 0x11370, 14 /* Extend */],
        [/*start*/ 0x11375, 0 /* Other */],
        [/*start*/ 0x11400, 11 /* ALetter */],
        [/*start*/ 0x11435, 14 /* Extend */],
        [/*start*/ 0x11447, 11 /* ALetter */],
        [/*start*/ 0x1144B, 0 /* Other */],
        [/*start*/ 0x11450, 9 /* Numeric */],
        [/*start*/ 0x1145A, 0 /* Other */],
        [/*start*/ 0x1145E, 14 /* Extend */],
        [/*start*/ 0x1145F, 11 /* ALetter */],
        [/*start*/ 0x11462, 0 /* Other */],
        [/*start*/ 0x11480, 11 /* ALetter */],
        [/*start*/ 0x114B0, 14 /* Extend */],
        [/*start*/ 0x114C4, 11 /* ALetter */],
        [/*start*/ 0x114C6, 0 /* Other */],
        [/*start*/ 0x114C7, 11 /* ALetter */],
        [/*start*/ 0x114C8, 0 /* Other */],
        [/*start*/ 0x114D0, 9 /* Numeric */],
        [/*start*/ 0x114DA, 0 /* Other */],
        [/*start*/ 0x11580, 11 /* ALetter */],
        [/*start*/ 0x115AF, 14 /* Extend */],
        [/*start*/ 0x115B6, 0 /* Other */],
        [/*start*/ 0x115B8, 14 /* Extend */],
        [/*start*/ 0x115C1, 0 /* Other */],
        [/*start*/ 0x115D8, 11 /* ALetter */],
        [/*start*/ 0x115DC, 14 /* Extend */],
        [/*start*/ 0x115DE, 0 /* Other */],
        [/*start*/ 0x11600, 11 /* ALetter */],
        [/*start*/ 0x11630, 14 /* Extend */],
        [/*start*/ 0x11641, 0 /* Other */],
        [/*start*/ 0x11644, 11 /* ALetter */],
        [/*start*/ 0x11645, 0 /* Other */],
        [/*start*/ 0x11650, 9 /* Numeric */],
        [/*start*/ 0x1165A, 0 /* Other */],
        [/*start*/ 0x11680, 11 /* ALetter */],
        [/*start*/ 0x116AB, 14 /* Extend */],
        [/*start*/ 0x116B8, 11 /* ALetter */],
        [/*start*/ 0x116B9, 0 /* Other */],
        [/*start*/ 0x116C0, 9 /* Numeric */],
        [/*start*/ 0x116CA, 0 /* Other */],
        [/*start*/ 0x1171D, 14 /* Extend */],
        [/*start*/ 0x1172C, 0 /* Other */],
        [/*start*/ 0x11730, 9 /* Numeric */],
        [/*start*/ 0x1173A, 0 /* Other */],
        [/*start*/ 0x11800, 11 /* ALetter */],
        [/*start*/ 0x1182C, 14 /* Extend */],
        [/*start*/ 0x1183B, 0 /* Other */],
        [/*start*/ 0x118A0, 11 /* ALetter */],
        [/*start*/ 0x118E0, 9 /* Numeric */],
        [/*start*/ 0x118EA, 0 /* Other */],
        [/*start*/ 0x118FF, 11 /* ALetter */],
        [/*start*/ 0x11907, 0 /* Other */],
        [/*start*/ 0x11909, 11 /* ALetter */],
        [/*start*/ 0x1190A, 0 /* Other */],
        [/*start*/ 0x1190C, 11 /* ALetter */],
        [/*start*/ 0x11914, 0 /* Other */],
        [/*start*/ 0x11915, 11 /* ALetter */],
        [/*start*/ 0x11917, 0 /* Other */],
        [/*start*/ 0x11918, 11 /* ALetter */],
        [/*start*/ 0x11930, 14 /* Extend */],
        [/*start*/ 0x11936, 0 /* Other */],
        [/*start*/ 0x11937, 14 /* Extend */],
        [/*start*/ 0x11939, 0 /* Other */],
        [/*start*/ 0x1193B, 14 /* Extend */],
        [/*start*/ 0x1193F, 11 /* ALetter */],
        [/*start*/ 0x11940, 14 /* Extend */],
        [/*start*/ 0x11941, 11 /* ALetter */],
        [/*start*/ 0x11942, 14 /* Extend */],
        [/*start*/ 0x11944, 0 /* Other */],
        [/*start*/ 0x11950, 9 /* Numeric */],
        [/*start*/ 0x1195A, 0 /* Other */],
        [/*start*/ 0x119A0, 11 /* ALetter */],
        [/*start*/ 0x119A8, 0 /* Other */],
        [/*start*/ 0x119AA, 11 /* ALetter */],
        [/*start*/ 0x119D1, 14 /* Extend */],
        [/*start*/ 0x119D8, 0 /* Other */],
        [/*start*/ 0x119DA, 14 /* Extend */],
        [/*start*/ 0x119E1, 11 /* ALetter */],
        [/*start*/ 0x119E2, 0 /* Other */],
        [/*start*/ 0x119E3, 11 /* ALetter */],
        [/*start*/ 0x119E4, 14 /* Extend */],
        [/*start*/ 0x119E5, 0 /* Other */],
        [/*start*/ 0x11A00, 11 /* ALetter */],
        [/*start*/ 0x11A01, 14 /* Extend */],
        [/*start*/ 0x11A0B, 11 /* ALetter */],
        [/*start*/ 0x11A33, 14 /* Extend */],
        [/*start*/ 0x11A3A, 11 /* ALetter */],
        [/*start*/ 0x11A3B, 14 /* Extend */],
        [/*start*/ 0x11A3F, 0 /* Other */],
        [/*start*/ 0x11A47, 14 /* Extend */],
        [/*start*/ 0x11A48, 0 /* Other */],
        [/*start*/ 0x11A50, 11 /* ALetter */],
        [/*start*/ 0x11A51, 14 /* Extend */],
        [/*start*/ 0x11A5C, 11 /* ALetter */],
        [/*start*/ 0x11A8A, 14 /* Extend */],
        [/*start*/ 0x11A9A, 0 /* Other */],
        [/*start*/ 0x11A9D, 11 /* ALetter */],
        [/*start*/ 0x11A9E, 0 /* Other */],
        [/*start*/ 0x11AC0, 11 /* ALetter */],
        [/*start*/ 0x11AF9, 0 /* Other */],
        [/*start*/ 0x11C00, 11 /* ALetter */],
        [/*start*/ 0x11C09, 0 /* Other */],
        [/*start*/ 0x11C0A, 11 /* ALetter */],
        [/*start*/ 0x11C2F, 14 /* Extend */],
        [/*start*/ 0x11C37, 0 /* Other */],
        [/*start*/ 0x11C38, 14 /* Extend */],
        [/*start*/ 0x11C40, 11 /* ALetter */],
        [/*start*/ 0x11C41, 0 /* Other */],
        [/*start*/ 0x11C50, 9 /* Numeric */],
        [/*start*/ 0x11C5A, 0 /* Other */],
        [/*start*/ 0x11C72, 11 /* ALetter */],
        [/*start*/ 0x11C90, 0 /* Other */],
        [/*start*/ 0x11C92, 14 /* Extend */],
        [/*start*/ 0x11CA8, 0 /* Other */],
        [/*start*/ 0x11CA9, 14 /* Extend */],
        [/*start*/ 0x11CB7, 0 /* Other */],
        [/*start*/ 0x11D00, 11 /* ALetter */],
        [/*start*/ 0x11D07, 0 /* Other */],
        [/*start*/ 0x11D08, 11 /* ALetter */],
        [/*start*/ 0x11D0A, 0 /* Other */],
        [/*start*/ 0x11D0B, 11 /* ALetter */],
        [/*start*/ 0x11D31, 14 /* Extend */],
        [/*start*/ 0x11D37, 0 /* Other */],
        [/*start*/ 0x11D3A, 14 /* Extend */],
        [/*start*/ 0x11D3B, 0 /* Other */],
        [/*start*/ 0x11D3C, 14 /* Extend */],
        [/*start*/ 0x11D3E, 0 /* Other */],
        [/*start*/ 0x11D3F, 14 /* Extend */],
        [/*start*/ 0x11D46, 11 /* ALetter */],
        [/*start*/ 0x11D47, 14 /* Extend */],
        [/*start*/ 0x11D48, 0 /* Other */],
        [/*start*/ 0x11D50, 9 /* Numeric */],
        [/*start*/ 0x11D5A, 0 /* Other */],
        [/*start*/ 0x11D60, 11 /* ALetter */],
        [/*start*/ 0x11D66, 0 /* Other */],
        [/*start*/ 0x11D67, 11 /* ALetter */],
        [/*start*/ 0x11D69, 0 /* Other */],
        [/*start*/ 0x11D6A, 11 /* ALetter */],
        [/*start*/ 0x11D8A, 14 /* Extend */],
        [/*start*/ 0x11D8F, 0 /* Other */],
        [/*start*/ 0x11D90, 14 /* Extend */],
        [/*start*/ 0x11D92, 0 /* Other */],
        [/*start*/ 0x11D93, 14 /* Extend */],
        [/*start*/ 0x11D98, 11 /* ALetter */],
        [/*start*/ 0x11D99, 0 /* Other */],
        [/*start*/ 0x11DA0, 9 /* Numeric */],
        [/*start*/ 0x11DAA, 0 /* Other */],
        [/*start*/ 0x11EE0, 11 /* ALetter */],
        [/*start*/ 0x11EF3, 14 /* Extend */],
        [/*start*/ 0x11EF7, 0 /* Other */],
        [/*start*/ 0x11FB0, 11 /* ALetter */],
        [/*start*/ 0x11FB1, 0 /* Other */],
        [/*start*/ 0x12000, 11 /* ALetter */],
        [/*start*/ 0x1239A, 0 /* Other */],
        [/*start*/ 0x12400, 11 /* ALetter */],
        [/*start*/ 0x1246F, 0 /* Other */],
        [/*start*/ 0x12480, 11 /* ALetter */],
        [/*start*/ 0x12544, 0 /* Other */],
        [/*start*/ 0x13000, 11 /* ALetter */],
        [/*start*/ 0x1342F, 0 /* Other */],
        [/*start*/ 0x13430, 13 /* Format */],
        [/*start*/ 0x13439, 0 /* Other */],
        [/*start*/ 0x14400, 11 /* ALetter */],
        [/*start*/ 0x14647, 0 /* Other */],
        [/*start*/ 0x16800, 11 /* ALetter */],
        [/*start*/ 0x16A39, 0 /* Other */],
        [/*start*/ 0x16A40, 11 /* ALetter */],
        [/*start*/ 0x16A5F, 0 /* Other */],
        [/*start*/ 0x16A60, 9 /* Numeric */],
        [/*start*/ 0x16A6A, 0 /* Other */],
        [/*start*/ 0x16AD0, 11 /* ALetter */],
        [/*start*/ 0x16AEE, 0 /* Other */],
        [/*start*/ 0x16AF0, 14 /* Extend */],
        [/*start*/ 0x16AF5, 0 /* Other */],
        [/*start*/ 0x16B00, 11 /* ALetter */],
        [/*start*/ 0x16B30, 14 /* Extend */],
        [/*start*/ 0x16B37, 0 /* Other */],
        [/*start*/ 0x16B40, 11 /* ALetter */],
        [/*start*/ 0x16B44, 0 /* Other */],
        [/*start*/ 0x16B50, 9 /* Numeric */],
        [/*start*/ 0x16B5A, 0 /* Other */],
        [/*start*/ 0x16B63, 11 /* ALetter */],
        [/*start*/ 0x16B78, 0 /* Other */],
        [/*start*/ 0x16B7D, 11 /* ALetter */],
        [/*start*/ 0x16B90, 0 /* Other */],
        [/*start*/ 0x16E40, 11 /* ALetter */],
        [/*start*/ 0x16E80, 0 /* Other */],
        [/*start*/ 0x16F00, 11 /* ALetter */],
        [/*start*/ 0x16F4B, 0 /* Other */],
        [/*start*/ 0x16F4F, 14 /* Extend */],
        [/*start*/ 0x16F50, 11 /* ALetter */],
        [/*start*/ 0x16F51, 14 /* Extend */],
        [/*start*/ 0x16F88, 0 /* Other */],
        [/*start*/ 0x16F8F, 14 /* Extend */],
        [/*start*/ 0x16F93, 11 /* ALetter */],
        [/*start*/ 0x16FA0, 0 /* Other */],
        [/*start*/ 0x16FE0, 11 /* ALetter */],
        [/*start*/ 0x16FE2, 0 /* Other */],
        [/*start*/ 0x16FE3, 11 /* ALetter */],
        [/*start*/ 0x16FE4, 14 /* Extend */],
        [/*start*/ 0x16FE5, 0 /* Other */],
        [/*start*/ 0x16FF0, 14 /* Extend */],
        [/*start*/ 0x16FF2, 0 /* Other */],
        [/*start*/ 0x1B000, 17 /* Katakana */],
        [/*start*/ 0x1B001, 0 /* Other */],
        [/*start*/ 0x1B164, 17 /* Katakana */],
        [/*start*/ 0x1B168, 0 /* Other */],
        [/*start*/ 0x1BC00, 11 /* ALetter */],
        [/*start*/ 0x1BC6B, 0 /* Other */],
        [/*start*/ 0x1BC70, 11 /* ALetter */],
        [/*start*/ 0x1BC7D, 0 /* Other */],
        [/*start*/ 0x1BC80, 11 /* ALetter */],
        [/*start*/ 0x1BC89, 0 /* Other */],
        [/*start*/ 0x1BC90, 11 /* ALetter */],
        [/*start*/ 0x1BC9A, 0 /* Other */],
        [/*start*/ 0x1BC9D, 14 /* Extend */],
        [/*start*/ 0x1BC9F, 0 /* Other */],
        [/*start*/ 0x1BCA0, 13 /* Format */],
        [/*start*/ 0x1BCA4, 0 /* Other */],
        [/*start*/ 0x1D165, 14 /* Extend */],
        [/*start*/ 0x1D16A, 0 /* Other */],
        [/*start*/ 0x1D16D, 14 /* Extend */],
        [/*start*/ 0x1D173, 13 /* Format */],
        [/*start*/ 0x1D17B, 14 /* Extend */],
        [/*start*/ 0x1D183, 0 /* Other */],
        [/*start*/ 0x1D185, 14 /* Extend */],
        [/*start*/ 0x1D18C, 0 /* Other */],
        [/*start*/ 0x1D1AA, 14 /* Extend */],
        [/*start*/ 0x1D1AE, 0 /* Other */],
        [/*start*/ 0x1D242, 14 /* Extend */],
        [/*start*/ 0x1D245, 0 /* Other */],
        [/*start*/ 0x1D400, 11 /* ALetter */],
        [/*start*/ 0x1D455, 0 /* Other */],
        [/*start*/ 0x1D456, 11 /* ALetter */],
        [/*start*/ 0x1D49D, 0 /* Other */],
        [/*start*/ 0x1D49E, 11 /* ALetter */],
        [/*start*/ 0x1D4A0, 0 /* Other */],
        [/*start*/ 0x1D4A2, 11 /* ALetter */],
        [/*start*/ 0x1D4A3, 0 /* Other */],
        [/*start*/ 0x1D4A5, 11 /* ALetter */],
        [/*start*/ 0x1D4A7, 0 /* Other */],
        [/*start*/ 0x1D4A9, 11 /* ALetter */],
        [/*start*/ 0x1D4AD, 0 /* Other */],
        [/*start*/ 0x1D4AE, 11 /* ALetter */],
        [/*start*/ 0x1D4BA, 0 /* Other */],
        [/*start*/ 0x1D4BB, 11 /* ALetter */],
        [/*start*/ 0x1D4BC, 0 /* Other */],
        [/*start*/ 0x1D4BD, 11 /* ALetter */],
        [/*start*/ 0x1D4C4, 0 /* Other */],
        [/*start*/ 0x1D4C5, 11 /* ALetter */],
        [/*start*/ 0x1D506, 0 /* Other */],
        [/*start*/ 0x1D507, 11 /* ALetter */],
        [/*start*/ 0x1D50B, 0 /* Other */],
        [/*start*/ 0x1D50D, 11 /* ALetter */],
        [/*start*/ 0x1D515, 0 /* Other */],
        [/*start*/ 0x1D516, 11 /* ALetter */],
        [/*start*/ 0x1D51D, 0 /* Other */],
        [/*start*/ 0x1D51E, 11 /* ALetter */],
        [/*start*/ 0x1D53A, 0 /* Other */],
        [/*start*/ 0x1D53B, 11 /* ALetter */],
        [/*start*/ 0x1D53F, 0 /* Other */],
        [/*start*/ 0x1D540, 11 /* ALetter */],
        [/*start*/ 0x1D545, 0 /* Other */],
        [/*start*/ 0x1D546, 11 /* ALetter */],
        [/*start*/ 0x1D547, 0 /* Other */],
        [/*start*/ 0x1D54A, 11 /* ALetter */],
        [/*start*/ 0x1D551, 0 /* Other */],
        [/*start*/ 0x1D552, 11 /* ALetter */],
        [/*start*/ 0x1D6A6, 0 /* Other */],
        [/*start*/ 0x1D6A8, 11 /* ALetter */],
        [/*start*/ 0x1D6C1, 0 /* Other */],
        [/*start*/ 0x1D6C2, 11 /* ALetter */],
        [/*start*/ 0x1D6DB, 0 /* Other */],
        [/*start*/ 0x1D6DC, 11 /* ALetter */],
        [/*start*/ 0x1D6FB, 0 /* Other */],
        [/*start*/ 0x1D6FC, 11 /* ALetter */],
        [/*start*/ 0x1D715, 0 /* Other */],
        [/*start*/ 0x1D716, 11 /* ALetter */],
        [/*start*/ 0x1D735, 0 /* Other */],
        [/*start*/ 0x1D736, 11 /* ALetter */],
        [/*start*/ 0x1D74F, 0 /* Other */],
        [/*start*/ 0x1D750, 11 /* ALetter */],
        [/*start*/ 0x1D76F, 0 /* Other */],
        [/*start*/ 0x1D770, 11 /* ALetter */],
        [/*start*/ 0x1D789, 0 /* Other */],
        [/*start*/ 0x1D78A, 11 /* ALetter */],
        [/*start*/ 0x1D7A9, 0 /* Other */],
        [/*start*/ 0x1D7AA, 11 /* ALetter */],
        [/*start*/ 0x1D7C3, 0 /* Other */],
        [/*start*/ 0x1D7C4, 11 /* ALetter */],
        [/*start*/ 0x1D7CC, 0 /* Other */],
        [/*start*/ 0x1D7CE, 9 /* Numeric */],
        [/*start*/ 0x1D800, 0 /* Other */],
        [/*start*/ 0x1DA00, 14 /* Extend */],
        [/*start*/ 0x1DA37, 0 /* Other */],
        [/*start*/ 0x1DA3B, 14 /* Extend */],
        [/*start*/ 0x1DA6D, 0 /* Other */],
        [/*start*/ 0x1DA75, 14 /* Extend */],
        [/*start*/ 0x1DA76, 0 /* Other */],
        [/*start*/ 0x1DA84, 14 /* Extend */],
        [/*start*/ 0x1DA85, 0 /* Other */],
        [/*start*/ 0x1DA9B, 14 /* Extend */],
        [/*start*/ 0x1DAA0, 0 /* Other */],
        [/*start*/ 0x1DAA1, 14 /* Extend */],
        [/*start*/ 0x1DAB0, 0 /* Other */],
        [/*start*/ 0x1E000, 14 /* Extend */],
        [/*start*/ 0x1E007, 0 /* Other */],
        [/*start*/ 0x1E008, 14 /* Extend */],
        [/*start*/ 0x1E019, 0 /* Other */],
        [/*start*/ 0x1E01B, 14 /* Extend */],
        [/*start*/ 0x1E022, 0 /* Other */],
        [/*start*/ 0x1E023, 14 /* Extend */],
        [/*start*/ 0x1E025, 0 /* Other */],
        [/*start*/ 0x1E026, 14 /* Extend */],
        [/*start*/ 0x1E02B, 0 /* Other */],
        [/*start*/ 0x1E100, 11 /* ALetter */],
        [/*start*/ 0x1E12D, 0 /* Other */],
        [/*start*/ 0x1E130, 14 /* Extend */],
        [/*start*/ 0x1E137, 11 /* ALetter */],
        [/*start*/ 0x1E13E, 0 /* Other */],
        [/*start*/ 0x1E140, 9 /* Numeric */],
        [/*start*/ 0x1E14A, 0 /* Other */],
        [/*start*/ 0x1E14E, 11 /* ALetter */],
        [/*start*/ 0x1E14F, 0 /* Other */],
        [/*start*/ 0x1E2C0, 11 /* ALetter */],
        [/*start*/ 0x1E2EC, 14 /* Extend */],
        [/*start*/ 0x1E2F0, 9 /* Numeric */],
        [/*start*/ 0x1E2FA, 0 /* Other */],
        [/*start*/ 0x1E800, 11 /* ALetter */],
        [/*start*/ 0x1E8C5, 0 /* Other */],
        [/*start*/ 0x1E8D0, 14 /* Extend */],
        [/*start*/ 0x1E8D7, 0 /* Other */],
        [/*start*/ 0x1E900, 11 /* ALetter */],
        [/*start*/ 0x1E944, 14 /* Extend */],
        [/*start*/ 0x1E94B, 11 /* ALetter */],
        [/*start*/ 0x1E94C, 0 /* Other */],
        [/*start*/ 0x1E950, 9 /* Numeric */],
        [/*start*/ 0x1E95A, 0 /* Other */],
        [/*start*/ 0x1EE00, 11 /* ALetter */],
        [/*start*/ 0x1EE04, 0 /* Other */],
        [/*start*/ 0x1EE05, 11 /* ALetter */],
        [/*start*/ 0x1EE20, 0 /* Other */],
        [/*start*/ 0x1EE21, 11 /* ALetter */],
        [/*start*/ 0x1EE23, 0 /* Other */],
        [/*start*/ 0x1EE24, 11 /* ALetter */],
        [/*start*/ 0x1EE25, 0 /* Other */],
        [/*start*/ 0x1EE27, 11 /* ALetter */],
        [/*start*/ 0x1EE28, 0 /* Other */],
        [/*start*/ 0x1EE29, 11 /* ALetter */],
        [/*start*/ 0x1EE33, 0 /* Other */],
        [/*start*/ 0x1EE34, 11 /* ALetter */],
        [/*start*/ 0x1EE38, 0 /* Other */],
        [/*start*/ 0x1EE39, 11 /* ALetter */],
        [/*start*/ 0x1EE3A, 0 /* Other */],
        [/*start*/ 0x1EE3B, 11 /* ALetter */],
        [/*start*/ 0x1EE3C, 0 /* Other */],
        [/*start*/ 0x1EE42, 11 /* ALetter */],
        [/*start*/ 0x1EE43, 0 /* Other */],
        [/*start*/ 0x1EE47, 11 /* ALetter */],
        [/*start*/ 0x1EE48, 0 /* Other */],
        [/*start*/ 0x1EE49, 11 /* ALetter */],
        [/*start*/ 0x1EE4A, 0 /* Other */],
        [/*start*/ 0x1EE4B, 11 /* ALetter */],
        [/*start*/ 0x1EE4C, 0 /* Other */],
        [/*start*/ 0x1EE4D, 11 /* ALetter */],
        [/*start*/ 0x1EE50, 0 /* Other */],
        [/*start*/ 0x1EE51, 11 /* ALetter */],
        [/*start*/ 0x1EE53, 0 /* Other */],
        [/*start*/ 0x1EE54, 11 /* ALetter */],
        [/*start*/ 0x1EE55, 0 /* Other */],
        [/*start*/ 0x1EE57, 11 /* ALetter */],
        [/*start*/ 0x1EE58, 0 /* Other */],
        [/*start*/ 0x1EE59, 11 /* ALetter */],
        [/*start*/ 0x1EE5A, 0 /* Other */],
        [/*start*/ 0x1EE5B, 11 /* ALetter */],
        [/*start*/ 0x1EE5C, 0 /* Other */],
        [/*start*/ 0x1EE5D, 11 /* ALetter */],
        [/*start*/ 0x1EE5E, 0 /* Other */],
        [/*start*/ 0x1EE5F, 11 /* ALetter */],
        [/*start*/ 0x1EE60, 0 /* Other */],
        [/*start*/ 0x1EE61, 11 /* ALetter */],
        [/*start*/ 0x1EE63, 0 /* Other */],
        [/*start*/ 0x1EE64, 11 /* ALetter */],
        [/*start*/ 0x1EE65, 0 /* Other */],
        [/*start*/ 0x1EE67, 11 /* ALetter */],
        [/*start*/ 0x1EE6B, 0 /* Other */],
        [/*start*/ 0x1EE6C, 11 /* ALetter */],
        [/*start*/ 0x1EE73, 0 /* Other */],
        [/*start*/ 0x1EE74, 11 /* ALetter */],
        [/*start*/ 0x1EE78, 0 /* Other */],
        [/*start*/ 0x1EE79, 11 /* ALetter */],
        [/*start*/ 0x1EE7D, 0 /* Other */],
        [/*start*/ 0x1EE7E, 11 /* ALetter */],
        [/*start*/ 0x1EE7F, 0 /* Other */],
        [/*start*/ 0x1EE80, 11 /* ALetter */],
        [/*start*/ 0x1EE8A, 0 /* Other */],
        [/*start*/ 0x1EE8B, 11 /* ALetter */],
        [/*start*/ 0x1EE9C, 0 /* Other */],
        [/*start*/ 0x1EEA1, 11 /* ALetter */],
        [/*start*/ 0x1EEA4, 0 /* Other */],
        [/*start*/ 0x1EEA5, 11 /* ALetter */],
        [/*start*/ 0x1EEAA, 0 /* Other */],
        [/*start*/ 0x1EEAB, 11 /* ALetter */],
        [/*start*/ 0x1EEBC, 0 /* Other */],
        [/*start*/ 0x1F130, 11 /* ALetter */],
        [/*start*/ 0x1F14A, 0 /* Other */],
        [/*start*/ 0x1F150, 11 /* ALetter */],
        [/*start*/ 0x1F16A, 0 /* Other */],
        [/*start*/ 0x1F170, 11 /* ALetter */],
        [/*start*/ 0x1F18A, 0 /* Other */],
        [/*start*/ 0x1F1E6, 18 /* Regional_Indicator */],
        [/*start*/ 0x1F200, 0 /* Other */],
        [/*start*/ 0x1F3FB, 14 /* Extend */],
        [/*start*/ 0x1F400, 0 /* Other */],
        [/*start*/ 0x1FBF0, 9 /* Numeric */],
        [/*start*/ 0x1FBFA, 0 /* Other */],
        [/*start*/ 0xE0001, 13 /* Format */],
        [/*start*/ 0xE0002, 0 /* Other */],
        [/*start*/ 0xE0020, 14 /* Extend */],
        [/*start*/ 0xE0080, 0 /* Other */],
        [/*start*/ 0xE0100, 14 /* Extend */],
        [/*start*/ 0xE01F0, 0 /* Other */],
    ];


    var WordBreakProperty = /*#__PURE__*/Object.defineProperty({
    	extendedPictographic: extendedPictographic,
    	WORD_BREAK_PROPERTY: WORD_BREAK_PROPERTY
    }, '__esModule', {value: true});

    /*!
     * Copyright (c) 2019 Eddie Antonio Santos
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     */

    /**
     * @file
     * This implements the Unicode 12.0 UAX #29 §4.1
     * default word boundary specification.
     *
     * It finds boundaries between words and also other things!
     *
     * See: https://unicode.org/reports/tr29/#Default_Word_Boundaries
     */

    /**
     * Yields a series of string indices where a word break should
     * occur. That is, there should be a break BEFORE each string
     * index yielded by this generator.
     *
     * @param text Text to find word boundaries in.
     */
    function* findBoundaries(text) {
        // WB1 and WB2: no boundaries if given an empty string.
        if (text.length === 0) {
            // There are no boundaries in an empty string!
            return;
        }
        // This algorithm works by maintaining a sliding window of four SCALAR VALUES.
        //
        //  - Scalar values? JavaScript strings are NOT actually a string of
        //    Unicode code points; some characters are made up of TWO
        //    JavaScript indices. e.g.,
        //        "💩".length === 2;
        //        "💩"[0] === '\uD83D';
        //        "💩"[1] === '\uDCA9';
        //
        //    These characters that are represented by TWO indices are
        //    called "surrogate pairs". Since we don't want to be in the
        //    "middle" of a character, make sure we're always advancing
        //    by scalar values, and NOT indices. That means, we sometimes
        //    need to advance by TWO indices, not just one.
        //  - Four values? Some rules look at what's to the left of
        //    left, and some look at what's to the right of right. So
        //    keep track of this!
        let rightPos;
        let lookaheadPos = 0; // lookahead, one scalar value to the right of right.
        // Before the start of the string is also the start of the string.
        let lookbehind;
        let left = 19 /* sot */;
        let right = 19 /* sot */;
        let lookahead = wordbreakPropertyAt(0);
        // Count RIs to make sure we're not splitting emoji flags:
        let nConsecutiveRegionalIndicators = 0;
        do {
            // Shift all positions, one scalar value to the right.
            rightPos = lookaheadPos;
            lookaheadPos = positionAfter(lookaheadPos);
            // Shift all properties, one scalar value to the right.
            [lookbehind, left, right, lookahead] =
                [left, right, lookahead, wordbreakPropertyAt(lookaheadPos)];
            // Break at the start and end of text, unless the text is empty.
            // WB1: Break at start of text...
            if (left === 19 /* sot */) {
                yield rightPos;
                continue;
            }
            // WB2: Break at the end of text...
            if (right === 20 /* eot */) {
                yield rightPos;
                break; // Reached the end of the string. We're done!
            }
            // WB3: Do not break within CRLF:
            if (left === 3 /* CR */ && right === 1 /* LF */)
                continue;
            // WB3b: Otherwise, break after...
            if (left === 2 /* Newline */ ||
                left == 3 /* CR */ ||
                left === 1 /* LF */) {
                yield rightPos;
                continue;
            }
            // WB3a: ...and before newlines
            if (right === 2 /* Newline */ ||
                right === 3 /* CR */ ||
                right === 1 /* LF */) {
                yield rightPos;
                continue;
            }
            // HACK: advance by TWO positions to handle tricky emoji
            // combining sequences, that SHOULD be kept together by
            // WB3c, but are prematurely split by WB4:
            if (left === 0 /* Other */ &&
                (right === 14 /* Extend */ || right === 13 /* Format */) &&
                lookahead === 16 /* ZWJ */) {
                // To ensure this is not split, advance TWO positions forward.
                for (let i = 0; i < 2; i++) {
                    [rightPos, lookaheadPos] = [lookaheadPos, positionAfter(lookaheadPos)];
                }
                [left, right, lookahead] =
                    [lookahead, wordbreakPropertyAt(rightPos), wordbreakPropertyAt(lookaheadPos)];
                // N.B. `left` now MUST be ZWJ, setting it up for WB3c proper.
            }
            // WB3c: Do not break within emoji ZWJ sequences.
            if (left === 16 /* ZWJ */ && isExtendedPictographicAt(rightPos))
                continue;
            // WB3d: Keep horizontal whitespace together
            if (left === 4 /* WSegSpace */ && right == 4 /* WSegSpace */)
                continue;
            // WB4: Ignore format and extend characters
            // This is to keep grapheme clusters together!
            // See: Section 6.2: https://unicode.org/reports/tr29/#Grapheme_Cluster_and_Format_Rules
            // N.B.: The rule about "except after sot, CR, LF, and
            // Newline" already been by WB1, WB2, WB3a, and WB3b above.
            while (right === 13 /* Format */ ||
                right === 14 /* Extend */ ||
                right === 16 /* ZWJ */) {
                // Continue advancing in the string, as if these
                // characters do not exist. DO NOT update left and
                // lookbehind however!
                [rightPos, lookaheadPos] = [lookaheadPos, positionAfter(lookaheadPos)];
                [right, lookahead] = [lookahead, wordbreakPropertyAt(lookaheadPos)];
            }
            // In ignoring the characters in the previous loop, we could
            // have fallen off the end of the string, so end the loop
            // prematurely if that happens!
            if (right === 20 /* eot */) {
                yield rightPos;
                break;
            }
            // WB4 (continued): Lookahead must ALSO ignore these format,
            // extend, ZWJ characters!
            while (lookahead === 13 /* Format */ ||
                lookahead === 14 /* Extend */ ||
                lookahead === 16 /* ZWJ */) {
                // Continue advancing in the string, as if these
                // characters do not exist. DO NOT update left and right,
                // however!
                lookaheadPos = positionAfter(lookaheadPos);
                lookahead = wordbreakPropertyAt(lookaheadPos);
            }
            // WB5: Do not break between most letters.
            if (isAHLetter(left) && isAHLetter(right))
                continue;
            // Do not break across certain punctuation
            // WB6: (Don't break before apostrophes in contractions)
            if (isAHLetter(left) && isAHLetter(lookahead) &&
                (right === 10 /* MidLetter */ || isMidNumLetQ(right)))
                continue;
            // WB7: (Don't break after apostrophes in contractions)
            if (isAHLetter(lookbehind) && isAHLetter(right) &&
                (left === 10 /* MidLetter */ || isMidNumLetQ(left)))
                continue;
            // WB7a
            if (left === 15 /* Hebrew_Letter */ && right === 6 /* Single_Quote */)
                continue;
            // WB7b
            if (left === 15 /* Hebrew_Letter */ && right === 5 /* Double_Quote */ &&
                lookahead === 15 /* Hebrew_Letter */)
                continue;
            // WB7c
            if (lookbehind === 15 /* Hebrew_Letter */ && left === 5 /* Double_Quote */ &&
                right === 15 /* Hebrew_Letter */)
                continue;
            // Do not break within sequences of digits, or digits adjacent to letters.
            // e.g., "3a" or "A3"
            // WB8
            if (left === 9 /* Numeric */ && right === 9 /* Numeric */)
                continue;
            // WB9
            if (isAHLetter(left) && right === 9 /* Numeric */)
                continue;
            // WB10
            if (left === 9 /* Numeric */ && isAHLetter(right))
                continue;
            // Do not break within sequences, such as 3.2, 3,456.789
            // WB11
            if (lookbehind === 9 /* Numeric */ && right === 9 /* Numeric */ &&
                (left === 7 /* MidNum */ || isMidNumLetQ(left)))
                continue;
            // WB12
            if (left === 9 /* Numeric */ && lookahead === 9 /* Numeric */ &&
                (right === 7 /* MidNum */ || isMidNumLetQ(right)))
                continue;
            // WB13: Do not break between Katakana
            if (left === 17 /* Katakana */ && right === 17 /* Katakana */)
                continue;
            // Do not break from extenders (e.g., U+202F NARROW NO-BREAK SPACE)
            // WB13a
            if ((isAHLetter(left) ||
                left === 9 /* Numeric */ ||
                left === 17 /* Katakana */ ||
                left === 12 /* ExtendNumLet */) &&
                right === 12 /* ExtendNumLet */)
                continue;
            // WB13b
            if ((isAHLetter(right) ||
                right === 9 /* Numeric */ ||
                right === 17 /* Katakana */) && left === 12 /* ExtendNumLet */)
                continue;
            // WB15 & WB16:
            // Do not break within emoji flag sequences. That is, do not break between
            // regional indicator (RI) symbols if there is an odd number of RI
            // characters before the break point.
            if (right === 18 /* Regional_Indicator */) {
                // Emoji flags are actually composed of TWO scalar values, each being a
                // "regional indicator". These indicators correspond to Latin letters. Put
                // two of them together, and they spell out an ISO 3166-1-alpha-2 country
                // code. Since these always come in pairs, NEVER split the pairs! So, if
                // we happen to be inside the middle of an odd numbered of
                // Regional_Indicators, DON'T SPLIT IT!
                nConsecutiveRegionalIndicators += 1;
                if ((nConsecutiveRegionalIndicators % 2) == 1) {
                    continue;
                }
            }
            else {
                nConsecutiveRegionalIndicators = 0;
            }
            // WB999: Otherwise, break EVERYWHERE (including around ideographs)
            yield rightPos;
        } while (rightPos < text.length);
        ///// Internal utility functions /////
        /**
         * Returns the position of the start of the next scalar value. This jumps
         * over surrogate pairs.
         *
         * If asked for the character AFTER the end of the string, this always
         * returns the length of the string.
         */
        function positionAfter(pos) {
            if (pos >= text.length) {
                return text.length;
            }
            else if (isStartOfSurrogatePair(text[pos])) {
                return pos + 2;
            }
            return pos + 1;
        }
        /**
         * Return the value of the Word_Break property at the given string index.
         * @param pos position in the text.
         */
        function wordbreakPropertyAt(pos) {
            if (pos < 0) {
                return 19 /* sot */; // Always "start of string" before the string starts!
            }
            else if (pos >= text.length) {
                return 20 /* eot */; // Always "end of string" after the string ends!
            }
            else if (isStartOfSurrogatePair(text[pos])) {
                // Surrogate pairs the next TWO items from the string!
                return property(text[pos] + text[pos + 1]);
            }
            return property(text[pos]);
        }
        function isExtendedPictographicAt(pos) {
            return WordBreakProperty.extendedPictographic.test(text.substring(pos, pos + 2));
        }
        // Word_Break rule macros
        // See: https://unicode.org/reports/tr29/#WB_Rule_Macros
        function isAHLetter(prop) {
            return prop === 11 /* ALetter */ ||
                prop === 15 /* Hebrew_Letter */;
        }
        function isMidNumLetQ(prop) {
            return prop === 8 /* MidNumLet */ ||
                prop === 6 /* Single_Quote */;
        }
    }
    var findBoundaries_2 = findBoundaries;
    function isStartOfSurrogatePair(character) {
        let codeUnit = character.charCodeAt(0);
        return codeUnit >= 0xD800 && codeUnit <= 0xDBFF;
    }
    /**
     * Return the Word_Break property value for a character.
     * Note that
     * @param character a scalar value
     */
    function property(character) {
        // TODO: remove dependence on character.codepointAt()?
        let codepoint = character.codePointAt(0);
        return searchForProperty(codepoint, 0, WordBreakProperty.WORD_BREAK_PROPERTY.length - 1);
    }
    var property_1 = property;
    /**
     * Binary search for the word break property of a given CODE POINT.
     */
    function searchForProperty(codePoint, left, right) {
        // All items that are not found in the array are assigned the 'Other' property.
        if (right < left) {
            return 0 /* Other */;
        }
        let midpoint = left + ~~((right - left) / 2);
        let candidate = WordBreakProperty.WORD_BREAK_PROPERTY[midpoint];
        let nextRange = WordBreakProperty.WORD_BREAK_PROPERTY[midpoint + 1];
        let startOfNextRange = nextRange ? nextRange[0 /* Start */] : Infinity;
        if (codePoint < candidate[0 /* Start */]) {
            return searchForProperty(codePoint, left, midpoint - 1);
        }
        else if (codePoint >= startOfNextRange) {
            return searchForProperty(codePoint, midpoint + 1, right);
        }
        return candidate[1 /* Value */];
    }


    var findBoundaries_1 = /*#__PURE__*/Object.defineProperty({
    	findBoundaries: findBoundaries_2,
    	property: property_1
    }, '__esModule', {value: true});

    /*!
     * Copyright (c) 2019 Eddie Antonio Santos
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     */

    // See: https://unicode.org/reports/tr29/#Default_Word_Boundaries

    /**
     * Splits text by its word breaks. Any spans that are composed entirely of
     * whitespace will not be returned. Returns an array of strings.
     *
     * @param text Any valid USVString with words to split.
     */
    function split(text) {
        let spans = Array.from(findSpans(text));
        return spans.map(span => span.text).filter(isNonSpace);
    }
    var split_1 = split;
    /**
     * Generator that yields every successive span from the the text.
     * @param text Any valid USVString to segment.
     */
    function* findSpans(text) {
        // TODO: don't throw the boundaries into an array.
        let boundaries = Array.from(findBoundaries_1.findBoundaries(text));
        if (boundaries.length == 0) {
            return;
        }
        for (let i = 0; i < boundaries.length - 1; i++) {
            let start = boundaries[i];
            let end = boundaries[i + 1];
            yield new LazySpan(text, start, end);
        }
    }
    var findSpans_1 = findSpans;
    /**
     * A span that does not cut out the substring until it absolutely has to!
     */
    class LazySpan {
        constructor(source, start, end) {
            this._source = source;
            this.start = start;
            this.end = end;
        }
        get text() {
            return this._source.substring(this.start, this.end);
        }
        get length() {
            return this.end - this.start;
        }
    }
    /**
     * Returns true when the chunk does not solely consiste of whitespace.
     *
     * @param chunk a chunk of text. Starts and ends at word boundaries.
     */
    function isNonSpace(chunk) {
        return !Array.from(chunk).map(findBoundaries_1.property).every(wb => (wb === 3 /* CR */ ||
            wb === 1 /* LF */ ||
            wb === 2 /* Newline */ ||
            wb === 4 /* WSegSpace */));
    }

    function tokenize(s) {
        return split_1(s).filter(onlyWordsFilter);
    }
    function tokenizeSpans(s) {
        return findSpans_1(s);
    }
    var notWords = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
    function onlyWordsFilter(s) {
        if (notWords.includes(s)) {
            return false;
        }
        return true;
    }

    var porter = createCommonjsModule(function (module, exports) {
    // Porter stemmer in Javascript. Few comments, but it's easy to follow against
    // the rules in the original paper, in
    //
    //  Porter, 1980, An algorithm for suffix stripping, Program, Vol. 14, no. 3,
    //  pp 130-137,
    //
    // see also http://www.tartarus.org/~martin/PorterStemmer

    // Release 1 be 'andargor', Jul 2004
    // Release 2 (substantially revised) by Christopher McKenzie, Aug 2009
    //
    // CommonJS tweak by jedp

    (function() {
      var step2list = {
          "ational" : "ate",
          "tional" : "tion",
          "enci" : "ence",
          "anci" : "ance",
          "izer" : "ize",
          "bli" : "ble",
          "alli" : "al",
          "entli" : "ent",
          "eli" : "e",
          "ousli" : "ous",
          "ization" : "ize",
          "ation" : "ate",
          "ator" : "ate",
          "alism" : "al",
          "iveness" : "ive",
          "fulness" : "ful",
          "ousness" : "ous",
          "aliti" : "al",
          "iviti" : "ive",
          "biliti" : "ble",
          "logi" : "log"
        };

      var step3list = {
          "icate" : "ic",
          "ative" : "",
          "alize" : "al",
          "iciti" : "ic",
          "ical" : "ic",
          "ful" : "",
          "ness" : ""
        };

      var c = "[^aeiou]";          // consonant
      var v = "[aeiouy]";          // vowel
      var C = c + "[^aeiouy]*";    // consonant sequence
      var V = v + "[aeiou]*";      // vowel sequence

      var mgr0 = "^(" + C + ")?" + V + C;               // [C]VC... is m>0
      var meq1 = "^(" + C + ")?" + V + C + "(" + V + ")?$";  // [C]VC[V] is m=1
      var mgr1 = "^(" + C + ")?" + V + C + V + C;       // [C]VCVC... is m>1
      var s_v = "^(" + C + ")?" + v;                   // vowel in stem

      function stemmer(w) {
        var stem;
        var suffix;
        var firstch;
        var re;
        var re2;
        var re3;
        var re4;

        if (w.length < 3) { return w; }

        firstch = w.substr(0,1);
        if (firstch == "y") {
          w = firstch.toUpperCase() + w.substr(1);
        }

        // Step 1a
        re = /^(.+?)(ss|i)es$/;
        re2 = /^(.+?)([^s])s$/;

        if (re.test(w)) { w = w.replace(re,"$1$2"); }
        else if (re2.test(w)) {  w = w.replace(re2,"$1$2"); }

        // Step 1b
        re = /^(.+?)eed$/;
        re2 = /^(.+?)(ed|ing)$/;
        if (re.test(w)) {
          var fp = re.exec(w);
          re = new RegExp(mgr0);
          if (re.test(fp[1])) {
            re = /.$/;
            w = w.replace(re,"");
          }
        } else if (re2.test(w)) {
          var fp = re2.exec(w);
          stem = fp[1];
          re2 = new RegExp(s_v);
          if (re2.test(stem)) {
            w = stem;
            re2 = /(at|bl|iz)$/;
            re3 = new RegExp("([^aeiouylsz])\\1$");
            re4 = new RegExp("^" + C + v + "[^aeiouwxy]$");
            if (re2.test(w)) { w = w + "e"; }
            else if (re3.test(w)) { re = /.$/; w = w.replace(re,""); }
            else if (re4.test(w)) { w = w + "e"; }
          }
        }

        // Step 1c
        re = /^(.+?)y$/;
        if (re.test(w)) {
          var fp = re.exec(w);
          stem = fp[1];
          re = new RegExp(s_v);
          if (re.test(stem)) { w = stem + "i"; }
        }

        // Step 2
        re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
        if (re.test(w)) {
          var fp = re.exec(w);
          stem = fp[1];
          suffix = fp[2];
          re = new RegExp(mgr0);
          if (re.test(stem)) {
            w = stem + step2list[suffix];
          }
        }

        // Step 3
        re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
        if (re.test(w)) {
          var fp = re.exec(w);
          stem = fp[1];
          suffix = fp[2];
          re = new RegExp(mgr0);
          if (re.test(stem)) {
            w = stem + step3list[suffix];
          }
        }

        // Step 4
        re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
        re2 = /^(.+?)(s|t)(ion)$/;
        if (re.test(w)) {
          var fp = re.exec(w);
          stem = fp[1];
          re = new RegExp(mgr1);
          if (re.test(stem)) {
            w = stem;
          }
        } else if (re2.test(w)) {
          var fp = re2.exec(w);
          stem = fp[1] + fp[2];
          re2 = new RegExp(mgr1);
          if (re2.test(stem)) {
            w = stem;
          }
        }

        // Step 5
        re = /^(.+?)e$/;
        if (re.test(w)) {
          var fp = re.exec(w);
          stem = fp[1];
          re = new RegExp(mgr1);
          re2 = new RegExp(meq1);
          re3 = new RegExp("^" + C + v + "[^aeiouwxy]$");
          if (re.test(stem) || (re2.test(stem) && !(re3.test(stem)))) {
            w = stem;
          }
        }

        re = /ll$/;
        re2 = new RegExp(mgr1);
        if (re.test(w) && re2.test(w)) {
          re = /.$/;
          w = w.replace(re,"");
        }

        // and turn initial Y back to y

        if (firstch == "y") {
          w = firstch.toLowerCase() + w.substr(1);
        }

        return w;
      }

      // memoize at the module level
      var memo = {};
      var memoizingStemmer = function(w) {
        if (!memo[w]) {
          memo[w] = stemmer(w);
        }
        return memo[w];
      };

      if (exports != null) {
        exports.stemmer = stemmer;
        exports.memoizingStemmer = memoizingStemmer;
      }

    })();
    });

    var stemmer = porter.stemmer;
    function stem(word) {
        return stemmer(word.toLowerCase());
    }

    function percentEncode(str) {
        // RFC 3986
        return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
            return "%" + c.charCodeAt(0).toString(16);
        });
    }

    var TermFetcher = /** @class */ (function () {
        function TermFetcher(requestManager, wordUrlPrefix, lruSize) {
            if (lruSize === void 0) { lruSize = 20; }
            this.requestManager = requestManager;
            this.wordUrlPrefix = wordUrlPrefix;
            this.termResultsLru = new LRU(lruSize);
        }
        TermFetcher.prototype.getSearchResults = function (termsQuery, maxNum) {
            if (maxNum === void 0) { maxNum = 10; }
            return __awaiter(this, void 0, void 0, function () {
                var stemmedQuery, _loop_1, _i, termsQuery_1, _a, term, weight, fallbackTerm, allResults;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stemmedQuery = [];
                            _loop_1 = function (term, weight, fallbackTerm) {
                                var stemmed = stem(term);
                                var stemmedFb = fallbackTerm && stem(fallbackTerm);
                                var current = stemmedQuery.find(function (x) { return x.term === stemmed; });
                                if (current) {
                                    current.weight = Math.max(weight, current.weight);
                                }
                                else {
                                    stemmedQuery.push({ term: stemmed, fallbackTerm: stemmedFb, weight: weight });
                                }
                            };
                            for (_i = 0, termsQuery_1 = termsQuery; _i < termsQuery_1.length; _i++) {
                                _a = termsQuery_1[_i], term = _a.term, weight = _a.weight, fallbackTerm = _a.fallbackTerm;
                                _loop_1(term, weight, fallbackTerm);
                            }
                            return [4 /*yield*/, Promise.allSettled(stemmedQuery.map(function (_a) {
                                    var term = _a.term, fallbackTerm = _a.fallbackTerm;
                                    return Promise.allSettled([
                                        _this.termResultsLru.get(term, function () { return _this.fetchTermResults(term); }),
                                        fallbackTerm
                                            ? _this.termResultsLru.get(fallbackTerm, function () {
                                                return _this.fetchTermResults(fallbackTerm);
                                            })
                                            : Promise.reject(),
                                    ]);
                                })).then(function (res) {
                                    return res.flatMap(function (p, i) {
                                        if (p.status === "rejected") {
                                            //TODO: handle rejections?
                                            return [];
                                        }
                                        var _a = p.value, termProm = _a[0], fallbackTermProm = _a[1];
                                        if (termProm.status === "rejected" &&
                                            fallbackTermProm.status === "rejected") {
                                            //TODO: handle rejections?
                                            return [];
                                        }
                                        var weight = stemmedQuery[i].weight;
                                        var termResults;
                                        if (termProm.status !== "rejected") {
                                            termResults = termProm.value;
                                        }
                                        else if (fallbackTermProm.status !== "rejected") {
                                            termResults = fallbackTermProm.value;
                                            weight *= 0.5;
                                        }
                                        return termResults.map(function (x) { return (__assign(__assign({}, x), { score: x.score * weight })); });
                                    });
                                })];
                        case 1:
                            allResults = _b.sent();
                            return [2 /*return*/, this.joinTermsScores(allResults).slice(0, maxNum)];
                    }
                });
            });
        };
        TermFetcher.prototype.joinTermsScores = function (termsRes) {
            var byId = {};
            var ret = [];
            for (var _i = 0, termsRes_1 = termsRes; _i < termsRes_1.length; _i++) {
                var res = termsRes_1[_i];
                if (byId[res.docId]) {
                    var current = byId[res.docId];
                    current.score += res.score;
                    current.terms = Array.from(new Set(__spreadArray(__spreadArray([], res.terms), current.terms)));
                    // current.highlights = this.joinHighlights(
                    //   current.highlights,
                    //   res.highlights
                    // );
                }
                else {
                    var clone = __assign({}, res);
                    ret.push(clone);
                    byId[res.docId] = clone;
                }
            }
            return ret.sort(function (a, b) { return b.score - a.score; });
        };
        // protected joinHighlights(
        //   highlightsOld: Highlight[],
        //   highlightsNew: Highlight[]
        // ): Highlight[] {
        //   const byField: Record<string, Highlight[]> = {};
        //   const ret: Highlight[] = [];
        //   for (const hl of [...highlightsOld, ...highlightsNew]) {
        //     byField[hl.field] = byField[hl.field] || [];
        //     byField[hl.field].push(hl);
        //   }
        //   for (const field of Object.keys(byField)) {
        //     const fieldHighlights = byField[field];
        //     fieldHighlights.sort((a, b) => a.from - b.from);
        //     let mergedHl = byField[field][0];
        //     for (const hl of fieldHighlights.slice(1)) {
        //       if (hl.from > mergedHl.to + 1) {
        //         ret.push(mergedHl);
        //         mergedHl = hl;
        //       } else {
        //         mergedHl = this.mergeOverlappingHighlights(mergedHl, hl);
        //       }
        //     }
        //     ret.push(mergedHl);
        //   }
        //   return ret.sort(
        //     (a, b) =>
        //       b.terms.reduce((acum, x) => acum + x.score, 0) -
        //       a.terms.reduce((acum, x) => acum + x.score, 0)
        //   );
        // }
        // protected mergeOverlappingHighlights(
        //   startingFirst: Highlight,
        //   startingSecond: Highlight
        // ): Highlight {
        //   // TODO unicode tokenization
        //   if (
        //     startingFirst.from === -1 ||
        //     startingFirst.to === -1 ||
        //     startingSecond.from === -1 ||
        //     startingSecond.to === -1
        //   ) {
        //     // edgecase - no token indices were found, possibly a one word title
        //     return startingFirst;
        //   }
        //   const toEmph = (startingFirst.txt + startingSecond.txt)
        //     .match(/<em>([^<]+)<\/em>/g)
        //     .map((x) => x.slice(4, -5));
        //   const txt1 = startingFirst.txt.replace(/<\/?em>/g, " ");
        //   const txt2 = startingSecond.txt.replace(/<\/?em>/g, " ");
        //   let tokens = txt1.split(" ").filter((x) => x !== "");
        //   if (startingSecond.to > startingFirst.to) {
        //     tokens = tokens.concat(
        //       txt2
        //         .split(" ")
        //         .filter((x) => x !== "")
        //         .slice(startingFirst.to - startingSecond.from + 1)
        //     );
        //   }
        //   const fullText = tokens
        //     .map((t) => (toEmph.includes(t) ? `<em>${t}</em>` : t))
        //     .join(" ")
        //     .replace(/<\/em> ([.,!])/g, "</em>$1");
        //   return {
        //     txt: fullText,
        //     field: startingFirst.field,
        //     from: startingFirst.from,
        //     to: Math.max(startingFirst.to, startingSecond.to),
        //     terms: [...startingFirst.terms, ...startingSecond.terms],
        //   };
        // }
        TermFetcher.prototype.fetchTermResults = function (term) {
            return __awaiter(this, void 0, void 0, function () {
                var percentEncoded, res;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            percentEncoded = percentEncode(term);
                            return [4 /*yield*/, this.requestManager.getJson(this.wordUrlPrefix + "/" + percentEncoded + ".json", {})];
                        case 1:
                            res = _a.sent();
                            return [2 /*return*/, res.map(function (r) {
                                    return ({
                                        docId: r["id"],
                                        score: r["sc"],
                                        title: r["ti"],
                                        terms: [term],
                                        // highlights: r["hl"].map(
                                        //   (hl) =>
                                        //     <Highlight>{
                                        //       txt: hl["txt"],
                                        //       terms: [{ term, score: r["sc"] }],
                                        //       from: hl["from"],
                                        //       to: hl["to"],
                                        //       field: hl["f"],
                                        //     }
                                        // ),
                                    });
                                })];
                    }
                });
            });
        };
        return TermFetcher;
    }());

    /**
     * Helpers.
     */
    var s = 1000;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;

    /**
     * Parse or format the given `val`.
     *
     * Options:
     *
     *  - `long` verbose formatting [false]
     *
     * @param {String|Number} val
     * @param {Object} [options]
     * @throws {Error} throw an error if val is not a non-empty string or a number
     * @return {String|Number}
     * @api public
     */

    var ms = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === 'string' && val.length > 0) {
        return parse(val);
      } else if (type === 'number' && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        'val is not a non-empty string or a valid number. val=' +
          JSON.stringify(val)
      );
    };

    /**
     * Parse the given `str` and return milliseconds.
     *
     * @param {String} str
     * @return {Number}
     * @api private
     */

    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || 'ms').toLowerCase();
      switch (type) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
          return n * y;
        case 'weeks':
        case 'week':
        case 'w':
          return n * w;
        case 'days':
        case 'day':
        case 'd':
          return n * d;
        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
          return n * h;
        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
          return n * m;
        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
          return n * s;
        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
          return n;
        default:
          return undefined;
      }
    }

    /**
     * Short format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + 'd';
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + 'h';
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + 'm';
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + 's';
      }
      return ms + 'ms';
    }

    /**
     * Long format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, 'day');
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, 'hour');
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, 'minute');
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, 'second');
      }
      return ms + ' ms';
    }

    /**
     * Pluralization helper.
     */

    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
    }

    /**
     * This is the common logic for both the Node.js and web browser
     * implementations of `debug()`.
     */

    function setup(env) {
    	createDebug.debug = createDebug;
    	createDebug.default = createDebug;
    	createDebug.coerce = coerce;
    	createDebug.disable = disable;
    	createDebug.enable = enable;
    	createDebug.enabled = enabled;
    	createDebug.humanize = ms;
    	createDebug.destroy = destroy;

    	Object.keys(env).forEach(key => {
    		createDebug[key] = env[key];
    	});

    	/**
    	* The currently active debug mode names, and names to skip.
    	*/

    	createDebug.names = [];
    	createDebug.skips = [];

    	/**
    	* Map of special "%n" handling functions, for the debug "format" argument.
    	*
    	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
    	*/
    	createDebug.formatters = {};

    	/**
    	* Selects a color for a debug namespace
    	* @param {String} namespace The namespace string for the for the debug instance to be colored
    	* @return {Number|String} An ANSI color code for the given namespace
    	* @api private
    	*/
    	function selectColor(namespace) {
    		let hash = 0;

    		for (let i = 0; i < namespace.length; i++) {
    			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
    			hash |= 0; // Convert to 32bit integer
    		}

    		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    	}
    	createDebug.selectColor = selectColor;

    	/**
    	* Create a debugger with the given `namespace`.
    	*
    	* @param {String} namespace
    	* @return {Function}
    	* @api public
    	*/
    	function createDebug(namespace) {
    		let prevTime;
    		let enableOverride = null;

    		function debug(...args) {
    			// Disabled?
    			if (!debug.enabled) {
    				return;
    			}

    			const self = debug;

    			// Set `diff` timestamp
    			const curr = Number(new Date());
    			const ms = curr - (prevTime || curr);
    			self.diff = ms;
    			self.prev = prevTime;
    			self.curr = curr;
    			prevTime = curr;

    			args[0] = createDebug.coerce(args[0]);

    			if (typeof args[0] !== 'string') {
    				// Anything else let's inspect with %O
    				args.unshift('%O');
    			}

    			// Apply any `formatters` transformations
    			let index = 0;
    			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
    				// If we encounter an escaped % then don't increase the array index
    				if (match === '%%') {
    					return '%';
    				}
    				index++;
    				const formatter = createDebug.formatters[format];
    				if (typeof formatter === 'function') {
    					const val = args[index];
    					match = formatter.call(self, val);

    					// Now we need to remove `args[index]` since it's inlined in the `format`
    					args.splice(index, 1);
    					index--;
    				}
    				return match;
    			});

    			// Apply env-specific formatting (colors, etc.)
    			createDebug.formatArgs.call(self, args);

    			const logFn = self.log || createDebug.log;
    			logFn.apply(self, args);
    		}

    		debug.namespace = namespace;
    		debug.useColors = createDebug.useColors();
    		debug.color = createDebug.selectColor(namespace);
    		debug.extend = extend;
    		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

    		Object.defineProperty(debug, 'enabled', {
    			enumerable: true,
    			configurable: false,
    			get: () => enableOverride === null ? createDebug.enabled(namespace) : enableOverride,
    			set: v => {
    				enableOverride = v;
    			}
    		});

    		// Env-specific initialization logic for debug instances
    		if (typeof createDebug.init === 'function') {
    			createDebug.init(debug);
    		}

    		return debug;
    	}

    	function extend(namespace, delimiter) {
    		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
    		newDebug.log = this.log;
    		return newDebug;
    	}

    	/**
    	* Enables a debug mode by namespaces. This can include modes
    	* separated by a colon and wildcards.
    	*
    	* @param {String} namespaces
    	* @api public
    	*/
    	function enable(namespaces) {
    		createDebug.save(namespaces);

    		createDebug.names = [];
    		createDebug.skips = [];

    		let i;
    		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
    		const len = split.length;

    		for (i = 0; i < len; i++) {
    			if (!split[i]) {
    				// ignore empty strings
    				continue;
    			}

    			namespaces = split[i].replace(/\*/g, '.*?');

    			if (namespaces[0] === '-') {
    				createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    			} else {
    				createDebug.names.push(new RegExp('^' + namespaces + '$'));
    			}
    		}
    	}

    	/**
    	* Disable debug output.
    	*
    	* @return {String} namespaces
    	* @api public
    	*/
    	function disable() {
    		const namespaces = [
    			...createDebug.names.map(toNamespace),
    			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
    		].join(',');
    		createDebug.enable('');
    		return namespaces;
    	}

    	/**
    	* Returns true if the given mode name is enabled, false otherwise.
    	*
    	* @param {String} name
    	* @return {Boolean}
    	* @api public
    	*/
    	function enabled(name) {
    		if (name[name.length - 1] === '*') {
    			return true;
    		}

    		let i;
    		let len;

    		for (i = 0, len = createDebug.skips.length; i < len; i++) {
    			if (createDebug.skips[i].test(name)) {
    				return false;
    			}
    		}

    		for (i = 0, len = createDebug.names.length; i < len; i++) {
    			if (createDebug.names[i].test(name)) {
    				return true;
    			}
    		}

    		return false;
    	}

    	/**
    	* Convert regexp to namespace
    	*
    	* @param {RegExp} regxep
    	* @return {String} namespace
    	* @api private
    	*/
    	function toNamespace(regexp) {
    		return regexp.toString()
    			.substring(2, regexp.toString().length - 2)
    			.replace(/\.\*\?$/, '*');
    	}

    	/**
    	* Coerce `val`.
    	*
    	* @param {Mixed} val
    	* @return {Mixed}
    	* @api private
    	*/
    	function coerce(val) {
    		if (val instanceof Error) {
    			return val.stack || val.message;
    		}
    		return val;
    	}

    	/**
    	* XXX DO NOT USE. This is a temporary stub function.
    	* XXX It WILL be removed in the next major release.
    	*/
    	function destroy() {
    		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
    	}

    	createDebug.enable(createDebug.load());

    	return createDebug;
    }

    var common = setup;

    /* eslint-env browser */

    var browser = createCommonjsModule(function (module, exports) {
    /**
     * This is the web browser implementation of `debug()`.
     */

    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = (() => {
    	let warned = false;

    	return () => {
    		if (!warned) {
    			warned = true;
    			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
    		}
    	};
    })();

    /**
     * Colors.
     */

    exports.colors = [
    	'#0000CC',
    	'#0000FF',
    	'#0033CC',
    	'#0033FF',
    	'#0066CC',
    	'#0066FF',
    	'#0099CC',
    	'#0099FF',
    	'#00CC00',
    	'#00CC33',
    	'#00CC66',
    	'#00CC99',
    	'#00CCCC',
    	'#00CCFF',
    	'#3300CC',
    	'#3300FF',
    	'#3333CC',
    	'#3333FF',
    	'#3366CC',
    	'#3366FF',
    	'#3399CC',
    	'#3399FF',
    	'#33CC00',
    	'#33CC33',
    	'#33CC66',
    	'#33CC99',
    	'#33CCCC',
    	'#33CCFF',
    	'#6600CC',
    	'#6600FF',
    	'#6633CC',
    	'#6633FF',
    	'#66CC00',
    	'#66CC33',
    	'#9900CC',
    	'#9900FF',
    	'#9933CC',
    	'#9933FF',
    	'#99CC00',
    	'#99CC33',
    	'#CC0000',
    	'#CC0033',
    	'#CC0066',
    	'#CC0099',
    	'#CC00CC',
    	'#CC00FF',
    	'#CC3300',
    	'#CC3333',
    	'#CC3366',
    	'#CC3399',
    	'#CC33CC',
    	'#CC33FF',
    	'#CC6600',
    	'#CC6633',
    	'#CC9900',
    	'#CC9933',
    	'#CCCC00',
    	'#CCCC33',
    	'#FF0000',
    	'#FF0033',
    	'#FF0066',
    	'#FF0099',
    	'#FF00CC',
    	'#FF00FF',
    	'#FF3300',
    	'#FF3333',
    	'#FF3366',
    	'#FF3399',
    	'#FF33CC',
    	'#FF33FF',
    	'#FF6600',
    	'#FF6633',
    	'#FF9900',
    	'#FF9933',
    	'#FFCC00',
    	'#FFCC33'
    ];

    /**
     * Currently only WebKit-based Web Inspectors, Firefox >= v31,
     * and the Firebug extension (any Firefox version) are known
     * to support "%c" CSS customizations.
     *
     * TODO: add a `localStorage` variable to explicitly enable/disable colors
     */

    // eslint-disable-next-line complexity
    function useColors() {
    	// NB: In an Electron preload script, document will be defined but not fully
    	// initialized. Since we know we're in Chrome, we'll just detect this case
    	// explicitly
    	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
    		return true;
    	}

    	// Internet Explorer and Edge do not support colors.
    	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    		return false;
    	}

    	// Is webkit? http://stackoverflow.com/a/16459606/376773
    	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
    	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    		// Is firebug? http://stackoverflow.com/a/398120/376773
    		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    		// Is firefox >= v31?
    		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    		// Double check webkit in userAgent just in case we are in a worker
    		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
    }

    /**
     * Colorize log arguments if enabled.
     *
     * @api public
     */

    function formatArgs(args) {
    	args[0] = (this.useColors ? '%c' : '') +
    		this.namespace +
    		(this.useColors ? ' %c' : ' ') +
    		args[0] +
    		(this.useColors ? '%c ' : ' ') +
    		'+' + module.exports.humanize(this.diff);

    	if (!this.useColors) {
    		return;
    	}

    	const c = 'color: ' + this.color;
    	args.splice(1, 0, c, 'color: inherit');

    	// The final "%c" is somewhat tricky, because there could be other
    	// arguments passed either before or after the %c, so we need to
    	// figure out the correct index to insert the CSS into
    	let index = 0;
    	let lastC = 0;
    	args[0].replace(/%[a-zA-Z%]/g, match => {
    		if (match === '%%') {
    			return;
    		}
    		index++;
    		if (match === '%c') {
    			// We only are interested in the *last* %c
    			// (the user may have provided their own)
    			lastC = index;
    		}
    	});

    	args.splice(lastC, 0, c);
    }

    /**
     * Invokes `console.debug()` when available.
     * No-op when `console.debug` is not a "function".
     * If `console.debug` is not available, falls back
     * to `console.log`.
     *
     * @api public
     */
    exports.log = console.debug || console.log || (() => {});

    /**
     * Save `namespaces`.
     *
     * @param {String} namespaces
     * @api private
     */
    function save(namespaces) {
    	try {
    		if (namespaces) {
    			exports.storage.setItem('debug', namespaces);
    		} else {
    			exports.storage.removeItem('debug');
    		}
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}
    }

    /**
     * Load `namespaces`.
     *
     * @return {String} returns the previously persisted debug modes
     * @api private
     */
    function load() {
    	let r;
    	try {
    		r = exports.storage.getItem('debug');
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}

    	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
    	if (!r && typeof process !== 'undefined' && 'env' in process) {
    		r = process.env.DEBUG;
    	}

    	return r;
    }

    /**
     * Localstorage attempts to return the localstorage.
     *
     * This is necessary because safari throws
     * when a user disables cookies/localstorage
     * and you attempt to access it.
     *
     * @return {LocalStorage}
     * @api private
     */

    function localstorage() {
    	try {
    		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
    		// The Browser also has localStorage in the global context.
    		return localStorage;
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}
    }

    module.exports = common(exports);

    const {formatters} = module.exports;

    /**
     * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
     */

    formatters.j = function (v) {
    	try {
    		return JSON.stringify(v);
    	} catch (error) {
    		return '[UnexpectedJSONParseError]: ' + error.message;
    	}
    };
    });

    var debug = browser("SP");
    /**
     *
     */
    var SearchProvider = /** @class */ (function () {
        function SearchProvider(termResultsUrl, frequentVocabUrl, prefixVocabUrl, version, overrideRequestManager) {
            this.requestManager =
                overrideRequestManager !== null && overrideRequestManager !== void 0 ? overrideRequestManager : new RequestManagerImp(version);
            this.fuzzyProvider = new FuzzyVocabProvider(this.requestManager, prefixVocabUrl, frequentVocabUrl, 3, 10);
            this.termFetcher = new TermFetcher(this.requestManager, termResultsUrl, 10);
        }
        SearchProvider.prototype.getCompletionsForPrefix = function (pref) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.fuzzyProvider
                            .getCompletionsForWord(pref)
                            .catch(function (e) {
                            debug(e);
                            return [];
                        })];
                });
            });
        };
        SearchProvider.prototype.doSearch = function (query, maxNum /*, location in string?*/) {
            if (maxNum === void 0) { maxNum = 10; }
            return __awaiter(this, void 0, void 0, function () {
                var termsRaw, suggestions;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            termsRaw = tokenize(query);
                            return [4 /*yield*/, Promise.all(termsRaw.map(function (x) { return _this.getCompletionsForPrefix(x); }))];
                        case 1:
                            suggestions = _a.sent();
                            return [2 /*return*/, this.termFetcher.getSearchResults(suggestions.map(function (sug, i) {
                                    var _a;
                                    return ({
                                        term: termsRaw[i],
                                        fallbackTerm: (_a = sug[0]) === null || _a === void 0 ? void 0 : _a.word,
                                        weight: 1,
                                    });
                                }), maxNum)];
                    }
                });
            });
        };
        return SearchProvider;
    }());

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/WikiItem.svelte generated by Svelte v3.37.0 */

    const { Object: Object_1 } = globals;
    const file$3 = "src/WikiItem.svelte";

    // (1:0) <script lang="ts">import { onDestroy }
    function create_catch_block$1(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$1.name,
    		type: "catch",
    		source: "(1:0) <script lang=\\\"ts\\\">import { onDestroy }",
    		ctx
    	});

    	return block;
    }

    // (55:4) {:then res}
    function create_then_block$1(ctx) {
    	let html_tag;

    	let raw_value = (/*res*/ ctx[9]
    	? /*doHighlight*/ ctx[3](/*res*/ ctx[9])
    	: "") + "";

    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*contentPromise*/ 2 && raw_value !== (raw_value = (/*res*/ ctx[9]
    			? /*doHighlight*/ ctx[3](/*res*/ ctx[9])
    			: "") + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$1.name,
    		type: "then",
    		source: "(55:4) {:then res}",
    		ctx
    	});

    	return block;
    }

    // (48:27)        <div class="lds-ellipsis">         <div />         <div />         <div />         <div />       </div>     {:then res}
    function create_pending_block$1(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = space();
    			div3 = element("div");
    			attr_dev(div0, "class", "svelte-7m7wtp");
    			add_location(div0, file$3, 49, 8, 1935);
    			attr_dev(div1, "class", "svelte-7m7wtp");
    			add_location(div1, file$3, 50, 8, 1951);
    			attr_dev(div2, "class", "svelte-7m7wtp");
    			add_location(div2, file$3, 51, 8, 1967);
    			attr_dev(div3, "class", "svelte-7m7wtp");
    			add_location(div3, file$3, 52, 8, 1983);
    			attr_dev(div4, "class", "lds-ellipsis svelte-7m7wtp");
    			add_location(div4, file$3, 48, 6, 1900);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$1.name,
    		type: "pending",
    		source: "(48:27)        <div class=\\\"lds-ellipsis\\\">         <div />         <div />         <div />         <div />       </div>     {:then res}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let raw_value = /*doHighlight*/ ctx[3](/*title*/ ctx[0]) + "";
    	let t;
    	let div1;
    	let promise;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block$1,
    		then: create_then_block$1,
    		catch: create_catch_block$1,
    		value: 9
    	};

    	handle_promise(promise = /*contentPromise*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			info.block.c();
    			attr_dev(div0, "class", "title svelte-7m7wtp");
    			add_location(div0, file$3, 45, 2, 1793);
    			attr_dev(div1, "class", "info svelte-7m7wtp");
    			add_location(div1, file$3, 46, 2, 1847);
    			attr_dev(div2, "class", "item svelte-7m7wtp");
    			add_location(div2, file$3, 44, 0, 1739);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			div0.innerHTML = raw_value;
    			append_dev(div2, t);
    			append_dev(div2, div1);
    			info.block.m(div1, info.anchor = null);
    			info.mount = () => div1;
    			info.anchor = null;

    			if (!mounted) {
    				dispose = listen_dev(div2, "click", /*click_handler*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*title*/ 1 && raw_value !== (raw_value = /*doHighlight*/ ctx[3](/*title*/ ctx[0]) + "")) div0.innerHTML = raw_value;			info.ctx = ctx;

    			if (dirty & /*contentPromise*/ 2 && promise !== (promise = /*contentPromise*/ ctx[1]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[9] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			info.block.d();
    			info.token = null;
    			info = null;
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const canceledMessage = "$OP_CANCELED";

    function instance$3($$self, $$props, $$invalidate) {
    	let contentPromise;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("WikiItem", slots, []);
    	let { title } = $$props;
    	let { docId } = $$props;
    	let { getText } = $$props;
    	let { highlightTerms = [] } = $$props;
    	const cancelTokenSource = axios.CancelToken.source();
    	const dispatch = createEventDispatcher();

    	function doHighlight(txt) {
    		const tokenized = [...tokenizeSpans(txt)];

    		return tokenized.map(x => highlightTerms.includes(stem(x.text))
    		? `<b>${x.text}</b>`
    		: x.text).join("");
    	}

    	onDestroy(() => cancelTokenSource.cancel(canceledMessage));
    	const writable_props = ["title", "docId", "getText", "highlightTerms"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WikiItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch("click");

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("docId" in $$props) $$invalidate(4, docId = $$props.docId);
    		if ("getText" in $$props) $$invalidate(5, getText = $$props.getText);
    		if ("highlightTerms" in $$props) $$invalidate(6, highlightTerms = $$props.highlightTerms);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		createEventDispatcher,
    		axios,
    		stem,
    		tokenizeSpans,
    		title,
    		docId,
    		getText,
    		highlightTerms,
    		canceledMessage,
    		cancelTokenSource,
    		dispatch,
    		doHighlight,
    		contentPromise
    	});

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("docId" in $$props) $$invalidate(4, docId = $$props.docId);
    		if ("getText" in $$props) $$invalidate(5, getText = $$props.getText);
    		if ("highlightTerms" in $$props) $$invalidate(6, highlightTerms = $$props.highlightTerms);
    		if ("contentPromise" in $$props) $$invalidate(1, contentPromise = $$props.contentPromise);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*getText, docId*/ 48) {
    			$$invalidate(1, contentPromise = !getText
    			? Promise.resolve("")
    			: axios.get("https://en.wikibooks.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&origin=*&redirects=1&pageids=" + docId, {
    					headers: {
    						"Content-Type": "application/json; charset=UTF-8"
    					},
    					cancelToken: cancelTokenSource.token
    				}).then(res => {
    					var _a, _b, _c;

    					const pages = (_b = (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0
    					? void 0
    					: _a.query) === null || _b === void 0
    					? void 0
    					: _b.pages;

    					if (pages && Object.values(pages).length) {
    						const extract = (_c = Object.values(pages)[0]) === null || _c === void 0
    						? void 0
    						: _c.extract;

    						return extract.replace(/^\s*Cookbook[^\n]*/, "").trim();
    					}

    					return "";
    				}).catch(err => {
    					if ((err === null || err === void 0 ? void 0 : err.message) === canceledMessage) {
    						return;
    					}

    					throw err;
    				}));
    		}
    	};

    	return [
    		title,
    		contentPromise,
    		dispatch,
    		doHighlight,
    		docId,
    		getText,
    		highlightTerms,
    		click_handler
    	];
    }

    class WikiItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			title: 0,
    			docId: 4,
    			getText: 5,
    			highlightTerms: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WikiItem",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !("title" in props)) {
    			console.warn("<WikiItem> was created without expected prop 'title'");
    		}

    		if (/*docId*/ ctx[4] === undefined && !("docId" in props)) {
    			console.warn("<WikiItem> was created without expected prop 'docId'");
    		}

    		if (/*getText*/ ctx[5] === undefined && !("getText" in props)) {
    			console.warn("<WikiItem> was created without expected prop 'getText'");
    		}
    	}

    	get title() {
    		throw new Error("<WikiItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<WikiItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get docId() {
    		throw new Error("<WikiItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set docId(value) {
    		throw new Error("<WikiItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getText() {
    		throw new Error("<WikiItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getText(value) {
    		throw new Error("<WikiItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get highlightTerms() {
    		throw new Error("<WikiItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set highlightTerms(value) {
    		throw new Error("<WikiItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/AutoCompBox.svelte generated by Svelte v3.37.0 */
    const file$2 = "src/AutoCompBox.svelte";

    // (87:2) {:else}
    function create_else_block(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "spellcheck", "true");
    			attr_dev(input, "class", "svelte-1mon1qz");
    			add_location(input, file$2, 87, 4, 3053);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*inputChanged*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(87:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (70:2) {#if contentEditableSupport}
    function create_if_block$1(ctx) {
    	let t;
    	let div;
    	let mounted;
    	let dispose;
    	let if_block = /*showAutcomp*/ ctx[2] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			div = element("div");
    			attr_dev(div, "contenteditable", "true");
    			attr_dev(div, "class", "inputlike svelte-1mon1qz");
    			attr_dev(div, "spellcheck", "true");
    			add_location(div, file$2, 78, 4, 2866);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[8](div);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "input", /*inputChanged*/ ctx[5], false, false, false),
    					listen_dev(div, "keydown", /*keydown*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*showAutcomp*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[8](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(70:2) {#if contentEditableSupport}",
    		ctx
    	});

    	return block;
    }

    // (71:4) {#if showAutcomp}
    function create_if_block_1$1(ctx) {
    	let div;
    	let span0;
    	let t0;
    	let span1;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(/*autocompInvis*/ ctx[0]);
    			span1 = element("span");
    			t1 = text(/*autocompSugg*/ ctx[1]);
    			attr_dev(span0, "class", "invis svelte-1mon1qz");
    			add_location(span0, file$2, 72, 8, 2735);
    			attr_dev(span1, "class", "gray svelte-1mon1qz");
    			add_location(span1, file$2, 72, 50, 2777);
    			attr_dev(div, "class", "autocomp inputlike svelte-1mon1qz");
    			add_location(div, file$2, 71, 6, 2694);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(div, span1);
    			append_dev(span1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*autocompInvis*/ 1) set_data_dev(t0, /*autocompInvis*/ ctx[0]);
    			if (dirty & /*autocompSugg*/ 2) set_data_dev(t1, /*autocompSugg*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(71:4) {#if showAutcomp}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*contentEditableSupport*/ ctx[4]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "outer svelte-1mon1qz");
    			add_location(div, file$2, 68, 0, 2615);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if_block.p(ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AutoCompBox", slots, []);
    	let { getCompletions } = $$props;
    	let autocompInvis = "";
    	let autocompSugg = "";
    	let showAutcomp = false;
    	let queryBox;
    	const contentEditableSupport = "contentEditable" in document.documentElement;
    	const dispatch = createEventDispatcher();

    	function isCaretAtEndOfQueryBox() {
    		var _a;
    		const selection = window.getSelection();

    		if (selection && ((_a = selection === null || selection === void 0
    		? void 0
    		: selection.focusNode) === null || _a === void 0
    		? void 0
    		: _a.parentElement) === queryBox && selection.rangeCount === 1) {
    			const rng = selection.getRangeAt(0);
    			let pre_range = document.createRange();
    			pre_range.selectNodeContents(queryBox);
    			pre_range.setEnd(rng.startContainer, rng.startOffset);
    			const beforeCaret = pre_range.cloneContents().textContent;
    			return queryBox.textContent === beforeCaret;
    		}

    		return false;
    	}

    	const inputChanged = params => {
    		$$invalidate(2, showAutcomp = false);
    		$$invalidate(0, autocompInvis = "");

    		if (params.currentTarget instanceof HTMLInputElement) {
    			dispatch("input", params.currentTarget.value);
    			return;
    		}

    		const query = queryBox.textContent;
    		dispatch("input", query.trim());

    		if (isCaretAtEndOfQueryBox() && query.trim() && !(/^\s+$/).test(query.slice(-1))) {
    			//TODO unicode
    			const prefix = query.split(" ").slice(-1);

    			if (prefix && prefix[0]) {
    				getCompletions(prefix[0]).then(sugs => {
    					if (sugs && sugs.length) {
    						$$invalidate(2, showAutcomp = true);
    						$$invalidate(0, autocompInvis = query);
    						$$invalidate(1, autocompSugg = sugs[0].slice(prefix[0].length));
    					}
    				});
    			}
    		}
    	};

    	const keydown = e => {
    		var _a;

    		if (e.key === "ArrowRight" && autocompSugg) {
    			const sel = window === null || window === void 0
    			? void 0
    			: window.getSelection();

    			const rng = (_a = window === null || window === void 0
    			? void 0
    			: window.getSelection()) === null || _a === void 0
    			? void 0
    			: _a.getRangeAt(0);

    			if (rng && sel.anchorNode.parentElement === queryBox) {
    				let endTextNode = document.createTextNode(autocompSugg);
    				rng.collapse();

    				// const extracted = rng.extractContents();
    				rng.insertNode(endTextNode);

    				// rng.insertNode(extracted)
    				$$invalidate(2, showAutcomp = false);

    				// document.execCommand("insertHTML", false, autocompSugg);
    				$$invalidate(1, autocompSugg = "");
    			}
    		}

    		if (e.key === "Enter") {
    			e.preventDefault();
    		}
    	};

    	const writable_props = ["getCompletions"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AutoCompBox> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			queryBox = $$value;
    			$$invalidate(3, queryBox);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("getCompletions" in $$props) $$invalidate(7, getCompletions = $$props.getCompletions);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		getCompletions,
    		autocompInvis,
    		autocompSugg,
    		showAutcomp,
    		queryBox,
    		contentEditableSupport,
    		dispatch,
    		isCaretAtEndOfQueryBox,
    		inputChanged,
    		keydown
    	});

    	$$self.$inject_state = $$props => {
    		if ("getCompletions" in $$props) $$invalidate(7, getCompletions = $$props.getCompletions);
    		if ("autocompInvis" in $$props) $$invalidate(0, autocompInvis = $$props.autocompInvis);
    		if ("autocompSugg" in $$props) $$invalidate(1, autocompSugg = $$props.autocompSugg);
    		if ("showAutcomp" in $$props) $$invalidate(2, showAutcomp = $$props.showAutcomp);
    		if ("queryBox" in $$props) $$invalidate(3, queryBox = $$props.queryBox);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		autocompInvis,
    		autocompSugg,
    		showAutcomp,
    		queryBox,
    		contentEditableSupport,
    		inputChanged,
    		keydown,
    		getCompletions,
    		div_binding
    	];
    }

    class AutoCompBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { getCompletions: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AutoCompBox",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*getCompletions*/ ctx[7] === undefined && !("getCompletions" in props)) {
    			console.warn("<AutoCompBox> was created without expected prop 'getCompletions'");
    		}
    	}

    	get getCompletions() {
    		throw new Error("<AutoCompBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getCompletions(value) {
    		throw new Error("<AutoCompBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/SearchBar.svelte generated by Svelte v3.37.0 */

    const { console: console_1 } = globals;
    const file$1 = "src/SearchBar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (1:0) <script lang="ts">import { SearchProvider }
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script lang=\\\"ts\\\">import { SearchProvider }",
    		ctx
    	});

    	return block;
    }

    // (70:42)        {#if res}
    function create_then_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*res*/ ctx[14] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*res*/ ctx[14]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*searchResultsPromise*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(70:42)        {#if res}",
    		ctx
    	});

    	return block;
    }

    // (71:6) {#if res}
    function create_if_block_1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*res*/ ctx[14];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchResultsPromise, getWikiText, wikiLink*/ 7) {
    				each_value = /*res*/ ctx[14];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(71:6) {#if res}",
    		ctx
    	});

    	return block;
    }

    // (72:8) {#each res as item}
    function create_each_block(ctx) {
    	let wikiitem;
    	let current;

    	function click_handler() {
    		return /*click_handler*/ ctx[9](/*item*/ ctx[15]);
    	}

    	wikiitem = new WikiItem({
    			props: {
    				docId: /*item*/ ctx[15].docId,
    				title: /*item*/ ctx[15].title,
    				getText: /*getWikiText*/ ctx[0],
    				highlightTerms: /*item*/ ctx[15].terms
    			},
    			$$inline: true
    		});

    	wikiitem.$on("click", click_handler);

    	const block = {
    		c: function create() {
    			create_component(wikiitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(wikiitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const wikiitem_changes = {};
    			if (dirty & /*searchResultsPromise*/ 4) wikiitem_changes.docId = /*item*/ ctx[15].docId;
    			if (dirty & /*searchResultsPromise*/ 4) wikiitem_changes.title = /*item*/ ctx[15].title;
    			if (dirty & /*getWikiText*/ 1) wikiitem_changes.getText = /*getWikiText*/ ctx[0];
    			if (dirty & /*searchResultsPromise*/ 4) wikiitem_changes.highlightTerms = /*item*/ ctx[15].terms;
    			wikiitem.$set(wikiitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wikiitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wikiitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(wikiitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(72:8) {#each res as item}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script lang="ts">import { SearchProvider }
    function create_pending_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(1:0) <script lang=\\\"ts\\\">import { SearchProvider }",
    		ctx
    	});

    	return block;
    }

    // (92:2) {#if wikiLink}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let svg;
    	let path;
    	let t;
    	let iframe;
    	let iframe_src_value;
    	let div1_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t = space();
    			iframe = element("iframe");
    			attr_dev(path, "d", "M11.414 10l2.829-2.828a1 1 0 1 0-1.415-1.415L10 8.586 7.172 5.757a1 1 0 0 0-1.415 1.415L8.586 10l-2.829 2.828a1 1 0 0 0 1.415 1.415L10 11.414l2.828 2.829a1 1 0 0 0 1.415-1.415L11.414 10zM10 20C4.477 20 0 15.523 0 10S4.477 0 10 0s10 4.477 10 10-4.477 10-10 10z");
    			add_location(path, file$1, 101, 11, 3382);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "-2 -2 24 24");
    			attr_dev(svg, "width", "50");
    			attr_dev(svg, "height", "50");
    			attr_dev(svg, "preserveAspectRatio", "xMinYMin");
    			attr_dev(svg, "class", "icon__icon");
    			add_location(svg, file$1, 94, 8, 3176);
    			attr_dev(div0, "class", "wikiclose svelte-1lcjuew");
    			add_location(div0, file$1, 93, 6, 3111);
    			attr_dev(iframe, "title", "wikipedia");
    			if (iframe.src !== (iframe_src_value = /*wikiLink*/ ctx[1])) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "class", "svelte-1lcjuew");
    			add_location(iframe, file$1, 106, 6, 3711);
    			attr_dev(div1, "class", "wikiframe svelte-1lcjuew");
    			add_location(div1, file$1, 92, 4, 3035);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, svg);
    			append_dev(svg, path);
    			append_dev(div1, t);
    			append_dev(div1, iframe);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler_1*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*wikiLink*/ 2 && iframe.src !== (iframe_src_value = /*wikiLink*/ ctx[1])) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { delay: 0, duration: 200 }, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { delay: 0, duration: 200 }, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching && div1_transition) div1_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(92:2) {#if wikiLink}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let h3;
    	let t0;
    	let a;
    	let t2;
    	let t3;
    	let div0;
    	let autocompbox;
    	let t4;
    	let div1;
    	let input;
    	let t5;
    	let label;
    	let t7;
    	let div2;
    	let promise;
    	let t8;
    	let current;
    	let mounted;
    	let dispose;

    	autocompbox = new AutoCompBox({
    			props: {
    				getCompletions: /*getCompletions*/ ctx[4]
    			},
    			$$inline: true
    		});

    	autocompbox.$on("input", /*inputChanged*/ ctx[3]);

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 14,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*searchResultsPromise*/ ctx[2], info);
    	let if_block = /*wikiLink*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h3 = element("h3");
    			t0 = text("Type to search ");
    			a = element("a");
    			a.textContent = "Wikibooks Cookbook";
    			t2 = text(":");
    			t3 = space();
    			div0 = element("div");
    			create_component(autocompbox.$$.fragment);
    			t4 = space();
    			div1 = element("div");
    			input = element("input");
    			t5 = space();
    			label = element("label");
    			label.textContent = "Fetch summary after search";
    			t7 = space();
    			div2 = element("div");
    			info.block.c();
    			t8 = space();
    			if (if_block) if_block.c();
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", "https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents");
    			add_location(a, file$1, 58, 21, 1952);
    			add_location(h3, file$1, 58, 2, 1933);
    			attr_dev(div0, "class", "search-box svelte-1lcjuew");
    			add_location(div0, file$1, 59, 2, 2066);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "gwt");
    			attr_dev(input, "class", "svelte-1lcjuew");
    			add_location(input, file$1, 64, 4, 2192);
    			attr_dev(label, "for", "gwt");
    			attr_dev(label, "class", "svelte-1lcjuew");
    			add_location(label, file$1, 65, 4, 2258);
    			attr_dev(div1, "class", "gwt-check svelte-1lcjuew");
    			add_location(div1, file$1, 63, 2, 2164);
    			attr_dev(div2, "class", "results svelte-1lcjuew");
    			add_location(div2, file$1, 68, 2, 2324);
    			attr_dev(div3, "class", "grab-search");
    			add_location(div3, file$1, 57, 0, 1905);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h3);
    			append_dev(h3, t0);
    			append_dev(h3, a);
    			append_dev(h3, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div0);
    			mount_component(autocompbox, div0, null);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			append_dev(div1, input);
    			input.checked = /*getWikiText*/ ctx[0];
    			append_dev(div1, t5);
    			append_dev(div1, label);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			info.block.m(div2, info.anchor = null);
    			info.mount = () => div2;
    			info.anchor = null;
    			append_dev(div3, t8);
    			if (if_block) if_block.m(div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*getWikiText*/ 1) {
    				input.checked = /*getWikiText*/ ctx[0];
    			}

    			info.ctx = ctx;

    			if (dirty & /*searchResultsPromise*/ 4 && promise !== (promise = /*searchResultsPromise*/ ctx[2]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[14] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}

    			if (/*wikiLink*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*wikiLink*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div3, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(autocompbox.$$.fragment, local);
    			transition_in(info.block);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(autocompbox.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(autocompbox);
    			info.block.d();
    			info.token = null;
    			info = null;
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const VERSION = "0.1.0";

    function devMessage(msg) {
    	console.log(`%c ${msg}`, "color: green");
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SearchBar", slots, []);
    	
    	const fuzzypath = "https://jamstack-search-demo.b-cdn.net/fuzzy";
    	const fuzzymain = "https://jamstack-search-demo.b-cdn.net/vocab_frequent.json";
    	const index = "https://jamstack-search-demo.b-cdn.net/search";
    	let getWikiText = true;
    	let nQueries = 0;
    	let wikiLink = "";
    	const searchProvider = new SearchProvider(index, fuzzymain, fuzzypath, VERSION);
    	let searchResultsPromise = Promise.resolve(undefined);
    	devMessage("404 Not Found errors are expected...");
    	let queryString = "";

    	const inputChanged = e => {
    		const qs = e.detail;
    		nQueries += 1;
    		queryString = qs;
    		const nQueriesThen = nQueries;

    		$$invalidate(2, searchResultsPromise = searchProvider.doSearch(qs).then(res => {
    			setTimeout(
    				() => {
    					if (nQueries == nQueriesThen) {
    						const firstResult = document.querySelector(".results > *");

    						if (firstResult) {
    							firstResult.scrollIntoView({ block: "nearest", behavior: "smooth" });
    						}
    					}
    				},
    				100
    			);

    			// setTimeout(() => {
    			//   if (nQueries == nQueriesThen && qs) {
    			//     devMessage(`Possibly send an analytics event for query "${qs}"`);
    			//   }
    			// }, 1000);
    			return res;
    		}));
    	};

    	function getCompletions(s) {
    		return searchProvider.getCompletionsForPrefix(s).then(r => r.map(x => x.word));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<SearchBar> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		getWikiText = this.checked;
    		$$invalidate(0, getWikiText);
    	}

    	const click_handler = item => {
    		// devMessage(
    		//   `Possibly send an analytics event: clicked "${item.title}" for query "${queryString}"`
    		// );
    		$$invalidate(1, wikiLink = `https://en.wikibooks.org/wiki/Cookbook:${item.title}`);
    	};

    	const click_handler_1 = () => $$invalidate(1, wikiLink = "");

    	$$self.$capture_state = () => ({
    		SearchProvider,
    		fade,
    		WikiItem,
    		AutoCompBox,
    		fuzzypath,
    		fuzzymain,
    		index,
    		VERSION,
    		getWikiText,
    		nQueries,
    		wikiLink,
    		searchProvider,
    		searchResultsPromise,
    		devMessage,
    		queryString,
    		inputChanged,
    		getCompletions
    	});

    	$$self.$inject_state = $$props => {
    		if ("getWikiText" in $$props) $$invalidate(0, getWikiText = $$props.getWikiText);
    		if ("nQueries" in $$props) nQueries = $$props.nQueries;
    		if ("wikiLink" in $$props) $$invalidate(1, wikiLink = $$props.wikiLink);
    		if ("searchResultsPromise" in $$props) $$invalidate(2, searchResultsPromise = $$props.searchResultsPromise);
    		if ("queryString" in $$props) queryString = $$props.queryString;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		getWikiText,
    		wikiLink,
    		searchResultsPromise,
    		inputChanged,
    		getCompletions,
    		fuzzypath,
    		fuzzymain,
    		index,
    		input_change_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class SearchBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { fuzzypath: 5, fuzzymain: 6, index: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SearchBar",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get fuzzypath() {
    		return this.$$.ctx[5];
    	}

    	set fuzzypath(value) {
    		throw new Error("<SearchBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fuzzymain() {
    		return this.$$.ctx[6];
    	}

    	set fuzzymain(value) {
    		throw new Error("<SearchBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		return this.$$.ctx[7];
    	}

    	set index(value) {
    		throw new Error("<SearchBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var introText = {"html":"<h1 id=\"plasticsearched\">PlasticSearched</h1>\n<p><img src=\"./plastic.svg\" alt=\"plastic logo\" /></p>\n<h4 id=\"shrink-wrapped-elasticsearch-results\">Shrink wrapped ElasticSearch* results</h4>\n<h5 id=\"-im-not-associated-with-elasticsearch-in-any-way\">* I'm not associated with ElasticSearch in any way</h5>\n<h2 id=\"in-short\">In Short</h2>\n<p>A side project: pre-computed ElasticSearch results were put in CDN and are joined in client - No backend. You can try searching Wikibook's Cookbook at the bottom of this page.</p>\n<p>Code is <a href=\"https://github.com/asafamr/PlasticSearched\">here</a>, Feel free to use it as you would like. If you need help, just open an issue or contact me: asaf.amrami at gmail</p>\n<ul>\n<li>Image by <a href=\"https://www.flaticon.com/authors/monkik\">monkik</a></li>\n<li>The code uses <a href=\"https://github.com/farzher/fuzzysort\">fuzzysort</a> for fuzzy matching into terms.</li>\n</ul>\n<h2 id=\"benefits\">Benefits:</h2>\n<ul>\n<li>Fast: Globally fast when deployed to CDN</li>\n<li>Private: Index and queries remain private when served manually (w/ auth.)</li>\n<li>Easy to operate: Just serve static content</li>\n<li>Cheap: Only pay for storage and bandwidth</li>\n<li>Robust: test during compilation and deploy for years. JavaScript is undegradable.</li>\n</ul>\n<h2 id=\"usecases\">Usecases:</h2>\n<ul>\n<li>JAMStack blogs</li>\n<li>Technical Documentations</li>\n<li>IoT / Embedded Web Interfaces</li>\n</ul>","metadata":{},"filename":"text.md","path":"/home/asaf/ws/plasticfind/src/text.md"};

    /* src/App.svelte generated by Svelte v3.37.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let a;
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let style;
    	let t1;
    	let div;
    	let raw_value = introText.html + "";
    	let t2;
    	let searchbar;
    	let current;
    	searchbar = new SearchBar({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			a = element("a");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			style = element("style");
    			style.textContent = ".github-corner:hover .octo-arm{animation:octocat-wave 560ms ease-in-out}@keyframes octocat-wave{0%,100%{transform:rotate(0)}20%,60%{transform:rotate(-25deg)}40%,80%{transform:rotate(10deg)}}@media (max-width:500px){.github-corner:hover .octo-arm{animation:none}.github-corner .octo-arm{animation:octocat-wave 560ms ease-in-out}}";
    			t1 = space();
    			div = element("div");
    			t2 = space();
    			create_component(searchbar.$$.fragment);
    			attr_dev(path0, "d", "M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z");
    			add_location(path0, file, 5, 276, 391);
    			attr_dev(path1, "d", "M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2");
    			attr_dev(path1, "fill", "currentColor");
    			set_style(path1, "transform-origin", "130px 106px");
    			attr_dev(path1, "class", "octo-arm");
    			add_location(path1, file, 5, 343, 458);
    			attr_dev(path2, "d", "M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z");
    			attr_dev(path2, "fill", "currentColor");
    			attr_dev(path2, "class", "octo-body");
    			add_location(path2, file, 5, 621, 736);
    			attr_dev(svg, "width", "80");
    			attr_dev(svg, "height", "80");
    			attr_dev(svg, "viewBox", "0 0 250 250");
    			set_style(svg, "fill", "#151513");
    			set_style(svg, "color", "rgb(255, 216, 0)");
    			set_style(svg, "position", "absolute");
    			set_style(svg, "top", "0");
    			set_style(svg, "border", "0");
    			set_style(svg, "right", "0");
    			attr_dev(svg, "aria-hidden", "true");
    			add_location(svg, file, 5, 112, 227);
    			attr_dev(a, "href", "https://github.com/asafamr/PlasticSearched");
    			attr_dev(a, "class", "github-corner");
    			attr_dev(a, "aria-label", "View source on GitHub");
    			add_location(a, file, 5, 2, 117);
    			add_location(style, file, 5, 1218, 1333);
    			attr_dev(div, "class", "intro");
    			add_location(div, file, 6, 2, 1679);
    			attr_dev(main, "class", "svelte-2k4i1s");
    			add_location(main, file, 4, 0, 108);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, a);
    			append_dev(a, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			append_dev(main, style);
    			append_dev(main, t1);
    			append_dev(main, div);
    			div.innerHTML = raw_value;
    			append_dev(main, t2);
    			mount_component(searchbar, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(searchbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(searchbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(searchbar);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ SearchBar, introText });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
        target: document.body,
        props: {}
    });

    return app;

}());
