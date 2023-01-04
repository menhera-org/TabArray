#!/bin/sh

for path in ./docs/addons.mozilla.org/*.md ; do
  node ./script/markdown.js "$path"
done

for path in ./docs/releases/*.md ; do
  node ./script/markdown.js "$path"
done
