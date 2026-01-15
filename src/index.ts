import { APromise } from "./promiseAPlus.js";

const a = new APromise((res, rej) => {
    console.log("init promise");
    setTimeout(() => {
        console.log("resolve after 2000ms");
        res(1);
        console.log("promise a is", a);
        rej(2);
        console.log("promise a is", a);
    }, 2000);
});
console.log("promise a is", a);

const b = a.then((v) => {
    console.log("promise a fulfilled with", v);
    console.log("promise b is", b);
}, (r) => {
    console.log("promise a rejected with", r);
    console.log("promise b is", b);
});

console.log("promise b is", b);

setTimeout(() => {
    console.log("promise b is", b);
}, 3000);
