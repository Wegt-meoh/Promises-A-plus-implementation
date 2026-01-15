import util from "util";

type State = "pending" | "fulfilled" | "rejected";
type AnyFunction = (...args: unknown[]) => unknown;

export class APromise {
    state: State;
    #onFulfilledList: Array<AnyFunction>;
    #onRejectedList: Array<AnyFunction>;
    #hasCalled;
    #value?: unknown;
    #reason?: unknown;

    [util.inspect.custom]() {
        return { state: this.state }; // Only show state in Node console
    }

    constructor(init: (resolve: typeof this.resolve, reject: typeof this.reject) => void) {
        this.state = "pending";
        this.#hasCalled = false;
        this.#onFulfilledList = [];
        this.#onRejectedList = [];

        try {
            console.log("call init");
            init.call(this, this.resolve, this.reject);
        }
        catch (error) {
            this.reject(error);
        }
        return this;
    }

    onFulfilled = (value?: unknown) => {
        if (this.state !== "pending") return;
        this.state = "fulfilled";
        this.#value = value;
        for (const item of this.#onFulfilledList) {
            item.call(undefined, this.#value);
        }
    };

    onRejected = (reason?: unknown) => {
        if (this.state !== "pending") return;
        this.state = "rejected";
        this.#reason = reason;
        for (const item of this.#onRejectedList) {
            item.call(undefined, this.#reason);
        }
    };

    resolve = (x: unknown) => {
        console.log("call resolve with value", x);
        if (x === this) {
            this.reject(new TypeError("can not resolve promise itself"));
            return;
        }

        if (x instanceof APromise) {
            if (x.state === "fulfilled") {
                this.onFulfilled(x.#value);
            }

            if (x.state === "rejected") {
                this.onRejected(x.#reason);
            }

            if (x.state === "pending") {
                x.then(
                    (value: unknown) => { this.resolve(value); },
                    (reason: unknown) => { this.reject(reason); },
                );
            }
            return;
        }

        if (x instanceof Function || x instanceof Object) {
            try {
                this.then = (x as APromise).then;
                if (this.then instanceof Function) {
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
        console.log("call reject with reason", x);
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

    then = (onFulfilled: AnyFunction, onRejected: AnyFunction) => {
        console.log("call then");
        if (onFulfilled instanceof Function) {
            this.#onFulfilledList.push(onFulfilled);
        }

        if (onRejected instanceof Function) {
            this.#onRejectedList.push(onRejected);
        }

        const promise = new APromise((resolve, reject) => {
            this.#onFulfilledList.push(() => {
                resolve(this.#value);
            });
            this.#onRejectedList.push(() => {
                reject(this.#reason);
            });
        });

        return promise;
    };
}
