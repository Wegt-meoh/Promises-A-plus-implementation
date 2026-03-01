import assert from "node:assert";
import { APromise } from "./promiseAPlus.js";

const sential = { hello: "sdfdsf" };

const a = new APromise((res) => {
    res({ then: (resolvePromise: (x: unknown) => void, rejectPromise: (r: unknown) => void) => {
        resolvePromise(sential);
        rejectPromise(sential);
    } });
});

a.then((value) => {
    assert.strictEqual(value, sential);
    console.log("succ");
});
