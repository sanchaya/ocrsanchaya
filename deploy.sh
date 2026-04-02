#!/bin/bash

set -e

echo "Deploying to GitHub Pages..."

cd ocr-kannada/dist

git init
git checkout -b gh-pages 2>/dev/null || git checkout -b gh-pages
git add -A
git commit -m "Deploy to GitHub Pages"

git remote add origin https://github.com/sanchaya/ocrsanchaya.git 2>/dev/null || true
git push origin gh-pages --force

cd ../..
rm -rf ocr-kannada/dist/.git

echo "Done! Configure your custom domain ocr.sanchaya.net in GitHub settings to point to gh-pages branch."