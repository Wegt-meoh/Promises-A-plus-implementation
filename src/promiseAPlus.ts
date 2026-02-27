import util from "util";

type State = "pending" | "fulfilled" | "rejected";
type AnyFunction = (...args: unknown[]) => unknown;

export class APromise {
    #state: State;
    #onFulfilledList: Array<AnyFunction>;
    #onRejectedList: Array<AnyFunction>;
    #hasCalled;
    #value?: unknown;
    #reason?: unknown;

    [util.inspect.custom]() {
        if (this.#state === "pending") {
            return `Promise{ <${this.#state}> }`;
        }
        else if (this.#state === "rejected") {
            return `Promise{ ${this.#reason} }`;
        }
        else {
            return `Promise{ ${this.#value} }`;
        }
    }

    constructor(init: (resolve: typeof this.resolve, reject: typeof this.reject) => void) {
        this.#state = "pending";
        this.#hasCalled = false;
        this.#onFulfilledList = [];
        this.#onRejectedList = [];

        try {
            init.call(this, this.resolve, this.reject);
        }
        catch (error) {
            this.reject(error);
        }
    }

    onFulfilled = (value?: unknown) => {
        if (this.#state !== "pending") return;
        this.#state = "fulfilled";
        this.#value = value;
        this.#onFulfilledList.forEach(fn => fn());
    };

    onRejected = (reason?: unknown) => {
        if (this.#state !== "pending") return;
        this.#state = "rejected";
        this.#reason = reason;
        this.#onRejectedList.forEach(fn => fn());
    };

    resolve = (x: unknown) => {
        if (x === this) {
            this.reject(new TypeError("can not resolve promise itself"));
            return;
        }

        if (x instanceof APromise) {
            if (x.#state === "fulfilled") {
                this.onFulfilled(x.#value);
            }

            if (x.#state === "rejected") {
                this.onRejected(x.#reason);
            }

            if (x.#state === "pending") {
                x.then(
                    (value: unknown) => { this.resolve(value); },
                    (reason: unknown) => { this.reject(reason); },
                );
            }
            return;
        }

        if (typeof x === "function" || typeof x === "object") {
            try {
                const retrivedThen = (x as APromise).then;
                if (typeof retrivedThen === "function") {
                    try {
                        this.then.call(x, this.resolvePromise, this.rejectPromise);
                    }
                    catch (e) {
                        if (!this.#hasCalled) {
                            this.reject(e);
                        }
                    }
                }
                else {
                    this.onFulfilled(x);
                }
            }
            catch (error) {
                this.reject(error);
            }

            return;
        }

        this.onFulfilled(x);
    };

    reject = (x: unknown) => {
        this.onRejected(x);
    };

    resolvePromise = (y: unknown) => {
        if (this.#hasCalled) return;
        this.#hasCalled = true;
        this.resolve(y);
    };

    rejectPromise = (r: unknown) => {
        if (this.#hasCalled) return;
        this.#hasCalled = true;
        this.reject(r);
    };

    then = (onFulfilled?: (value: unknown) => void | null, onRejected?: (value: unknown) => void | null) => {
        const promise = new APromise((resolve, reject) => {
            if (this.#state === "fulfilled") {
                setTimeout(() => {
                    if (typeof onFulfilled === "function") {
                        try {
                            const x = onFulfilled(this.#value);
                            resolve(x);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                    else {
                        resolve(this.#value);
                    }
                });
            }
            if (this.#state === "rejected") {
                setTimeout(() => {
                    if (typeof onRejected === "function") {
                        try {
                            const x = onRejected(this.#reason);
                            resolve(x);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                    else {
                        reject(this.#reason);
                    }
                });
            }
            if (this.#state === "pending") {
                this.#onFulfilledList.push(() => {
                    setTimeout(() => {
                        if (typeof onFulfilled === "function") {
                            try {
                                const x = onFulfilled(this.#value);
                                resolve(x);
                            }
                            catch (e) {
                                reject(e);
                            }
                        }
                        else {
                            resolve(this.#value);
                        }
                    });
                });
                this.#onRejectedList.push(() => {
                    setTimeout(() => {
                        if (typeof onRejected === "function") {
                            try {
                                const x = onRejected(this.#reason);
                                resolve(x);
                            }
                            catch (e) {
                                reject(e);
                            }
                        }
                        else {
                            resolve(this.#reason);
                        }
                    });
                });
            }
        });

        return promise;
    };
}
