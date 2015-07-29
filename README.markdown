
Yet another webpack plugin for Broccoli. This one relies on webpack's caching, but does it in a way that works well as a broccoli plugin (letting webpack write to the cache folder and then sym-linking from that to the final output folder as needed).


This means it should be fast _and_ compatible with other Broccoli plugins (unlike [myfreeweb/broccoli-webpack](https://github.com/myfreeweb/broccoli-webpack) and [rafales/broccoli-webpack-fast](https://github.com/rafales/broccoli-webpack-fast))
