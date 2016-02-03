"use es6";

import 'jquery';
import Bit from './bit';

import './css/whatever.css';

console.log("__filename", __filename);

class FooBar {
  constructor() {
    console.log('Created FooBar');
  }

  deferIt(func) {
    setTimeout(func, 100);
  }
}

const fooBar = new FooBar();
fooBar.deferIt(() => {
  console.log("It works.");
  console.log("Bit class", Bit);
});

