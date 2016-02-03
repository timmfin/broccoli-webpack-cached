import 'jquery';
import Bit from './bit';

import './css/whatever2.css';

console.log("__filename", __filename);

class FooBar2 {
  constructor() {
    console.log('Created FooBar2');
  }

  deferIt(func) {
    setTimeout(func, 100);
  }
}

const fooBar2 = new FooBar2();
fooBar2.deferIt(() => console.log("It works 2."));
