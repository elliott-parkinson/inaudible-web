#!/bin/sh
set -e

if [ -d .git ]; then
  git pull --rebase
fi

npm run build
npm run preview
